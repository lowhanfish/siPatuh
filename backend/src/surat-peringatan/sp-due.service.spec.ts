import { Test, TestingModule } from '@nestjs/testing';
import { KategoriStatusEnum, RoleEnum, SpLevelEnum } from '@prisma/client';
import { SpDueEngineService } from './sp-due.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('SpDueEngineService', () => {
  let service: SpDueEngineService;
  let prisma: PrismaService;
  let irbanScopeService: IrbanScopeService;
  let simpegAdapter: SimpegAdapter;

  const mockPrisma = {
    lhp: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest
      .fn()
      .mockResolvedValue({ unit_kerja: 'Dinas Sosial' }),
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
        SpDueEngineService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
      ],
    }).compile();

    service = module.get<SpDueEngineService>(SpDueEngineService);
    prisma = module.get<PrismaService>(PrismaService);
    irbanScopeService = module.get<IrbanScopeService>(IrbanScopeService);
    simpegAdapter = module.get<SimpegAdapter>(SimpegAdapter);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(irbanScopeService).toBeDefined();
    expect(simpegAdapter).toBeDefined();
  });

  describe('calculateAgeInDays', () => {
    it('should calculate calendar days accurately based on date difference', () => {
      const received = new Date('2026-01-01T10:00:00Z');
      const target = new Date('2026-01-31T05:00:00Z');
      expect(service.calculateAgeInDays(received, target)).toBe(30);
    });
  });

  describe('determineEligibleLevel (Boundary testing)', () => {
    it('Day 29 should NOT be eligible for any SP', () => {
      expect(service.determineEligibleLevel(29, [])).toBeNull();
    });

    it('Day 30 should be eligible for SP1', () => {
      expect(service.determineEligibleLevel(30, [])).toBe(SpLevelEnum.SP1);
    });

    it('Day 44 should NOT be eligible for SP2 if SP1 already issued', () => {
      expect(service.determineEligibleLevel(44, [SpLevelEnum.SP1])).toBeNull();
    });

    it('Day 45 should be eligible for SP2 if SP1 already issued', () => {
      expect(service.determineEligibleLevel(45, [SpLevelEnum.SP1])).toBe(
        SpLevelEnum.SP2,
      );
    });

    it('Day 59 should NOT be eligible for SP3 if SP1 and SP2 already issued', () => {
      expect(
        service.determineEligibleLevel(59, [SpLevelEnum.SP1, SpLevelEnum.SP2]),
      ).toBeNull();
    });

    it('Day 60 should be eligible for SP3 if SP1 and SP2 already issued', () => {
      expect(
        service.determineEligibleLevel(60, [SpLevelEnum.SP1, SpLevelEnum.SP2]),
      ).toBe(SpLevelEnum.SP3);
    });

    it('Should return null if all SP1, SP2, and SP3 have already been issued', () => {
      expect(
        service.determineEligibleLevel(100, [
          SpLevelEnum.SP1,
          SpLevelEnum.SP2,
          SpLevelEnum.SP3,
        ]),
      ).toBeNull();
    });
  });

  describe('evaluateLhp', () => {
    it('should not be due if all recommendations are SELESAI even if age >= 60 days', async () => {
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-1',
        nomor_lhp: 'LHP/01/2026',
        irban_id: 'irban-1',
        simpeg_unit_kerja_id: 'unit-1',
        tanggal_lhp: new Date('2026-01-01'),
        tanggal_diterima_lhp: new Date('2026-01-01'), // 90 days ago
        closed_at: null,
        surat_peringatans: [],
        temuans: [
          {
            id: 't-1',
            nomor_urut: 1,
            rekomendasis: [
              {
                id: 'r-1',
                nomor_urut: 1,
                status_rekomendasi: {
                  nama: 'Sesuai',
                  kategori: KategoriStatusEnum.SELESAI,
                },
              },
            ],
          },
        ],
      });

      const res = await service.evaluateLhp(
        'lhp-1',
        adminIrban1,
        new Date('2026-04-01'),
      );

      expect(res.is_due).toBe(false);
      expect(res.eligible_level).toBeNull();
      expect(res.pending_rekomendasi_count).toBe(0);
    });

    it('should verify countdown basis is tanggal_diterima_lhp, not tanggal_lhp', async () => {
      // Misal: tanggal_lhp dibuat 60 hari lalu, tapi baru diterima OPD 10 hari lalu
      mockPrisma.lhp.findUnique.mockResolvedValueOnce({
        id: 'lhp-countdown-check',
        nomor_lhp: 'LHP/TEST/2026',
        irban_id: 'irban-1',
        simpeg_unit_kerja_id: 'unit-1',
        tanggal_lhp: new Date('2026-01-01'),
        tanggal_diterima_lhp: new Date('2026-02-20'), // Baru diterima 10 hari sebelum 2026-03-02
        closed_at: null,
        surat_peringatans: [],
        temuans: [
          {
            id: 't-1',
            nomor_urut: 1,
            rekomendasis: [
              {
                id: 'r-1',
                nomor_urut: 1,
                status_rekomendasi: {
                  nama: 'Belum Sesuai',
                  kategori: KategoriStatusEnum.BELUM_SELESAI,
                },
              },
            ],
          },
        ],
      });

      const res = await service.evaluateLhp(
        'lhp-countdown-check',
        adminIrban1,
        new Date('2026-03-02'),
      );

      // Usia dari tanggal_diterima_lhp adalah 10 hari (< 30 hari), jadi belum due SP1
      expect(res.age_days).toBe(10);
      expect(res.is_due).toBe(false);
    });
  });
});
