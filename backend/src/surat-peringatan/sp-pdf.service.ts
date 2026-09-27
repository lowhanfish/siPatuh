import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';

export interface SpPdfItem {
  nomor: number;
  temuan: string;
  rekomendasi: string;
  nilai: number | null;
}

export interface SpPdfRenderPayload {
  nomor_surat: string;
  tanggal_surat: Date;
  level: string;
  unit_kerja_nama: string;
  recipient_nama: string;
  recipient_nip: string;
  recipient_jabatan: string;
  nomor_lhp: string;
  tanggal_lhp: Date;
  tanggal_diterima_lhp: Date;
  konten_template?: string;
  items: SpPdfItem[];
  inspektur_nama?: string;
  inspektur_nip?: string;
}

@Injectable()
export class SpPdfGeneratorService {
  private readonly signatureTag: string;

  constructor(private readonly configService: ConfigService) {
    this.signatureTag =
      this.configService.get<string>('TTE_SIGNATURE_TAG') || '#tagTTD#';
  }

  getSignatureTag(): string {
    return this.signatureTag;
  }

  /**
   * Helper format tanggal Indonesia (contoh: 27 September 2026)
   */
  formatDateIndo(date: Date): string {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const d = new Date(date);
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  /**
   * Format nominal mata uang Rupiah
   */
  formatRupiah(amount: number | null): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '-';
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Membersihkan tag HTML dan menggantikan placeholder template
   */
  interpolateTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    // Hapus tag HTML umum seperti <p>, </p>, <strong>, </strong>, <br/>
    return result
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  /**
   * Generate unsigned PDF Buffer dengan anchor TTE
   */
  async generateDraftPdf(payload: SpPdfRenderPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          compress: false,
          margins: { top: 40, bottom: 40, left: 50, right: 50 },
          bufferPages: true,
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        // 1. KOP SURAT RESMI
        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .text('PEMERINTAH KABUPATEN KONAWE SELATAN', { align: 'center' });
        doc
          .font('Helvetica-Bold')
          .fontSize(15)
          .text('INSPEKTORAT DAERAH', { align: 'center' });
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            'Kompleks Perkantoran Pemerintah Daerah Kabupaten Konawe Selatan, Andoolo',
            { align: 'center' },
          );
        doc
          .font('Helvetica')
          .fontSize(8)
          .text(
            'Posel: inspektorat@konselkab.go.id | Laman: https://inspektorat.konawe-selatankab.go.id',
            { align: 'center' },
          );
        doc.moveDown(0.5);

        // Garis batas kop surat (Double line)
        const currentY = doc.y;
        doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(2).stroke();
        doc
          .moveTo(50, currentY + 3)
          .lineTo(545, currentY + 3)
          .lineWidth(0.5)
          .stroke();
        doc.y = currentY + 15;

        // 2. TANGGAL SURAT (Kanan atas)
        const tglSuratStr = `Andoolo, ${this.formatDateIndo(payload.tanggal_surat)}`;
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(tglSuratStr, 350, doc.y, { align: 'right', width: 195 });
        doc.moveDown(1);

        // 3. NOMOR & HAL SURAT (Kiri)
        const leftColX = 50;
        const startMetaY = doc.y;

        doc.font('Helvetica').fontSize(10);
        doc.text('Nomor', leftColX, startMetaY);
        doc.text(`: ${payload.nomor_surat}`, leftColX + 60, startMetaY);

        doc.text('Sifat', leftColX, startMetaY + 15);
        doc.text(': Penting / Rahasia', leftColX + 60, startMetaY + 15);

        doc.text('Lampiran', leftColX, startMetaY + 30);
        doc.text(': 1 (satu) Berkas', leftColX + 60, startMetaY + 30);

        doc.text('Perihal', leftColX, startMetaY + 45);
        const halJudul = `Surat Peringatan ${payload.level} atas Tindak Lanjut LHP`;
        doc
          .font('Helvetica-Bold')
          .text(`: ${halJudul}`, leftColX + 60, startMetaY + 45, {
            width: 250,
          });

        // 4. TUJUAN SURAT
        doc.y = startMetaY + 80;
        doc.font('Helvetica').fontSize(10);
        doc.text('Kepada Yth.', leftColX);
        doc
          .font('Helvetica-Bold')
          .text(`${payload.recipient_jabatan}`, leftColX);
        doc.text(`${payload.unit_kerja_nama}`, leftColX);
        doc.font('Helvetica').text('di -', leftColX);
        doc.text('      Tempat', leftColX);
        doc.moveDown(1.5);

        // 5. ISI SURAT (TEMPLATE NARASI)
        const tglLhpStr = this.formatDateIndo(payload.tanggal_lhp);
        const tglDiterimaStr = this.formatDateIndo(
          payload.tanggal_diterima_lhp,
        );

        const defaultNarasi =
          `Sehubungan dengan Laporan Hasil Pemeriksaan (LHP) Inspektorat Daerah Kabupaten Konawe Selatan Nomor: ` +
          `${payload.nomor_lhp} tanggal ${tglLhpStr} yang telah diterima pada tanggal ${tglDiterimaStr}, ` +
          `dengan ini disampaikan bahwa berdasarkan pemantauan dan evaluasi sampai saat ini, masih terdapat ` +
          `temuan dan rekomendasi yang belum ditindaklanjuti/diselesaikan sebagaimana mestinya.`;

        let bodyText = defaultNarasi;
        if (payload.konten_template) {
          bodyText = this.interpolateTemplate(payload.konten_template, {
            nomor_lhp: payload.nomor_lhp,
            tanggal_lhp: tglLhpStr,
            tanggal_diterima_lhp: tglDiterimaStr,
            nama_opd: payload.unit_kerja_nama,
            nomor_surat: payload.nomor_surat,
            level: payload.level,
          });
        }

        doc.font('Helvetica').fontSize(10).text(bodyText, 50, doc.y, {
          align: 'justify',
          lineGap: 3,
          width: 495,
        });
        doc.moveDown(1);

        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            'Adapun rincian rekomendasi hasil pemeriksaan yang masih belum diselesaikan adalah sebagai berikut:',
            { width: 495, lineGap: 2 },
          );
        doc.moveDown(0.8);

