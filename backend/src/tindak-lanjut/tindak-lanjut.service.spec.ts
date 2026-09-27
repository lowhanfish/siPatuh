import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { KategoriStatusEnum, RoleEnum } from '@prisma/client';
import { TindakLanjutService } from './tindak-lanjut.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('TindakLanjutService', () => {
  let service: TindakLanjutService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;
  let filesService: FilesService;
  let auditService: AuditService;

  const mockPrisma = {
    rekomendasi: {
      findUnique: jest.fn(),
    },
    tindakLanjut: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    attachment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockFilesService = {
    saveUploadedFile: jest.fn(),
    resolveSecurePath: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const adminIrban1: AuthenticatedUser = {
    id: 'user-irban1',
    egov_user_id: 'egov-1',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-1',
    nama: 'Admin Irban I',
    nip: '19800101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TindakLanjutService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TindakLanjutService>(TindakLanjutService);
    prisma = module.get<PrismaService>(PrismaService);
    irbanScopeService = module.get<IrbanScopeService>(IrbanScopeService);
    filesService = module.get<FilesService>(FilesService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(irbanScopeService).toBeDefined();
    expect(filesService).toBeDefined();
    expect(auditService).toBeDefined();
  });

  describe('create', () => {
    it('should reject if LHP belongs to another Irban', async () => {
      mockPrisma.rekomendasi.findUnique.mockResolvedValueOnce({
        id: 'rekom-1',
        temuan: { lhp: { irban_id: 'irban-2', closed_at: null } },
      });

      await expect(
        service.create(
          'rekom-1',
          {
            tanggal_diterima: '2026-04-10',
            uraian: 'Bukti transfer kas daerah',
          },
          adminIrban1,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should append new tindak lanjut without overwriting previous history', async () => {
      mockPrisma.rekomendasi.findUnique.mockResolvedValueOnce({
        id: 'rekom-1',
        temuan: { lhp: { irban_id: 'irban-1', closed_at: null } },
      });
      mockPrisma.tindakLanjut.create.mockResolvedValueOnce({
        id: 'tl-iterasi-2',
        rekomendasi_id: 'rekom-1',
        tanggal_diterima: new Date('2026-04-10'),
        uraian: 'Setoran termin 2',
        nilai_tindak_lanjut: 30000000,
        created_by: adminIrban1.id,
      });

      const res = await service.create(
        'rekom-1',
        {
          tanggal_diterima: '2026-04-10',
          uraian: 'Setoran termin 2',
          nilai_tindak_lanjut: 30000000,
        },
        adminIrban1,
      );

      expect(res.id).toBe('tl-iterasi-2');
      expect(mockPrisma.tindakLanjut.create).toHaveBeenCalled();
    });
  });

  describe('getFinancialSummary', () => {
    it('should correctly calculate total, remaining balance, and percentage without altering status automatically', async () => {
      mockPrisma.rekomendasi.findUnique.mockResolvedValueOnce({
        id: 'rekom-1',
        nilai_rekomendasi: 100000000,
        status_rekomendasi: {
          nama: 'Belum Sesuai',
          kategori: KategoriStatusEnum.BELUM_SELESAI,
        },
        temuan: { lhp: { irban_id: 'irban-1' } },
        tindak_lanjuts: [
          { nilai_tindak_lanjut: 40000000 },
          { nilai_tindak_lanjut: 30000000 },
        ],
      });

      const summary = await service.getFinancialSummary('rekom-1', adminIrban1);

      expect(summary.nilai_rekomendasi).toBe(100000000);
      expect(summary.total_tindak_lanjut).toBe(70000000);
      expect(summary.sisa).toBe(30000000);
      expect(summary.persentase_selesai).toBe(70);
      // Status tetap "Belum Sesuai", verifier yang harus memutuskan secara manual
      expect(summary.status_saat_ini).toBe('Belum Sesuai');
    });
  });
});
