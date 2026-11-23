import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  KategoriStatusEnum,
  PenugasanEnum,
  RoleEnum,
  SpLevelEnum,
} from '@prisma/client';
import { SuratPeringatanService } from './surat-peringatan.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { PejabatService } from '../irban/pejabat.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { SpDueEngineService } from './sp-due.service';
import fs from 'fs';
import { SpPdfGeneratorService } from './sp-pdf.service';
import { TteClient, TteGatewayError } from '../external/tte/tte.client';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('SuratPeringatanService', () => {
  let service: SuratPeringatanService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;

  const adminIrban1: AuthenticatedUser = {
    id: 'user-irban1',
    egov_user_id: 'egov-1',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-1',
    nama: 'Admin Irban I',
    nip: '19800101',
  };

  const adminIrban2: AuthenticatedUser = {
    id: 'user-irban2',
    egov_user_id: 'egov-2',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-2',
    nama: 'Admin Irban II',
    nip: '19800202',
  };

  const bupatiUser: AuthenticatedUser = {
    id: 'user-bupati',
    egov_user_id: 'egov-bupati',
    role: RoleEnum.BUPATI,
    nama: 'Bupati Konawe Selatan',
    nip: '19700101',
  };

  interface MockPrisma {
    lhp: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    suratPeringatan: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    suratPeringatanItem: {
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
    rekomendasi: {
      findMany: jest.Mock;
    };
    suratTemplate: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  }

  const mockPrisma: MockPrisma = {
    lhp: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    suratPeringatan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    suratPeringatanItem: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    rekomendasi: {
      findMany: jest.fn(),
    },
    suratTemplate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: MockPrisma) => unknown) =>
      callback(mockPrisma),
    ),
  };

  const mockPejabatService = {
    resolveRecipient: jest.fn(),
    findById: jest.fn(),
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockFilesService = {
    getUploadsRoot: jest.fn().mockReturnValue('/tmp/sipatuh_test_uploads'),
  };

  const mockSpDueEngine = {
    calculateAgeInDays: jest.fn(),
  };

  const mockPdfGenerator = {
    generateDraftPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.3 mock')),
  };

  const mockTteClient = {
    signPdf: jest.fn(),
    getStatus: jest.fn(),
    downloadDocument: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuratPeringatanService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PejabatService, useValue: mockPejabatService },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: AuditService, useValue: mockAuditService },
        { provide: FilesService, useValue: mockFilesService },
        { provide: SpDueEngineService, useValue: mockSpDueEngine },
        { provide: SpPdfGeneratorService, useValue: mockPdfGenerator },
        { provide: TteClient, useValue: mockTteClient },
      ],
    }).compile();

    service = module.get<SuratPeringatanService>(SuratPeringatanService);
    prisma = module.get<PrismaService>(PrismaService);
    irbanScopeService = module.get<IrbanScopeService>(IrbanScopeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(irbanScopeService).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      lhp_id: 'lhp-1',
      level: SpLevelEnum.SP1,
      nomor_surat: '700/01/SP1/2026',
      tanggal_surat: '2026-09-27',
    };

    const mockLhpOpen = {
      id: 'lhp-1',
      nomor_lhp: 'LHP/01/2026',
      irban_id: 'irban-1',
      simpeg_unit_kerja_id: 'unit-dinsos',
      tanggal_lhp: new Date('2026-08-01'),
      tanggal_diterima_lhp: new Date('2026-08-01'),
      closed_at: null,
      surat_peringatans: [],
    };

    const mockOutstandingRekomendasi = [
      {
        id: 'rek-1',
        nomor_urut: 1,
        uraian: 'Setor ke kas daerah',
        nilai_rekomendasi: 10000000,
        temuan: {
          id: 'tem-1',
          nomor_urut: 1,
          judul: 'Kelebihan bayar',
        },
        status_rekomendasi: {
          id: 'status-belum',
          nama: 'Belum Sesuai',
          kategori: KategoriStatusEnum.BELUM_SELESAI,
        },
      },
    ];

    it('should create SP1 successfully with snapshot and draft PDF', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(mockLhpOpen);
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(null); // nomor_surat not taken
      mockSpDueEngine.calculateAgeInDays.mockReturnValueOnce(35); // age 35 >= 30
      mockPejabatService.resolveRecipient.mockResolvedValueOnce({
        primary_candidate: {
          nip: '19700101',
          nama: 'Kadis Sosial',
          jabatan: 'Kepala Dinas Sosial',
          jenis_penugasan: PenugasanEnum.DEFINITIF,
        },
      });
      mockPrisma.rekomendasi.findMany.mockResolvedValueOnce(
        mockOutstandingRekomendasi,
      );
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        unit_kerja: 'Dinas Sosial',
      });
      mockPrisma.suratTemplate.findFirst.mockResolvedValueOnce({
        id: 'tpl-1',
        versi: 1,
        konten_html: '<p>Konten</p>',
      });

      const mockCreated = {
        id: 'sp-1',
        lhp_id: 'lhp-1',
        level: SpLevelEnum.SP1,
        nomor_surat: '700/01/SP1/2026',
        tanggal_surat: new Date('2026-09-27'),
        recipient_nip: '19700101',
        recipient_nama: 'Kadis Sosial',
        recipient_jabatan: 'Kepala Dinas Sosial',
        template_version: 1,
        draft_path: 'surat-peringatan/draft/mock.pdf',
        items: [
          {
            id: 'item-1',
            surat_peringatan_id: 'sp-1',
            rekomendasi_id: 'rek-1',
            uraian_snapshot:
              '[Temuan #1] Kelebihan bayar - [Rekomendasi #1] Setor ke kas daerah',
            nilai_rekomendasi_snapshot: 10000000,
          },
        ],
      };

      mockPrisma.suratPeringatan.create.mockResolvedValueOnce(mockCreated);
      mockPrisma.suratPeringatanItem.createMany.mockResolvedValueOnce({
        count: 1,
      });
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockCreated);

      const result = await service.create(validDto, adminIrban1);

      expect(result).toBeDefined();
      expect(result.level).toBe(SpLevelEnum.SP1);
      expect(result.recipient_nama).toBe('Kadis Sosial');
      expect(result.items.length).toBe(1);
      expect(mockPdfGenerator.generateDraftPdf).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_SURAT_PERINGATAN',
          entity: 'SuratPeringatan',
        }),
      );
    });

    it('should reject if Admin Irban tries to create SP for another Irbans LHP (Cross-Irban 403)', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(mockLhpOpen); // irban-1

      await expect(service.create(validDto, adminIrban2)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if Bupati tries to create SP (Read-only 403)', async () => {
      await expect(service.create(validDto, bupatiUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject if LHP is already closed', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        ...mockLhpOpen,
        closed_at: new Date('2026-09-01'),
      });

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate level for same LHP (1 level per LHP enforced)', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        ...mockLhpOpen,
        surat_peringatans: [
          { level: SpLevelEnum.SP1, nomor_surat: 'SP1/EXISTING' },
        ],
      });

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject duplicate nomor_surat across system', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(mockLhpOpen);
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        id: 'sp-other',
        nomor_surat: '700/01/SP1/2026',
      });

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject SP2 if SP1 has not been issued yet', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        ...mockLhpOpen,
        surat_peringatans: [], // No SP1
      });
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...validDto, level: SpLevelEnum.SP2 }, adminIrban1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject SP3 if SP2 has not been issued yet', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        ...mockLhpOpen,
        surat_peringatans: [{ level: SpLevelEnum.SP1, nomor_surat: 'SP1/OK' }], // SP1 exists but no SP2
      });
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...validDto, level: SpLevelEnum.SP3 }, adminIrban1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if LHP age is below required minimum threshold', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(mockLhpOpen);
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(null);
      mockSpDueEngine.calculateAgeInDays.mockReturnValueOnce(25); // age 25 < 30 for SP1

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if no outstanding (BELUM_SELESAI) recommendations exist', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(mockLhpOpen);
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(null);
      mockSpDueEngine.calculateAgeInDays.mockReturnValueOnce(35);
      mockPejabatService.resolveRecipient.mockResolvedValueOnce({
        primary_candidate: null,
      });
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        unit_kerja: 'Dinas Sosial',
      });
      mockPrisma.rekomendasi.findMany.mockResolvedValueOnce([]); // 0 outstanding!

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('immutability of signed letters', () => {
    const mockSignedSp = {
      id: 'sp-signed-1',
      nomor_surat: '700/01/SP1/2026',
      level: SpLevelEnum.SP1,
      signed_at: new Date('2026-09-25'),
      signed_path: 'surat-peringatan/signed/signed.pdf',
      lhp: { irban_id: 'irban-1' },
      items: [],
    };

    it('should reject regenerateDraft if surat is already signed', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockSignedSp);

      await expect(
        service.regenerateDraft('sp-signed-1', adminIrban1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update if surat is already signed', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockSignedSp);

      await expect(
        service.update('sp-signed-1', { nomor_surat: 'NEW' }, adminIrban1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject delete if surat is already signed', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockSignedSp);

      await expect(service.delete('sp-signed-1', adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('signTte', () => {
    const mockDraftSp = {
      id: 'sp-draft-1',
      nomor_surat: '700/01/SP1/2026',
      level: SpLevelEnum.SP1,
      simpeg_unit_kerja_id: 'unit-dinsos',
      draft_path: 'surat-peringatan/draft/draft.pdf',
      signed_at: null,
      signed_path: null,
      tte_idempotency_key: null,
      tte_request_id: null,
      tte_status: null,
      tte_error_code: null,
      tte_attempted_at: null,
      lhp: { irban_id: 'irban-1' },
      items: [],
    };

    const signDto = {
      nik: '7405010101900001',
      passphrase: 'securepassphrase',
    };

    const signedPdf = Buffer.from('%PDF-1.4 signed test by BSrE');

    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(Buffer.from('%PDF-1.4 draft'));
      jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
      jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      mockPrisma.suratPeringatan.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.suratPeringatan.update.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...mockDraftSp, ...args.data }),
      );
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValue({
        unit_kerja: 'Dinas Sosial',
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
      mockTteClient.signPdf.mockReset();
      mockTteClient.getStatus.mockReset();
      mockTteClient.downloadDocument.mockReset();
      mockPrisma.suratPeringatan.update.mockReset();
      mockPrisma.suratPeringatan.updateMany.mockReset();
    });

    const lastUpdateData = () =>
      (
        mockPrisma.suratPeringatan.update.mock.calls.at(-1) as [
          { data: Record<string, unknown> },
        ]
      )[0].data;

    it('claims the operation with an Idempotency-Key before calling the gateway, then stores the result', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockDraftSp);
      mockTteClient.signPdf.mockResolvedValueOnce({
        requestId: 'req-ok',
        filename: 'hasil.pdf',
        signedPdfBuffer: signedPdf,
      });

      const res = await service.signTte('sp-draft-1', signDto, adminIrban1);

      expect(res.status).toBe('SIGNED');
      const claim = (
        mockPrisma.suratPeringatan.updateMany.mock.calls[0] as [
          { data: Record<string, unknown> },
        ]
      )[0];
      expect(claim.data.tte_status).toBe('sending');
      const key = claim.data.tte_idempotency_key as string;
      expect(key).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);

      expect(mockTteClient.signPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          nik: '7405010101900001',
          passphrase: 'securepassphrase',
          idempotencyKey: key,
        }),
      );
      expect(
        mockPrisma.suratPeringatan.updateMany.mock.invocationCallOrder[0],
      ).toBeLessThan(mockTteClient.signPdf.mock.invocationCallOrder[0]);

      expect(lastUpdateData()).toEqual(
        expect.objectContaining({
          tte_status: 'succeeded',
          tte_request_id: 'req-ok',
          signed_by: adminIrban1.id,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TTE_SIGN_SUCCESS' }),
      );
    });

    it('should reject signTte if surat is already signed', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        ...mockDraftSp,
        signed_at: new Date(),
      });

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban1),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject signTte if Admin Irban is from different Irban', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockDraftSp);

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when another request already holds the signing claim', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockDraftSp);
      mockPrisma.suratPeringatan.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban1),
      ).rejects.toThrow(ConflictException);
      expect(mockTteClient.signPdf).not.toHaveBeenCalled();
    });

    it('maps a rejected passphrase to 422, marks failed and drops the key', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockDraftSp);
      mockTteClient.signPdf.mockRejectedValueOnce(
        new TteGatewayError('Passphrase penandatangan tidak valid.', 422, {
          code: 'signer_passphrase_invalid',
          requestId: 'req-fail',
          txStatus: 'failed',
          retrySigning: false,
        }),
      );

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban1),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(lastUpdateData()).toEqual(
        expect.objectContaining({
          tte_status: 'failed',
          tte_idempotency_key: null,
          tte_error_code: 'signer_passphrase_invalid',
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TTE_SIGN_FAILED' }),
      );
    });

    it('keeps the key as unknown on timeout and reuses it on the next attempt', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce(mockDraftSp);
      mockTteClient.signPdf.mockRejectedValueOnce(
        new TteGatewayError('Gateway TTE tidak merespons', null),
      );

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban1),
      ).rejects.toThrow(GatewayTimeoutException);

      const failure = lastUpdateData();
      expect(failure.tte_status).toBe('unknown');
      const key = failure.tte_idempotency_key as string;
      expect(key).toBeTruthy();

      // Percobaan berikutnya: key yang sama, tanpa key baru.
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        ...mockDraftSp,
        tte_status: 'unknown',
        tte_idempotency_key: key,
      });
      mockTteClient.signPdf.mockResolvedValueOnce({
        requestId: 'req-retry',
        filename: null,
        signedPdfBuffer: signedPdf,
      });

      await service.signTte('sp-draft-1', signDto, adminIrban1);

      expect(mockTteClient.signPdf).toHaveBeenLastCalledWith(
        expect.objectContaining({ idempotencyKey: key }),
      );
    });

    it('resumes a succeeded transaction by downloading instead of signing again', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        ...mockDraftSp,
        tte_status: 'unknown',
        tte_request_id: 'req-prev',
        tte_idempotency_key: 'key-prev-12345',
      });
      mockTteClient.getStatus.mockResolvedValueOnce({
        id: 'req-prev',
        status: 'succeeded',
      });
      mockTteClient.downloadDocument.mockResolvedValueOnce(signedPdf);

      const res = await service.signTte('sp-draft-1', signDto, adminIrban1);

      expect(res.status).toBe('SIGNED');
      expect(mockTteClient.signPdf).not.toHaveBeenCalled();
      expect(mockTteClient.downloadDocument).toHaveBeenCalledWith('req-prev');
    });

    it('does not sign again while the gateway still reports sending', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        ...mockDraftSp,
        tte_status: 'sending',
        tte_request_id: 'req-busy',
      });
      mockTteClient.getStatus.mockResolvedValueOnce({
        id: 'req-busy',
        status: 'sending',
      });

      await expect(
        service.signTte('sp-draft-1', signDto, adminIrban1),
      ).rejects.toThrow(ConflictException);
      expect(mockTteClient.signPdf).not.toHaveBeenCalled();
    });

    it('blocks draft regeneration while a TTE transaction is pending', async () => {
      mockPrisma.suratPeringatan.findUnique.mockResolvedValueOnce({
        ...mockDraftSp,
        tte_status: 'unknown',
        items: [],
        lhp: { irban_id: 'irban-1' },
      });

      await expect(
        service.regenerateDraft('sp-draft-1', adminIrban1),
      ).rejects.toThrow(ConflictException);
    });
  });
});
