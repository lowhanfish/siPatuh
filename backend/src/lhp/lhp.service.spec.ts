import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { LhpService } from './lhp.service';
import { PrismaService } from '../prisma/prisma.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('LhpService', () => {
  let service: LhpService;
  let prisma: PrismaService;
  let simpegAdapter: SimpegAdapter;
  let irbanScopeService: IrbanScopeService;
  let filesService: FilesService;
  let auditService: AuditService;

  const mockPrisma = {
    irbanUnitKerja: {
      findUnique: jest.fn(),
    },
    jenisPemeriksaan: {
      findUnique: jest.fn(),
    },
    lhp: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attachment: {
      findFirst: jest.fn(),
    },
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest.fn(),
    findUnitKerjaInduk: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockFilesService = {
    saveUploadedFile: jest.fn(),
    resolveSecurePath: jest.fn(),
  };

  const adminIrban1: AuthenticatedUser = {
    id: 'user-irban1',
    egov_user_id: 'egov-1',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-1',
    nama: 'Admin Irban I',
    nip: '19800101',
  };

  const superAdmin: AuthenticatedUser = {
    id: 'user-super',
    egov_user_id: 'egov-super',
    role: RoleEnum.SUPER_ADMIN,
    irban_id: null,
    nama: 'Inspektur',
    nip: '19700101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LhpService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: FilesService, useValue: mockFilesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<LhpService>(LhpService);
    prisma = module.get<PrismaService>(PrismaService);
    simpegAdapter = module.get<SimpegAdapter>(SimpegAdapter);
    irbanScopeService = module.get<IrbanScopeService>(IrbanScopeService);
    filesService = module.get<FilesService>(FilesService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(simpegAdapter).toBeDefined();
    expect(irbanScopeService).toBeDefined();
    expect(filesService).toBeDefined();
    expect(auditService).toBeDefined();
  });

  describe('create', () => {
    const validDto = {
      nomor_lhp: 'LHP/01/2026',
      tanggal_lhp: '2026-03-01',
      tanggal_diterima_lhp: '2026-03-05',
      simpeg_unit_kerja_id: 'unit-dinas-pu',
      jenis_pemeriksaan_id: 'jp-ketaatan',
    };

    it('should throw BadRequestException if unit kerja not found or not unit_induk', async () => {
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce(null);

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if unit kerja not mapped to any Irban', async () => {
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-dinas-pu',
        unit_kerja: 'Dinas PU',
      });
      mockPrisma.irbanUnitKerja.findUnique.mockResolvedValueOnce(null);

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if ADMIN_IRBAN attempts to create LHP for unit mapped to another Irban', async () => {
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-dinas-pu',
        unit_kerja: 'Dinas PU',
      });
      mockPrisma.irbanUnitKerja.findUnique.mockResolvedValueOnce({
        id: 'map-1',
        irban_id: 'irban-2', // Wilayah Irban II
        simpeg_unit_kerja_id: 'unit-dinas-pu',
        irban: { id: 'irban-2', nama: 'Irban Wilayah II' },
      });

      await expect(service.create(validDto, adminIrban1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should successfully create LHP and snapshot irban_id', async () => {
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-dinas-pu',
        unit_kerja: 'Dinas PU',
      });
      mockPrisma.irbanUnitKerja.findUnique.mockResolvedValueOnce({
        id: 'map-1',
        irban_id: 'irban-1',
        simpeg_unit_kerja_id: 'unit-dinas-pu',
        irban: { id: 'irban-1', nama: 'Irban Wilayah I' },
      });
      mockPrisma.jenisPemeriksaan.findUnique.mockResolvedValueOnce({
        id: 'jp-ketaatan',
        nama: 'Ketaatan',
        is_active: true,
      });
      mockPrisma.lhp.findUnique.mockResolvedValueOnce(null);
      mockPrisma.lhp.create.mockResolvedValueOnce({
        id: 'lhp-new',
        nomor_lhp: 'LHP/01/2026',
        tanggal_lhp: new Date('2026-03-01'),
        tanggal_diterima_lhp: new Date('2026-03-05'),
        simpeg_unit_kerja_id: 'unit-dinas-pu',
        irban_id: 'irban-1',
        jenis_pemeriksaan_id: 'jp-ketaatan',
      });

      const res = await service.create(validDto, adminIrban1);

      expect(res.id).toBe('lhp-new');
      expect(mockPrisma.lhp.create).toHaveBeenCalled();
      const calls = mockPrisma.lhp.create.mock.calls as unknown as Array<
        [{ data: { irban_id: string; nomor_lhp: string } }]
      >;
      const createCall = calls[0][0];
      expect(createCall.data.irban_id).toBe('irban-1');
      expect(createCall.data.nomor_lhp).toBe('LHP/01/2026');
    });
  });

  describe('findById', () => {
    it('should reject ADMIN_IRBAN if LHP belongs to another Irban', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-irban2',
        nomor_lhp: 'LHP/02/2026',
        irban_id: 'irban-2', // Irban II
        closed_at: null,
      });

      await expect(service.findById('lhp-irban2', adminIrban1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow ADMIN_IRBAN if LHP belongs to their Irban', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-irban1',
        nomor_lhp: 'LHP/01/2026',
        irban_id: 'irban-1', // Irban I
        simpeg_unit_kerja_id: 'unit-1',
        closed_at: null,
        temuans: [],
        surat_peringatans: [],
      });
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-1',
        unit_kerja: 'Dinas Kesehatan',
      });

      const res = await service.findById('lhp-irban1', adminIrban1);
      expect(res.id).toBe('lhp-irban1');
      expect(res.unit_kerja_nama).toBe('Dinas Kesehatan');
    });

    it('should allow SUPER_ADMIN to read LHP across any Irban', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-irban2',
        nomor_lhp: 'LHP/02/2026',
        irban_id: 'irban-2',
        simpeg_unit_kerja_id: 'unit-2',
        closed_at: null,
        temuans: [],
        surat_peringatans: [],
      });
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-2',
        unit_kerja: 'Dinas Pendidikan',
      });

      const res = await service.findById('lhp-irban2', superAdmin);
      expect(res.id).toBe('lhp-irban2');
    });
  });

  describe('update', () => {
    it('should reject update if LHP is closed', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-closed',
        nomor_lhp: 'LHP/CLOSED/2026',
        irban_id: 'irban-1',
        closed_at: new Date('2026-04-01'),
      });

      await expect(
        service.update('lhp-closed', { nomor_lhp: 'NEW' }, adminIrban1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closeLhp', () => {
    it('should close LHP successfully and record closed_at and closed_by', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-1',
        nomor_lhp: 'LHP/01/2026',
        irban_id: 'irban-1',
        closed_at: null,
        temuans: [],
      });
      mockPrisma.lhp.update.mockResolvedValueOnce({
        id: 'lhp-1',
        closed_at: new Date(),
        closed_by: adminIrban1.id,
      });

      const res = await service.closeLhp('lhp-1', adminIrban1);
      expect(res.message).toBe('LHP berhasil ditandai selesai');
      expect(mockPrisma.lhp.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CLOSE_LHP' }),
      );
    });
  });

  describe('reopenLhp', () => {
    it('should reject non-superadmin from reopening LHP', async () => {
      await expect(
        service.reopenLhp('lhp-1', 'Alasan pembukaan', adminIrban1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject reopening if reason is empty', async () => {
      await expect(
        service.reopenLhp('lhp-1', '   ', superAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow Super Admin to reopen closed LHP with valid reason', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-closed',
        closed_at: new Date('2026-04-01'),
        nomor_lhp: 'LHP/01/2026',
      });
      mockPrisma.lhp.update.mockResolvedValueOnce({
        id: 'lhp-closed',
        closed_at: null,
        closed_by: null,
        reopen_reason: 'Ditemukan bukti tindak lanjut susulan',
      });

      const res = await service.reopenLhp(
        'lhp-closed',
        'Ditemukan bukti tindak lanjut susulan',
        superAdmin,
      );
      expect(res.message).toBe('LHP berhasil dibuka kembali');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REOPEN_LHP' }),
      );
    });
  });

  describe('deleteLhp', () => {
    it('should prevent deleting LHP that has signed TTE letters', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-with-tte',
        surat_peringatans: [{ id: 'sp-signed-1', signed_at: new Date() }],
      });

      await expect(
        service.deleteLhp('lhp-with-tte', superAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
