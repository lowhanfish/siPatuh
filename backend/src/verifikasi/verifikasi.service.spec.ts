import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { VerifikasiService } from './verifikasi.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { FilesService } from '../files/files.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('VerifikasiService', () => {
  let service: VerifikasiService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;
  let filesService: FilesService;
  let auditService: AuditService;

  const mockPrisma = {
    tindakLanjut: {
      findUnique: jest.fn(),
    },
    statusRekomendasi: {
      findUnique: jest.fn(),
    },
    verifikasi: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    rekomendasi: {
      update: jest.fn(),
    },
    attachment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
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
        VerifikasiService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<VerifikasiService>(VerifikasiService);
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
    it('should reject if catatan is empty or whitespace', async () => {
      await expect(
        service.create(
          'tl-1',
          { catatan: '   ', status_rekomendasi_id: 'status-sesuai' },
          adminIrban1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if tindak lanjut belongs to another Irban', async () => {
      mockPrisma.tindakLanjut.findUnique.mockResolvedValueOnce({
        id: 'tl-irban2',
        rekomendasi_id: 'rekom-2',
        rekomendasi: {
          status_rekomendasi_id: 'status-lama',
          temuan: { lhp: { irban_id: 'irban-2', closed_at: null } },
        },
      });

      await expect(
        service.create(
          'tl-irban2',
          {
            catatan: 'Dokumen lengkap',
            status_rekomendasi_id: 'status-sesuai',
          },
          adminIrban1,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create verifikasi and update status rekomendasi in transaction', async () => {
      mockPrisma.tindakLanjut.findUnique.mockResolvedValueOnce({
        id: 'tl-1',
        rekomendasi_id: 'rekom-1',
        rekomendasi: {
          status_rekomendasi_id: 'status-belum-sesuai',
          temuan: { lhp: { irban_id: 'irban-1', closed_at: null } },
        },
      });
      mockPrisma.statusRekomendasi.findUnique.mockResolvedValueOnce({
        id: 'status-sesuai',
        nama: 'Sesuai',
        is_active: true,
      });

      const mockVerifikasiResult = {
        id: 'verif-1',
        tindak_lanjut_id: 'tl-1',
        catatan: 'Telah disetorkan penuh ke kas daerah',
        status_rekomendasi_id: 'status-sesuai',
      };
      const mockUpdatedRekom = {
        id: 'rekom-1',
        status_rekomendasi_id: 'status-sesuai',
      };

      mockPrisma.$transaction.mockResolvedValueOnce([
        mockVerifikasiResult,
        mockUpdatedRekom,
      ]);

      const res = await service.create(
        'tl-1',
        {
          catatan: 'Telah disetorkan penuh ke kas daerah',
          status_rekomendasi_id: 'status-sesuai',
        },
        adminIrban1,
      );

      expect(res.verifikasi.id).toBe('verif-1');
      expect(res.rekomendasi_updated.status_rekomendasi_id).toBe(
        'status-sesuai',
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });
});
