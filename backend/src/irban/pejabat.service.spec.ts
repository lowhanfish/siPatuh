import { Test, TestingModule } from '@nestjs/testing';
import { PenugasanEnum, RoleEnum } from '@prisma/client';
import { PejabatService } from './pejabat.service';
import { PrismaService } from '../prisma/prisma.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('PejabatService', () => {
  let service: PejabatService;
  let prisma: PrismaService;
  let simpegAdapter: SimpegAdapter;

  const mockPrisma = {
    pejabatUnitKerja: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-admin',
    egov_user_id: 'egov-1',
    role: RoleEnum.SUPER_ADMIN,
    irban_id: null,
    nama: 'Admin',
    nip: '19800101',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PejabatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PejabatService>(PejabatService);
    prisma = module.get<PrismaService>(PrismaService);
    simpegAdapter = module.get<SimpegAdapter>(SimpegAdapter);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(simpegAdapter).toBeDefined();
  });

  describe('create', () => {
    it('should create pejabat successfully when unit kerja is valid', async () => {
      mockSimpegAdapter.findUnitKerjaById.mockResolvedValueOnce({
        id: 'unit-1',
        unit_kerja: 'Dinas Sosial',
        unit_induk: 1,
      });

      mockPrisma.pejabatUnitKerja.create.mockResolvedValueOnce({
        id: 'pj-1',
        simpeg_unit_kerja_id: 'unit-1',
        nip: '19800101',
        nama: 'Drs. Fulan',
        jabatan: 'Kepala Dinas',
        jenis_penugasan: PenugasanEnum.DEFINITIF,
        tanggal_mulai: new Date('2025-01-01'),
        tanggal_selesai: null,
        is_active: true,
      });

      const res = await service.create(
        {
          simpeg_unit_kerja_id: 'unit-1',
          nip: '19800101',
          nama: 'Drs. Fulan',
          jabatan: 'Kepala Dinas',
          jenis_penugasan: PenugasanEnum.DEFINITIF,
          tanggal_mulai: '2025-01-01',
        },
        mockUser,
      );

      expect(res.id).toBe('pj-1');
    });
  });

  describe('resolveRecipient', () => {
    it('should prioritize PLT/PLH over DEFINITIF when active', async () => {
      const candidates = [
        {
          id: 'pejabat-definitif',
          simpeg_unit_kerja_id: 'unit-1',
          nip: '19700101',
          nama: 'Kepala Definitif',
          jabatan: 'Kepala Dinas',
          jenis_penugasan: PenugasanEnum.DEFINITIF,
          is_active: true,
          tanggal_mulai: new Date('2025-01-01'),
          tanggal_selesai: null,
        },
        {
          id: 'pejabat-plt',
          simpeg_unit_kerja_id: 'unit-1',
          nip: '19800101',
          nama: 'Plt Kepala',
          jabatan: 'Plt Kepala Dinas',
          jenis_penugasan: PenugasanEnum.PLT,
          is_active: true,
          tanggal_mulai: new Date('2026-01-01'),
          tanggal_selesai: null,
        },
      ];

      mockPrisma.pejabatUnitKerja.findMany.mockResolvedValueOnce(candidates);

      const result = await service.resolveRecipient('unit-1');

      expect(result.primary_candidate?.jenis_penugasan).toBe(PenugasanEnum.PLT);
      expect(result.primary_candidate?.nama).toBe('Plt Kepala');
      expect(result.requires_manual_selection).toBe(true);
      expect(result.all_candidates).toHaveLength(2);
    });

    it('should fallback to DEFINITIF when no PLT/PLH exists', async () => {
      const candidates = [
        {
          id: 'pejabat-definitif',
          simpeg_unit_kerja_id: 'unit-2',
          nip: '19750101',
          nama: 'Kadis Definitif',
          jabatan: 'Kepala Dinas',
          jenis_penugasan: PenugasanEnum.DEFINITIF,
          is_active: true,
          tanggal_mulai: new Date('2024-01-01'),
          tanggal_selesai: null,
        },
      ];

      mockPrisma.pejabatUnitKerja.findMany.mockResolvedValueOnce(candidates);

      const result = await service.resolveRecipient('unit-2');

      expect(result.primary_candidate?.nama).toBe('Kadis Definitif');
      expect(result.requires_manual_selection).toBe(false);
    });
  });
});
