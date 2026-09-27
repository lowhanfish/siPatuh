import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { SpPdfGeneratorService } from './sp-pdf.service';
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
});
