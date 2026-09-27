import { Injectable, ForbiddenException } from '@nestjs/common';
import { KategoriStatusEnum, RoleEnum, SpLevelEnum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SpDueEngineService } from '../surat-peringatan/sp-due.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly spDueEngine: SpDueEngineService,
    private readonly simpegAdapter: SimpegAdapter,
  ) {}

  /**
   * Dashboard Operasional untuk Admin Irban
   * Menampilkan progres LHP, rekomendasi, alert SP due, dan keuangan wilayah Irban
   */
  async getIrbanDashboard(tahun: number, currentUser: AuthenticatedUser) {
    if (currentUser.role === RoleEnum.BUPATI) {
      throw new ForbiddenException(
        'Bupati hanya memiliki hak akses ke Dashboard Pimpinan dan Laporan',
      );
    }

    const effectiveIrbanId =
      this.irbanScopeService.resolveEffectiveIrbanId(currentUser);

    const startOfYear = new Date(`${tahun}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${tahun + 1}-01-01T00:00:00.000Z`);

    // Ambil detail Irban
    const irban = effectiveIrbanId
      ? await this.prisma.irban.findUnique({ where: { id: effectiveIrbanId } })
      : null;

    // Ambil LHP wilayah Irban pada tahun bersangkutan
    const lhps = await this.prisma.lhp.findMany({
      where: {
        irban_id: effectiveIrbanId,
        tanggal_lhp: { gte: startOfYear, lt: endOfYear },
      },
      include: {
        temuans: {
          include: {
            rekomendasis: {
              include: {
                status_rekomendasi: true,
                tindak_lanjuts: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalLhp = lhps.length;
    let lhpOpen = 0;
    let lhpClosed = 0;
    let totalTemuan = 0;
    let totalRekomendasi = 0;
    let rekomendasiSelesai = 0;
    let rekomendasiBelumSelesai = 0;
    let totalNilaiRekomendasi = 0;
    let totalNilaiSetor = 0;

    const statusCounts: Record<string, number> = {};

    for (const l of lhps) {
      if (l.closed_at) {
        lhpClosed++;
      } else {
        lhpOpen++;
      }

      for (const t of l.temuans) {
        totalTemuan++;
        for (const r of t.rekomendasis) {
          totalRekomendasi++;
          const val = r.nilai_rekomendasi ? Number(r.nilai_rekomendasi) : 0;
          totalNilaiRekomendasi += val;

          for (const tl of r.tindak_lanjuts) {
            if (tl.nilai_tindak_lanjut) {
              totalNilaiSetor += Number(tl.nilai_tindak_lanjut);
            }
          }

          if (r.status_rekomendasi.kategori === KategoriStatusEnum.SELESAI) {
            rekomendasiSelesai++;
          } else {
            rekomendasiBelumSelesai++;
          }

          const stName = r.status_rekomendasi.nama;
          statusCounts[stName] = (statusCounts[stName] || 0) + 1;
        }
      }
    }

    const persentaseSelesai =
      totalRekomendasi > 0
        ? Math.round((rekomendasiSelesai / totalRekomendasi) * 10000) / 100
        : 0;

    // Evaluasi SP Due untuk wilayah ini
    const dueLhps = await this.spDueEngine.findDueLhps(
      currentUser,
      effectiveIrbanId,
    );
    const sp1Due = dueLhps.filter(
      (d) => d.eligible_level === SpLevelEnum.SP1,
    ).length;
    const sp2Due = dueLhps.filter(
      (d) => d.eligible_level === SpLevelEnum.SP2,
    ).length;
    const sp3Due = dueLhps.filter(
      (d) => d.eligible_level === SpLevelEnum.SP3,
    ).length;

    // 5 LHP Terkini
    const recentLhps = lhps.slice(0, 5).map((l) => ({
      id: l.id,
      nomor_lhp: l.nomor_lhp,
      tanggal_lhp: l.tanggal_lhp,
      closed_at: l.closed_at,
      temuan_count: l.temuans.length,
      rekomendasi_count: l.temuans.reduce(
        (acc, t) => acc + t.rekomendasis.length,
        0,
      ),
    }));

    return {
      tahun,
      irban: {
        id: irban?.id || effectiveIrbanId,
        nama: irban?.nama || 'Seluruh Irban',
      },
      metrics: {
        total_lhp: totalLhp,
        lhp_open: lhpOpen,
        lhp_closed: lhpClosed,
        total_temuan: totalTemuan,
        total_rekomendasi: totalRekomendasi,
        rekomendasi_selesai: rekomendasiSelesai,
        rekomendasi_belum_selesai: rekomendasiBelumSelesai,
        persentase_selesai: persentaseSelesai,
        total_nilai_rekomendasi: totalNilaiRekomendasi,
        total_nilai_setor: totalNilaiSetor,
        sisa_nilai_rekomendasi: Math.max(
          0,
          totalNilaiRekomendasi - totalNilaiSetor,
        ),
      },
      status_breakdown: statusCounts,
      sp_alerts: {
        total_due: dueLhps.length,
        sp1_due: sp1Due,
        sp2_due: sp2Due,
        sp3_due: sp3Due,
        items: dueLhps.slice(0, 5),
      },
      recent_lhps: recentLhps,
    };
  }

  /**
   * Dashboard Eksekutif untuk Pimpinan (Bupati & Inspektur)
   * Menampilkan agregat menyeluruh 5 Irban, progres per Irban, status SP, dan OPD tertinggi
   */
  async getPimpinanDashboard(tahun: number) {
    const startOfYear = new Date(`${tahun}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${tahun + 1}-01-01T00:00:00.000Z`);

    // Ambil seluruh 5 Irban
    const irbans = await this.prisma.irban.findMany({
      orderBy: { kode: 'asc' },
    });

    // Ambil seluruh LHP tahun bersangkutan
    const lhps = await this.prisma.lhp.findMany({
      where: {
        tanggal_lhp: { gte: startOfYear, lt: endOfYear },
      },
      include: {
        irban: true,
        temuans: {
          include: {
            rekomendasis: {
              include: {
                status_rekomendasi: true,
                tindak_lanjuts: true,
              },
            },
          },
        },
        surat_peringatans: true,
      },
    });

    const totalLhp = lhps.length;
    let lhpOpen = 0;
    let lhpClosed = 0;
    let totalTemuan = 0;
    let totalRekomendasi = 0;
    let rekomendasiSelesai = 0;
    let rekomendasiBelumSelesai = 0;
    let totalNilaiRekomendasi = 0;
    let totalNilaiSetor = 0;

    let sp1Issued = 0;
    let sp2Issued = 0;
    let sp3Issued = 0;

    // Map agregasi per Irban
    const irbanProgressMap = new Map<
      string,
      {
        irban_id: string;
        irban_nama: string;
        total_lhp: number;
        total_rekomendasi: number;
        selesai: number;
        belum_selesai: number;
        nilai_rekomendasi: number;
        nilai_setor: number;
      }
    >();

    for (const irb of irbans) {
      irbanProgressMap.set(irb.id, {
        irban_id: irb.id,
        irban_nama: irb.nama,
        total_lhp: 0,
        total_rekomendasi: 0,
        selesai: 0,
        belum_selesai: 0,
        nilai_rekomendasi: 0,
        nilai_setor: 0,
      });
    }

    // Map agregasi per OPD
    const opdMap = new Map<
      string,
      {
        simpeg_unit_kerja_id: string;
        total_rekomendasi: number;
        selesai: number;
        belum_selesai: number;
        nilai_rekomendasi: number;
      }
    >();

    for (const l of lhps) {
      if (l.closed_at) {
        lhpClosed++;
      } else {
        lhpOpen++;
      }

      // Hitung SP diterbitkan
      for (const sp of l.surat_peringatans) {
        if (sp.level === SpLevelEnum.SP1) sp1Issued++;
        if (sp.level === SpLevelEnum.SP2) sp2Issued++;
        if (sp.level === SpLevelEnum.SP3) sp3Issued++;
      }

      const irbData = irbanProgressMap.get(l.irban_id);
      if (irbData) {
        irbData.total_lhp++;
      }

      let opdData = opdMap.get(l.simpeg_unit_kerja_id);
      if (!opdData) {
        opdData = {
          simpeg_unit_kerja_id: l.simpeg_unit_kerja_id,
          total_rekomendasi: 0,
          selesai: 0,
          belum_selesai: 0,
          nilai_rekomendasi: 0,
        };
        opdMap.set(l.simpeg_unit_kerja_id, opdData);
      }

      for (const t of l.temuans) {
        totalTemuan++;
        for (const r of t.rekomendasis) {
          totalRekomendasi++;
          opdData.total_rekomendasi++;

          const val = r.nilai_rekomendasi ? Number(r.nilai_rekomendasi) : 0;
          totalNilaiRekomendasi += val;
          opdData.nilai_rekomendasi += val;

          let rekSetor = 0;
          for (const tl of r.tindak_lanjuts) {
            if (tl.nilai_tindak_lanjut) {
              rekSetor += Number(tl.nilai_tindak_lanjut);
            }
          }
          totalNilaiSetor += rekSetor;

          if (irbData) {
            irbData.total_rekomendasi++;
            irbData.nilai_rekomendasi += val;
            irbData.nilai_setor += rekSetor;
          }

          if (r.status_rekomendasi.kategori === KategoriStatusEnum.SELESAI) {
            rekomendasiSelesai++;
            opdData.selesai++;
            if (irbData) irbData.selesai++;
          } else {
            rekomendasiBelumSelesai++;
            opdData.belum_selesai++;
            if (irbData) irbData.belum_selesai++;
          }
        }
      }
    }

    const persentaseSelesai =
      totalRekomendasi > 0
        ? Math.round((rekomendasiSelesai / totalRekomendasi) * 10000) / 100
        : 0;

    // Hitung progress per Irban
    const irbanProgress = Array.from(irbanProgressMap.values()).map((ip) => ({
      ...ip,
      persen_selesai:
        ip.total_rekomendasi > 0
          ? Math.round((ip.selesai / ip.total_rekomendasi) * 10000) / 100
          : 0,
      sisa_rekomendasi: Math.max(0, ip.nilai_rekomendasi - ip.nilai_setor),
    }));

    // Top 5 OPD dengan rekomendasi belum selesai terbanyak
    const sortedOpds = Array.from(opdMap.values()).sort(
      (a, b) => b.belum_selesai - a.belum_selesai,
    );
    const top5OpdData = sortedOpds.slice(0, 5);

    const top5OpdWithNames = [];
    for (const o of top5OpdData) {
      const opdSimpeg = await this.simpegAdapter.findUnitKerjaById(
        o.simpeg_unit_kerja_id,
      );
      top5OpdWithNames.push({
        simpeg_unit_kerja_id: o.simpeg_unit_kerja_id,
        nama_opd: opdSimpeg?.unit_kerja || `OPD ${o.simpeg_unit_kerja_id}`,
        total_rekomendasi: o.total_rekomendasi,
        selesai: o.selesai,
        belum_selesai: o.belum_selesai,
        persen_selesai:
          o.total_rekomendasi > 0
            ? Math.round((o.selesai / o.total_rekomendasi) * 10000) / 100
            : 0,
        nilai_rekomendasi: o.nilai_rekomendasi,
      });
    }

    return {
      tahun,
      summary_kpi: {
        total_lhp: totalLhp,
        lhp_open: lhpOpen,
        lhp_closed: lhpClosed,
        total_temuan: totalTemuan,
        total_rekomendasi: totalRekomendasi,
        rekomendasi_selesai: rekomendasiSelesai,
        rekomendasi_belum_selesai: rekomendasiBelumSelesai,
        persentase_selesai: persentaseSelesai,
        total_nilai_rekomendasi: totalNilaiRekomendasi,
        total_nilai_setor: totalNilaiSetor,
        sisa_nilai_rekomendasi: Math.max(
          0,
          totalNilaiRekomendasi - totalNilaiSetor,
        ),
      },
      surat_peringatan_kpi: {
        sp1_issued: sp1Issued,
        sp2_issued: sp2Issued,
        sp3_issued: sp3Issued,
        total_issued: sp1Issued + sp2Issued + sp3Issued,
      },
      irban_progress: irbanProgress,
      top_opd_outstanding: top5OpdWithNames,
    };
  }
}
