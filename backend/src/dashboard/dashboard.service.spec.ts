import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { KategoriStatusEnum, RoleEnum, SpLevelEnum } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SpDueEngineService } from '../surat-peringatan/sp-due.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('DashboardService', () => {
  let service: DashboardService;

  const adminIrban1: AuthenticatedUser = {
    id: 'user-irban1',
    egov_user_id: 'egov-1',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-1',
    nama: 'Admin Irban I',
    nip: '19800101',
  };

  const bupatiUser: AuthenticatedUser = {
    id: 'user-bupati',
    egov_user_id: 'egov-bupati',
    role: RoleEnum.BUPATI,
    nama: 'Bupati Konawe Selatan',
    nip: '19700101',
  };

  const mockPrisma = {
    irban: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    lhp: {
      findMany: jest.fn(),
    },
  };

  const mockSpDueEngine = {
    findDueLhps: jest.fn(),
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest.fn().mockImplementation((id: string) => {
      return Promise.resolve({ id, unit_kerja: `Dinas ${id}` });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SpDueEngineService, useValue: mockSpDueEngine },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  const mockLhpIrban1 = [
    {
      id: 'lhp-1',
      nomor_lhp: 'LHP/01/2026',
      irban_id: 'irban-1',
      simpeg_unit_kerja_id: 'unit-1',
      closed_at: null,
      tanggal_lhp: new Date('2026-02-01'),
      temuans: [
        {
          id: 'tem-1',
          rekomendasis: [
            {
              id: 'rek-1',
              nilai_rekomendasi: 10000000,
              status_rekomendasi: {
                nama: 'Sesuai',
                kategori: KategoriStatusEnum.SELESAI,
              },
              tindak_lanjuts: [{ nilai_tindak_lanjut: 10000000 }],
            },
            {
              id: 'rek-2',
              nilai_rekomendasi: 5000000,
              status_rekomendasi: {
                nama: 'Belum Sesuai',
                kategori: KategoriStatusEnum.BELUM_SELESAI,
              },
              tindak_lanjuts: [],
            },
          ],
        },
      ],
      surat_peringatans: [{ level: SpLevelEnum.SP1 }],
    },
  ];

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getIrbanDashboard', () => {
    it('should calculate operational metrics and SP due alerts for Irban', async () => {
      mockPrisma.irban.findUnique.mockResolvedValueOnce({
        id: 'irban-1',
        nama: 'Irban Wilayah I',
      });
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpIrban1);
      mockSpDueEngine.findDueLhps.mockResolvedValueOnce([
        { lhp_id: 'lhp-1', eligible_level: SpLevelEnum.SP1 },
      ]);

      const dashboard = await service.getIrbanDashboard(2026, adminIrban1);

      expect(dashboard).toBeDefined();
      expect(dashboard.tahun).toBe(2026);
      expect(dashboard.metrics.total_lhp).toBe(1);
      expect(dashboard.metrics.total_temuan).toBe(1);
      expect(dashboard.metrics.total_rekomendasi).toBe(2);
      expect(dashboard.metrics.rekomendasi_selesai).toBe(1);
      expect(dashboard.metrics.rekomendasi_belum_selesai).toBe(1);
      expect(dashboard.metrics.persentase_selesai).toBe(50);
      expect(dashboard.metrics.total_nilai_rekomendasi).toBe(15000000);
      expect(dashboard.metrics.total_nilai_setor).toBe(10000000);
      expect(dashboard.metrics.sisa_nilai_rekomendasi).toBe(5000000);
      expect(dashboard.sp_alerts.total_due).toBe(1);
      expect(dashboard.sp_alerts.sp1_due).toBe(1);
    });

    it('should reject Bupati from accessing Irban operational dashboard (403 Forbidden)', async () => {
      await expect(service.getIrbanDashboard(2026, bupatiUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getPimpinanDashboard', () => {
    it('should calculate executive metrics across all Irbans', async () => {
      mockPrisma.irban.findMany.mockResolvedValueOnce([
        { id: 'irban-1', nama: 'Irban Wilayah I' },
        { id: 'irban-2', nama: 'Irban Wilayah II' },
      ]);
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpIrban1);

      const dashboard = await service.getPimpinanDashboard(2026);

      expect(dashboard).toBeDefined();
      expect(dashboard.tahun).toBe(2026);
      expect(dashboard.summary_kpi.total_lhp).toBe(1);
      expect(dashboard.summary_kpi.total_rekomendasi).toBe(2);
      expect(dashboard.summary_kpi.persentase_selesai).toBe(50);
      expect(dashboard.surat_peringatan_kpi.sp1_issued).toBe(1);
      expect(dashboard.irban_progress.length).toBe(2);
      expect(dashboard.top_opd_outstanding.length).toBe(1);
    });
  });
});