        // 6. TABEL REKOMENDASI OUTSTANDING
        const tableX = 50;
        let tableY = doc.y;

        // Header Tabel
        doc.rect(tableX, tableY, 495, 20).fillAndStroke('#e9ecef', '#495057');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text('No', tableX + 5, tableY + 5, { width: 25, align: 'center' });
        doc.text('Temuan & Rekomendasi', tableX + 35, tableY + 5, {
          width: 320,
        });
        doc.text('Nilai Rekomendasi', tableX + 365, tableY + 5, {
          width: 120,
          align: 'right',
        });

        tableY += 20;

        let totalNilai = 0;
        payload.items.forEach((item, index) => {
          if (item.nilai) {
            totalNilai += Number(item.nilai);
          }

          // Cek jika butuh halaman baru
          if (tableY > 700) {
            doc.addPage();
            tableY = 50;
          }

          const descText = `${item.temuan}\n-> ${item.rekomendasi}`;
          doc.font('Helvetica').fontSize(8.5);
          const textHeight = Math.max(
            doc.heightOfString(descText, { width: 320 }),
            22,
          );

          // Baris tabel
          doc.rect(tableX, tableY, 495, textHeight + 8).stroke('#ced4da');
          doc.font('Helvetica').fontSize(8.5);
          doc.text(String(index + 1), tableX + 5, tableY + 4, {
            width: 25,
            align: 'center',
          });
          doc.text(descText, tableX + 35, tableY + 4, {
            width: 320,
            lineGap: 2,
          });
          doc.text(this.formatRupiah(item.nilai), tableX + 365, tableY + 4, {
            width: 120,
            align: 'right',
          });

          tableY += textHeight + 8;
        });

        // Baris Total
        if (totalNilai > 0) {
          if (tableY > 720) {
            doc.addPage();
            tableY = 50;
          }
          doc.rect(tableX, tableY, 495, 20).fillAndStroke('#f8f9fa', '#ced4da');
          doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
          doc.text('TOTAL REKOMENDASI OUTSTANDING', tableX + 35, tableY + 5, {
            width: 320,
          });
          doc.text(this.formatRupiah(totalNilai), tableX + 365, tableY + 5, {
            width: 120,
            align: 'right',
          });
          tableY += 20;
        }

        doc.y = tableY + 15;

        // 7. PENUTUP
        if (doc.y > 660) {
          doc.addPage();
        }

        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            'Sehubungan dengan hal tersebut di atas, ditegaskan kepada Saudara untuk segera ' +
              'menyelesaikan seluruh rekomendasi dimaksud dan menyampaikan dokumen bukti tindak lanjut ' +
              'kepada Inspektorat Daerah Kabupaten Konawe Selatan.',
            { align: 'justify', lineGap: 3, width: 495 },
          );
        doc.moveDown(0.5);
        doc
          .font('Helvetica')
          .fontSize(10)
          .text(
            'Demikian surat peringatan ini disampaikan untuk mendapat perhatian sungguh-sungguh ' +
              'dan dilaksanakan sebagaimana mestinya.',
            { align: 'justify', lineGap: 3, width: 495 },
          );
        doc.moveDown(1.5);

        // 8. TANDA TANGAN DENGAN ANCHOR TTE
        if (doc.y > 640) {
          doc.addPage();
        }

        const signX = 320;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('INSPEKTUR DAERAH', signX, doc.y, {
            align: 'center',
            width: 220,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('KABUPATEN KONAWE SELATAN', signX, doc.y, {
            align: 'center',
            width: 220,
          });
        doc.moveDown(1);

        // SISIPKAN ANCHOR/TAG TTE DARI CONFIG (misal #tagTTD#)
        // Diletakkan dengan spasi vertikal agar visual stamp TTE menutup tag ini
        const anchorY = doc.y;
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#212529')
          .text(this.signatureTag, signX, anchorY + 15, {
            align: 'center',
            width: 220,
          });

        doc.y = anchorY + 55;
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#000000')
          .text(payload.inspektur_nama || 'Inspektur Daerah', signX, doc.y, {
            align: 'center',
            width: 220,
          });
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            payload.inspektur_nip ? `NIP. ${payload.inspektur_nip}` : '',
            signX,
            doc.y,
            { align: 'center', width: 220 },
          );

        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
}
