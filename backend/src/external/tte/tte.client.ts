import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SignTtePayload,
  SignTteResult,
  TteWrapperResponseBody,
} from '../interfaces/tte.interface';

@Injectable()
export class TteClient {
  private readonly logger = new Logger(TteClient.name);
  private readonly apiUrl?: string;
  private readonly apiToken?: string;
  private readonly timeoutMs: number;
  private readonly maxPdfBytes: number;
  private readonly signatureTag: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('TTE_API_URL');
    this.apiToken = this.configService.get<string>('TTE_API_TOKEN');
    this.timeoutMs =
      this.configService.get<number>('TTE_REQUEST_TIMEOUT_MS') || 30000;
    this.maxPdfBytes =
      this.configService.get<number>('TTE_MAX_PDF_BYTES') || 7000000;
    this.signatureTag =
      this.configService.get<string>('TTE_SIGNATURE_TAG') || '#tagTTD#';
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiToken);
  }

  /**
   * Mengirimkan dokumen ke wrapper tte_api untuk ditandatangani secara elektronik (BSrE)
   */
  async signPdf(payload: SignTtePayload): Promise<SignTteResult> {
    if (!this.apiUrl || !this.apiToken) {
      throw new BadRequestException(
        'Integrasi TTE belum aktif (TTE_API_URL atau TTE_API_TOKEN belum dikonfigurasi)',
      );
    }

    // 1. Validasi batas ukuran PDF sebelum encode base64
    if (payload.pdfBuffer.length > this.maxPdfBytes) {
      const mbLimit = (this.maxPdfBytes / (1024 * 1024)).toFixed(1);
      const actualMb = (payload.pdfBuffer.length / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `Ukuran berkas PDF (${actualMb} MB) melebihi batas maksimum pengiriman TTE (${mbLimit} MB)`,
      );
    }

    // 2. Siapkan data base64 dengan skema data URI yang diharapkan wrapper
    const base64Data = payload.pdfBuffer.toString('base64');
    const filebase64 = `data:application/pdf;base64,${base64Data}`;

    // 3. Siapkan payload request sesuai kontrak wrapper tte_api
    const requestBody = {
      judul: payload.judul,
      nomor: payload.nomor,
      passphrase: payload.passphrase,
      nik: payload.nik,
      tagTTDX: payload.tagTTDX || this.signatureTag,
      TOKEN: this.apiToken,
      filebase64,
    };

    // Masked log untuk audit debugging aman (BEBAS SECRET)
    const maskedNik =
      payload.nik.length >= 8
        ? `${payload.nik.substring(0, 4)}****${payload.nik.substring(payload.nik.length - 4)}`
        : '****';
    this.logger.log(
      `Mengirim permintaan TTE untuk surat: ${payload.nomor}, NIK: ${maskedNik}, ukuran: ${payload.pdfBuffer.length} bytes`,
    );

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Wrapper TTE mengembalikan HTTP status ${response.status}: ${errorText.substring(0, 200)}`,
        );
        throw new BadGatewayException(
          `Gagal menghubungi layanan TTE (HTTP ${response.status})`,
        );
      }

      const resJson = (await response.json()) as TteWrapperResponseBody;

      if (Number(resJson.status) !== 200 || !resJson.base64) {
        const msg =
          resJson.message ||
          'Respons TTE tidak valid atau gagal ditandatangani';
        this.logger.error(`Penandatanganan TTE gagal: ${msg}`);
        throw new BadRequestException(`Proses TTE gagal: ${msg}`);
      }

      // 4. Decode base64 signed PDF
      let cleanBase64 = resJson.base64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      const signedBuffer = Buffer.from(cleanBase64, 'base64');

      // Validasi integritas berkas PDF
      if (
        signedBuffer.length < 100 ||
        signedBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
      ) {
        throw new BadGatewayException(
          'Berkas yang dikembalikan oleh layanan TTE bukan dokumen PDF yang valid',
        );
      }

      this.logger.log(
        `Penandatanganan TTE berhasil untuk surat: ${payload.nomor}. Ukuran signed: ${signedBuffer.length} bytes`,
      );

      return {
        filename:
          resJson.filename ||
          `signed_${payload.nomor.replace(/[/\\]/g, '_')}.pdf`,
        signedPdfBuffer: signedBuffer,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      const errName = error instanceof Error ? error.name : 'UnknownError';
      const errMsg = error instanceof Error ? error.message : String(error);

      if (errName === 'TimeoutError' || errMsg.includes('timeout')) {
        this.logger.error(
          `Permintaan TTE ke ${this.apiUrl} melampaui batas waktu (${this.timeoutMs} ms)`,
        );
        throw new BadGatewayException(
          'Layanan TTE tidak merespons dalam batas waktu yang ditentukan (timeout)',
        );
      }

      this.logger.error(`Kesalahan koneksi ke wrapper TTE: ${errMsg}`);
      throw new BadGatewayException(
        'Gagal menghubungkan ke server layanan TTE. Pastikan koneksi jaringan stabil.',
      );
    }
  }
}
