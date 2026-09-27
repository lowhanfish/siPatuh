import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { TemuanService } from './temuan.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('TemuanService', () => {
  let service: TemuanService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;
  let auditService: AuditService;

  const mockPrisma = {
    lhp: {
      findUnique: jest.fn(),
    },
    temuan: {
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
        TemuanService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TemuanService>(TemuanService);
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
    it('should reject create temuan if LHP belongs to another Irban', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-irban2',
        irban_id: 'irban-2',
        closed_at: null,
      });

      await expect(
        service.create(
          'lhp-irban2',
          { judul: 'Temuan 1', uraian: 'Penjelasan' },
          adminIrban1,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject create temuan if LHP is closed', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-closed',
        irban_id: 'irban-1',
        closed_at: new Date('2026-05-01'),
      });

      await expect(
        service.create(
          'lhp-closed',
          { judul: 'Temuan Baru', uraian: 'Penjelasan' },
          adminIrban1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should assign sequential nomor_urut (1..n) automatically', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-1',
        irban_id: 'irban-1',
        closed_at: null,
      });
      mockPrisma.temuan.findFirst.mockResolvedValueOnce({
        nomor_urut: 2,
      });
      mockPrisma.temuan.create.mockResolvedValueOnce({
        id: 'temuan-3',
        lhp_id: 'lhp-1',
        nomor_urut: 3,
        judul: 'Temuan 3',
        uraian: 'Uraian temuan',
        nilai_temuan: null,
      });

      const res = await service.create(
        'lhp-1',
        { judul: 'Temuan 3', uraian: 'Uraian temuan' },
        adminIrban1,
      );

      expect(res.nomor_urut).toBe(3);
      expect(mockPrisma.temuan.create).toHaveBeenCalled();
    });
  });
});
