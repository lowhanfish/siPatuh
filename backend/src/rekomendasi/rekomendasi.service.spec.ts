import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { RekomendasiService } from './rekomendasi.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('RekomendasiService', () => {
  let service: RekomendasiService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;
  let auditService: AuditService;

  const mockPrisma = {
    temuan: {
      findUnique: jest.fn(),
    },
    statusRekomendasi: {
      findUnique: jest.fn(),
    },
    rekomendasi: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
        RekomendasiService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<RekomendasiService>(RekomendasiService);
    prisma = module.get<PrismaService>(PrismaService);
    irbanScopeService = module.get<IrbanScopeService>(IrbanScopeService);
    auditService = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(irbanScopeService).toBeDefined();
    expect(auditService).toBeDefined();
  });

  describe('create', () => {
    it('should reject if status rekomendasi is invalid or inactive', async () => {
      mockPrisma.temuan.findUnique.mockResolvedValueOnce({
        id: 'temuan-1',
        lhp: { irban_id: 'irban-1', closed_at: null },
      });
      mockPrisma.statusRekomendasi.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create(
          'temuan-1',
          {
            uraian: 'Tindak lanjuti segera',
            status_rekomendasi_id: 'invalid-status',
          },
          adminIrban1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if temuan belongs to another Irban', async () => {
      mockPrisma.temuan.findUnique.mockResolvedValueOnce({
        id: 'temuan-2',
        lhp: { irban_id: 'irban-2', closed_at: null }, // Irban II
      });

      await expect(
        service.create(
          'temuan-2',
          {
            uraian: 'Tindak lanjuti',
            status_rekomendasi_id: 'status-1',
          },
          adminIrban1,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create rekomendasi with sequential numbering and optional decimal', async () => {
      mockPrisma.temuan.findUnique.mockResolvedValueOnce({
        id: 'temuan-1',
        lhp: { irban_id: 'irban-1', closed_at: null },
      });
      mockPrisma.statusRekomendasi.findUnique.mockResolvedValueOnce({
        id: 'status-1',
        nama: 'Belum Sesuai',
        is_active: true,
      });
      mockPrisma.rekomendasi.findFirst.mockResolvedValueOnce({
        nomor_urut: 1,
      });
      mockPrisma.rekomendasi.create.mockResolvedValueOnce({
        id: 'rekom-2',
        temuan_id: 'temuan-1',
        nomor_urut: 2,
        uraian: 'Setorkan ke kas daerah',
        nilai_rekomendasi: 50000000,
        status_rekomendasi_id: 'status-1',
      });

      const res = await service.create(
        'temuan-1',
        {
          uraian: 'Setorkan ke kas daerah',
          nilai_rekomendasi: 50000000,
          status_rekomendasi_id: 'status-1',
        },
        adminIrban1,
      );

      expect(res.nomor_urut).toBe(2);
      expect(mockPrisma.rekomendasi.create).toHaveBeenCalled();
    });
  });
});
