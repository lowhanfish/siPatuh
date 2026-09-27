import { Injectable } from '@nestjs/common';
import { KategoriStatusEnum, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { IrbanScopeService } from '../irban/irban-scope.service';
import { SimpegAdapter } from '../external/simpeg/simpeg.adapter';
import { AuditService } from '../audit/audit.service';
import { ReportQueryDto } from './dto/report-query.dto';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

export interface StatusCountItem {
  status_id: string;
  nama: string;
  kategori: string;
  count: number;
}

export interface OpdReportSummaryItem {
  simpeg_unit_kerja_id: string;
  nama_opd: string;
  irban_nama: string;
  total_lhp: number;
  total_temuan: number;
  total_rekomendasi: number;
  selesai: number;
  belum_selesai: number;
  persen_selesai: number;
  nilai_rekomendasi: number;
  nilai_setor: number;
  sisa_rekomendasi: number;
}

export interface ReportSummaryResponse {
  tahun: number;
  filter_applied: {
    irban_id?: string;
    simpeg_unit_kerja_id?: string;
    jenis_pemeriksaan_id?: string;
    status_rekomendasi_id?: string;
  };
  metrics: {
    total_lhp: number;
    lhp_open: number;
    lhp_closed: number;
    total_temuan: number;
    total_rekomendasi: number;
    rekomendasi_selesai: number;
    rekomendasi_belum_selesai: number;
    persentase_selesai: number;
    total_nilai_temuan: number;
    total_nilai_rekomendasi: number;
    total_nilai_setor: number;
    sisa_nilai_rekomendasi: number;
    persentase_keuangan_selesai: number;
  };
  status_breakdown: StatusCountItem[];
  opd_breakdown: OpdReportSummaryItem[];
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irbanScopeService: IrbanScopeService,
    private readonly simpegAdapter: SimpegAdapter,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Mengambil data rekapitulasi agregat LHP dan Rekomendasi
   */
  async getSummaryReport(
    query: ReportQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<ReportSummaryResponse> {
    const effectiveIrbanId = this.irbanScopeService.resolveEffectiveIrbanId(
      currentUser,
      query.irban_id,
    );

    const targetYear = query.tahun
      ? parseInt(query.tahun, 10)
      : new Date().getFullYear();

    const where: Prisma.LhpWhereInput = {};

    // Filter tahun LHP
    const startOfYear = new Date(`${targetYear}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);
    where.tanggal_lhp = { gte: startOfYear, lt: endOfYear };

    if (effectiveIrbanId) {
      where.irban_id = effectiveIrbanId;
    }
    if (query.simpeg_unit_kerja_id) {
      where.simpeg_unit_kerja_id = query.simpeg_unit_kerja_id;
    }
    if (query.jenis_pemeriksaan_id) {
      where.jenis_pemeriksaan_id = query.jenis_pemeriksaan_id;
    }

    // Ambil LHP beserta relasi child
    const lhps = await this.prisma.lhp.findMany({
      where,
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
      },
      orderBy: { tanggal_lhp: 'desc' },
    });

    // Ambil semua master status untuk breakdown
    const masterStatuses = await this.prisma.statusRekomendasi.findMany({
      orderBy: { urutan: 'asc' },
    });

    const statusMap = new Map<string, StatusCountItem>();
    for (const st of masterStatuses) {
      statusMap.set(st.id, {
        status_id: st.id,
        nama: st.nama,
        kategori: st.kategori,
        count: 0,
      });
    }

    const totalLhp = lhps.length;
    let lhpOpen = 0;
    let lhpClosed = 0;
    let totalTemuan = 0;
    let totalRekomendasi = 0;
    let rekomendasiSelesai = 0;
    let rekomendasiBelumSelesai = 0;
    let totalNilaiTemuan = 0;
    let totalNilaiRekomendasi = 0;
    let totalNilaiSetor = 0;

    // Map OPD untuk breakdown
    const opdMap = new Map<
      string,
      {
        simpeg_unit_kerja_id: string;
        irban_nama: string;
        total_lhp: number;
        total_temuan: number;
        total_rekomendasi: number;
        selesai: number;
        belum_selesai: number;
        nilai_rekomendasi: number;
        nilai_setor: number;
      }
    >();

    for (const lhp of lhps) {
      if (lhp.closed_at) {
        lhpClosed++;
      } else {
        lhpOpen++;
      }

      let opdData = opdMap.get(lhp.simpeg_unit_kerja_id);
      if (!opdData) {
        opdData = {
          simpeg_unit_kerja_id: lhp.simpeg_unit_kerja_id,
          irban_nama: lhp.irban?.nama || 'Irban',
          total_lhp: 0,
          total_temuan: 0,
          total_rekomendasi: 0,
          selesai: 0,
          belum_selesai: 0,
          nilai_rekomendasi: 0,
          nilai_setor: 0,
        };
        opdMap.set(lhp.simpeg_unit_kerja_id, opdData);
      }
      opdData.total_lhp++;

      for (const temuan of lhp.temuans) {
        totalTemuan++;
        opdData.total_temuan++;
        if (temuan.nilai_temuan) {
          totalNilaiTemuan += Number(temuan.nilai_temuan);
        }

        for (const rek of temuan.rekomendasis) {
          // Filter status_rekomendasi jika spesifik diminta query
          if (
            query.status_rekomendasi_id &&
            rek.status_rekomendasi_id !== query.status_rekomendasi_id
          ) {
            continue;
          }

          totalRekomendasi++;
          opdData.total_rekomendasi++;

          const val = rek.nilai_rekomendasi ? Number(rek.nilai_rekomendasi) : 0;
          totalNilaiRekomendasi += val;
          opdData.nilai_rekomendasi += val;

          // Hitung nilai setor tindak lanjut
          let rekSetor = 0;
          for (const tl of rek.tindak_lanjuts) {
            if (tl.nilai_tindak_lanjut) {
              rekSetor += Number(tl.nilai_tindak_lanjut);
            }
          }
          totalNilaiSetor += rekSetor;
          opdData.nilai_setor += rekSetor;

          // Hitung status
          if (rek.status_rekomendasi.kategori === KategoriStatusEnum.SELESAI) {
            rekomendasiSelesai++;
            opdData.selesai++;
          } else {
            rekomendasiBelumSelesai++;
            opdData.belum_selesai++;
          }

          const existingSt = statusMap.get(rek.status_rekomendasi_id);
          if (existingSt) {
            existingSt.count++;
          } else {
            statusMap.set(rek.status_rekomendasi_id, {
              status_id: rek.status_rekomendasi_id,
              nama: rek.status_rekomendasi.nama,
              kategori: rek.status_rekomendasi.kategori,
              count: 1,
            });
          }
        }
      }
    }

    // Resolusi nama OPD SIMPEG
    const opdBreakdown: OpdReportSummaryItem[] = [];
    for (const [ukId, data] of opdMap.entries()) {
      const opd = await this.simpegAdapter.findUnitKerjaById(ukId);
      const namaOpd = opd?.unit_kerja || `OPD ID ${ukId}`;
      const persen =
        data.total_rekomendasi > 0
          ? Math.round((data.selesai / data.total_rekomendasi) * 10000) / 100
          : 0;

      opdBreakdown.push({
        simpeg_unit_kerja_id: ukId,
        nama_opd: namaOpd,
        irban_nama: data.irban_nama,
        total_lhp: data.total_lhp,
        total_temuan: data.total_temuan,
        total_rekomendasi: data.total_rekomendasi,
        selesai: data.selesai,
        belum_selesai: data.belum_selesai,
        persen_selesai: persen,
        nilai_rekomendasi: data.nilai_rekomendasi,
        nilai_setor: data.nilai_setor,
        sisa_rekomendasi: Math.max(
          0,
          data.nilai_rekomendasi - data.nilai_setor,
        ),
      });
    }

    // Urutkan OPD berdasarkan belum_selesai terbanyak
    opdBreakdown.sort((a, b) => b.belum_selesai - a.belum_selesai);

    const persentaseSelesai =
      totalRekomendasi > 0
        ? Math.round((rekomendasiSelesai / totalRekomendasi) * 10000) / 100
        : 0;

    const persentaseKeuangan =
      totalNilaiRekomendasi > 0
        ? Math.round((totalNilaiSetor / totalNilaiRekomendasi) * 10000) / 100
        : 0;

    return {
      tahun: targetYear,
      filter_applied: {
        irban_id: effectiveIrbanId,
        simpeg_unit_kerja_id: query.simpeg_unit_kerja_id,
        jenis_pemeriksaan_id: query.jenis_pemeriksaan_id,
        status_rekomendasi_id: query.status_rekomendasi_id,
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
        total_nilai_temuan: totalNilaiTemuan,
        total_nilai_rekomendasi: totalNilaiRekomendasi,
        total_nilai_setor: totalNilaiSetor,
        sisa_nilai_rekomendasi: Math.max(
          0,
          totalNilaiRekomendasi - totalNilaiSetor,
        ),
        persentase_keuangan_selesai: persentaseKeuangan,
      },
      status_breakdown: Array.from(statusMap.values()),
      opd_breakdown: opdBreakdown,
    };
  }

  /**
   * Export Excel (format CSV dengan UTF-8 BOM untuk kompatibilitas native MS Excel)
   */
  async exportExcel(
    query: ReportQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const report = await this.getSummaryReport(query, currentUser);

    const lines: string[] = [];

    // Header Laporan
    lines.push(
      `"LAPORAN REKAPITULASI HASIL PENGAWASAN DAN TINDAK LANJUT LHP TAHUN ${report.tahun}"`,
    );
    lines.push(`"INSPEKTORAT DAERAH KABUPATEN KONAWE SELATAN"`);
    lines.push('');

    // Ringkasan Eksekutif
    lines.push('"RINGKASAN INDIKATOR KINERJA"');
    lines.push(
      `"Total LHP",${report.metrics.total_lhp},"LHP Terbuka",${report.metrics.lhp_open},"LHP Ditutup",${report.metrics.lhp_closed}`,
    );
    lines.push(
      `"Total Temuan",${report.metrics.total_temuan},"Total Rekomendasi",${report.metrics.total_rekomendasi}`,
    );
    lines.push(
      `"Rekomendasi Selesai",${report.metrics.rekomendasi_selesai},"Rekomendasi Belum Selesai",${report.metrics.rekomendasi_belum_selesai},"Persentase Penyelesaian (%)",${report.metrics.persentase_selesai}%`,
    );
    lines.push(
      `"Total Nilai Rekomendasi (Rp)",${report.metrics.total_nilai_rekomendasi},"Total Nilai Setor (Rp)",${report.metrics.total_nilai_setor},"Sisa Kewajiban (Rp)",${report.metrics.sisa_nilai_rekomendasi}`,
    );
    lines.push('');

    // Breakdown per Status
    lines.push('"RINCIAN REKOMENDASI BERDASARKAN STATUS"');
    lines.push('"Status Rekomendasi","Kategori","Jumlah"');
    for (const sb of report.status_breakdown) {
      lines.push(`"${sb.nama}","${sb.kategori}",${sb.count}`);
    }
    lines.push('');

    // Tabel Rekapitulasi per OPD
    lines.push('"REKAPITULASI TINDAK LANJUT PER PERANGKAT DAERAH (OPD)"');
    lines.push(
      '"No","Perangkat Daerah (OPD)","Wilayah Irban","Total LHP","Temuan","Rekomendasi","Selesai","Belum Selesai","Progress (%)","Nilai Rekomendasi (Rp)","Nilai Setor (Rp)","Sisa (Rp)"',
    );

    report.opd_breakdown.forEach((opd, idx) => {
      lines.push(
        `${idx + 1},"${opd.nama_opd}","${opd.irban_nama}",${opd.total_lhp},${opd.total_temuan},${opd.total_rekomendasi},${opd.selesai},${opd.belum_selesai},${opd.persen_selesai}%,${opd.nilai_rekomendasi},${opd.nilai_setor},${opd.sisa_rekomendasi}`,
      );
    });

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel mengenali encoding UTF-8 dengan benar
    const bom = '\uFEFF';
    const csvContent = bom + lines.join('\r\n');
    const buffer = Buffer.from(csvContent, 'utf-8');

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'EXPORT_REPORT_EXCEL',
      entity: 'Report',
      metadata: {
        tahun: report.tahun,
        records_count: report.opd_breakdown.length,
      },
    });

    return {
      buffer,
      filename: `Laporan_Rekap_SIPATUH_${report.tahun}_${Date.now()}.csv`,
    };
  }

  /**
   * Export Dokumen Resmi PDF Rekapitulasi Eksekutif
   */
  async exportPdf(
    query: ReportQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const report = await this.getSummaryReport(query, currentUser);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          compress: false,
          margins: { top: 35, bottom: 35, left: 40, right: 40 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        // Kop Laporan
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('PEMERINTAH KABUPATEN KONAWE SELATAN', { align: 'center' });
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .text('INSPEKTORAT DAERAH', { align: 'center' });
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            `LAPORAN REKAPITULASI HASIL PENGAWASAN DAN TINDAK LANJUT HASIL PEMERIKSAAN TAHUN ${report.tahun}`,
            { align: 'center' },
          );
        doc.moveDown(0.5);

        // Garis batas
        const currentY = doc.y;
        doc.moveTo(40, currentY).lineTo(800, currentY).lineWidth(1.5).stroke();
        doc.y = currentY + 12;

        // KPI Ringkasan
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(
          `TOTAL LHP: ${report.metrics.total_lhp} (Open: ${report.metrics.lhp_open}, Closed: ${report.metrics.lhp_closed})  |  ` +
            `TOTAL REKOMENDASI: ${report.metrics.total_rekomendasi} (Selesai: ${report.metrics.rekomendasi_selesai}, Belum: ${report.metrics.rekomendasi_belum_selesai})  |  ` +
            `PERSENTASE PENYELESAIAN: ${report.metrics.persentase_selesai}%`,
          40,
          doc.y,
        );
        doc.moveDown(0.4);

        const formatRupiah = (val: number) =>
          new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(val);

        doc.text(
          `TOTAL NILAI REKOMENDASI: ${formatRupiah(report.metrics.total_nilai_rekomendasi)}  |  ` +
            `TOTAL SETORAN: ${formatRupiah(report.metrics.total_nilai_setor)}  |  ` +
            `SISA KEWAJIBAN: ${formatRupiah(report.metrics.sisa_nilai_rekomendasi)}`,
          40,
          doc.y,
        );
        doc.moveDown(0.8);

        // Tabel Rekapitulasi per OPD
        const tableX = 40;
        let tableY = doc.y;

        doc.rect(tableX, tableY, 760, 20).fillAndStroke('#e9ecef', '#495057');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);

        doc.text('No', tableX + 3, tableY + 5, { width: 22, align: 'center' });
        doc.text('Perangkat Daerah (OPD)', tableX + 30, tableY + 5, {
          width: 210,
        });
        doc.text('Irban', tableX + 245, tableY + 5, { width: 70 });
        doc.text('LHP', tableX + 320, tableY + 5, {
          width: 35,
          align: 'center',
        });
        doc.text('Rekom', tableX + 360, tableY + 5, {
          width: 40,
          align: 'center',
        });
        doc.text('Selesai', tableX + 405, tableY + 5, {
          width: 40,
          align: 'center',
        });
        doc.text('Belum', tableX + 450, tableY + 5, {
          width: 40,
          align: 'center',
        });
        doc.text('%', tableX + 495, tableY + 5, { width: 35, align: 'center' });
        doc.text('Rekomendasi (Rp)', tableX + 535, tableY + 5, {
          width: 105,
          align: 'right',
        });
        doc.text('Sisa (Rp)', tableX + 645, tableY + 5, {
          width: 110,
          align: 'right',
        });

        tableY += 20;

        report.opd_breakdown.forEach((opd, idx) => {
          if (tableY > 530) {
            doc.addPage();
            tableY = 40;
          }

          doc.rect(tableX, tableY, 760, 18).stroke('#ced4da');
          doc.font('Helvetica').fontSize(7.5);

          doc.text(String(idx + 1), tableX + 3, tableY + 4, {
            width: 22,
            align: 'center',
          });
          doc.text(opd.nama_opd, tableX + 30, tableY + 4, {
            width: 210,
            ellipsis: true,
          });
          doc.text(opd.irban_nama, tableX + 245, tableY + 4, { width: 70 });
          doc.text(String(opd.total_lhp), tableX + 320, tableY + 4, {
            width: 35,
            align: 'center',
          });
          doc.text(String(opd.total_rekomendasi), tableX + 360, tableY + 4, {
            width: 40,
            align: 'center',
          });
          doc.text(String(opd.selesai), tableX + 405, tableY + 4, {
            width: 40,
            align: 'center',
          });
          doc.text(String(opd.belum_selesai), tableX + 450, tableY + 4, {
            width: 40,
            align: 'center',
          });
          doc.text(`${opd.persen_selesai}%`, tableX + 495, tableY + 4, {
            width: 35,
            align: 'center',
          });
          doc.text(
            formatRupiah(opd.nilai_rekomendasi),
            tableX + 535,
            tableY + 4,
            { width: 105, align: 'right' },
          );
          doc.text(
            formatRupiah(opd.sisa_rekomendasi),
            tableX + 645,
            tableY + 4,
            { width: 110, align: 'right' },
          );

          tableY += 18;
        });

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    await this.auditService.log({
      actor_id: currentUser.id,
      actor_role: currentUser.role,
      action: 'EXPORT_REPORT_PDF',
      entity: 'Report',
      metadata: {
        tahun: report.tahun,
        records_count: report.opd_breakdown.length,
      },
    });

    return {
      buffer,
      filename: `Laporan_Rekap_SIPATUH_${report.tahun}_${Date.now()}.pdf`,
    };
  }
}
