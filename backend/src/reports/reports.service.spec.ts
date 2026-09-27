import { Test, TestingModule } from '@nestjs/testing';
import { KategoriStatusEnum, RoleEnum } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('ReportsService', () => {
  let service: ReportsService;

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
    lhp: {
      findMany: jest.fn(),
    },
    statusRekomendasi: {
      findMany: jest.fn(),
    },
  };

  const mockSimpegAdapter = {
    findUnitKerjaById: jest.fn().mockImplementation((id: string) => {
      if (id === 'unit-dinsos') {
        return Promise.resolve({
          id: 'unit-dinsos',
          unit_kerja: 'Dinas Sosial',
        });
      }
      return Promise.resolve({ id, unit_kerja: `OPD ${id}` });
    }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        IrbanScopeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SimpegAdapter, useValue: mockSimpegAdapter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  const mockMasterStatuses = [
    {
      id: 'st-sesuai',
      nama: 'Sesuai',
      kategori: KategoriStatusEnum.SELESAI,
      urutan: 1,
    },
    {
      id: 'st-belum',
      nama: 'Belum Sesuai',
      kategori: KategoriStatusEnum.BELUM_SELESAI,
      urutan: 2,
    },
  ];

  const mockLhpData = [
    {
      id: 'lhp-1',
      nomor_lhp: 'LHP/01/2026',
      irban_id: 'irban-1',
      simpeg_unit_kerja_id: 'unit-dinsos',
      closed_at: null,
      irban: { nama: 'Irban Wilayah I' },
      temuans: [
        {
          id: 'tem-1',
          nilai_temuan: 20000000,
          rekomendasis: [
            {
              id: 'rek-1',
              status_rekomendasi_id: 'st-sesuai',
              nilai_rekomendasi: 10000000,
              status_rekomendasi: {
                id: 'st-sesuai',
                nama: 'Sesuai',
                kategori: KategoriStatusEnum.SELESAI,
              },
              tindak_lanjuts: [{ nilai_tindak_lanjut: 10000000 }],
            },
            {
              id: 'rek-2',
              status_rekomendasi_id: 'st-belum',
              nilai_rekomendasi: 10000000,
              status_rekomendasi: {
                id: 'st-belum',
                nama: 'Belum Sesuai',
                kategori: KategoriStatusEnum.BELUM_SELESAI,
              },
              tindak_lanjuts: [{ nilai_tindak_lanjut: 2000000 }],
            },
          ],
        },
      ],
    },
  ];

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummaryReport', () => {
    it('should aggregate metrics accurately and resolve OPD name', async () => {
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpData);
      mockPrisma.statusRekomendasi.findMany.mockResolvedValueOnce(
        mockMasterStatuses,
      );

      const report = await service.getSummaryReport(
        { tahun: '2026' },
        adminIrban1,
      );

      expect(report).toBeDefined();
      expect(report.tahun).toBe(2026);
      expect(report.metrics.total_lhp).toBe(1);
      expect(report.metrics.total_temuan).toBe(1);
      expect(report.metrics.total_rekomendasi).toBe(2);
      expect(report.metrics.rekomendasi_selesai).toBe(1);
      expect(report.metrics.rekomendasi_belum_selesai).toBe(1);
      expect(report.metrics.persentase_selesai).toBe(50); // 1 / 2 = 50%
      expect(report.metrics.total_nilai_rekomendasi).toBe(20000000);
      expect(report.metrics.total_nilai_setor).toBe(12000000);
      expect(report.metrics.sisa_nilai_rekomendasi).toBe(8000000);

      expect(report.opd_breakdown.length).toBe(1);
      expect(report.opd_breakdown[0].nama_opd).toBe('Dinas Sosial');
      expect(report.opd_breakdown[0].sisa_rekomendasi).toBe(8000000);
    });

    it('should allow Bupati to view report across all Irbans', async () => {
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpData);
      mockPrisma.statusRekomendasi.findMany.mockResolvedValueOnce(
        mockMasterStatuses,
      );

      const report = await service.getSummaryReport({}, bupatiUser);

      expect(report).toBeDefined();
      expect(report.filter_applied.irban_id).toBeUndefined(); // all irbans
    });
  });

  describe('exportExcel', () => {
    it('should generate valid CSV buffer with UTF-8 BOM', async () => {
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpData);
      mockPrisma.statusRekomendasi.findMany.mockResolvedValueOnce(
        mockMasterStatuses,
      );

      const result = await service.exportExcel({ tahun: '2026' }, adminIrban1);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      // UTF-8 BOM check (\uFEFF -> 0xEF, 0xBB, 0xBF)
      expect(result.buffer[0]).toBe(0xef);
      expect(result.buffer[1]).toBe(0xbb);
      expect(result.buffer[2]).toBe(0xbf);
      expect(result.filename).toContain('Laporan_Rekap_SIPATUH_2026_');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPORT_REPORT_EXCEL' }),
      );
    });
  });

  describe('exportPdf', () => {
    it('should generate valid PDF buffer for report', async () => {
      mockPrisma.lhp.findMany.mockResolvedValueOnce(mockLhpData);
      mockPrisma.statusRekomendasi.findMany.mockResolvedValueOnce(
        mockMasterStatuses,
      );

      const result = await service.exportPdf({ tahun: '2026' }, adminIrban1);

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      expect(result.filename).toContain('Laporan_Rekap_SIPATUH_2026_');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPORT_REPORT_PDF' }),
      );
    });
  });
});
