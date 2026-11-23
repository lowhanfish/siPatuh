import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SignTtePayload,
  SignTteResult,
  TteErrorResponseBody,
  TteStatusResult,
  TteTokenResponseBody,
  TteTransactionStatus,
} from '../interfaces/tte.interface';

const TX_STATUSES: readonly TteTransactionStatus[] = [
  'sending',
  'succeeded',
  'failed',
  'unknown',
];

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const NIK_PATTERN = /^\d{16}$/;
/** Jarak aman sebelum token kedaluwarsa agar tidak dipakai di detik terakhir. */
const TOKEN_EXPIRY_MARGIN_MS = 30_000;

/**
 * Kesalahan dari gateway TTE. Tidak pernah memuat token, secret, atau passphrase.
 *
 * - `httpStatus` null berarti respons tidak diterima (timeout / koneksi putus),
 *   sehingga hasil penandatanganan belum pasti.
 * - `txStatus` adalah status transaksi gateway bila tersedia.
 */
export class TteGatewayError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null,
    readonly details: {
      code?: string | null;
      requestId?: string | null;
      txStatus?: TteTransactionStatus | null;
      retrySigning?: boolean | null;
      retryAfterSeconds?: number | null;
    } = {},
  ) {
    super(message);
    this.name = 'TteGatewayError';
  }

  /** Timeout / koneksi putus: transaksi mungkin sudah diproses gateway. */
  get isTransportFailure(): boolean {
    return this.httpStatus === null;
  }
}

/** Kesalahan konfigurasi atau input lokal; tidak ada request yang dikirim. */
export class TteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TteConfigError';
  }
}

@Injectable()
export class TteClient {
  private readonly logger = new Logger(TteClient.name);
  private readonly baseUrl?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly scope?: string;
  private readonly origin?: string;
  private readonly timeoutMs: number;
  private readonly maxPdfBytes: number;
  private readonly signatureTag: string;

  private cachedToken: { value: string; expiresAt: number } | null = null;
  private pendingToken: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {
    const rawUrl = this.configService.get<string>('TTE_GATEWAY_URL')?.trim();
    this.baseUrl = rawUrl ? rawUrl.replace(/\/+$/, '') : undefined;
    this.clientId =
      this.configService.get<string>('TTE_CLIENT_ID')?.trim() || undefined;
    this.clientSecret =
      this.configService.get<string>('TTE_CLIENT_SECRET')?.trim() || undefined;
    this.scope =
      this.configService.get<string>('TTE_SCOPE')?.trim() || undefined;
    this.origin =
      this.configService.get<string>('TTE_ORIGIN')?.trim() || undefined;
    this.timeoutMs =
      Number(this.configService.get<number>('TTE_REQUEST_TIMEOUT_MS')) ||
      90_000;
    this.maxPdfBytes =
      Number(this.configService.get<number>('TTE_MAX_PDF_BYTES')) ||
      25 * 1024 * 1024;
    this.signatureTag =
      this.configService.get<string>('TTE_SIGNATURE_TAG') || '$';
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.clientId && this.clientSecret);
  }

  getSignatureTag(): string {
    return this.signatureTag;
  }

  /**
   * POST /api/v1/signkonsel — kirim PDF untuk ditandatangani.
   * Sukses: PDF biner + header X-Signing-Request-ID.
   */
  async signPdf(payload: SignTtePayload): Promise<SignTteResult> {
    this.assertConfigured();

    const tag = payload.tag ?? this.signatureTag;
    const tagCode = tag.codePointAt(0) ?? 0;
    if (
      [...tag].length !== 1 ||
      /\s/.test(tag) ||
      tagCode < 0x20 ||
      tagCode === 0x7f
    ) {
      throw new TteConfigError(
        'Tag koordinat TTE harus tepat 1 karakter terlihat (cek TTE_SIGNATURE_TAG)',
      );
    }
    if (!NIK_PATTERN.test(payload.nik)) {
      throw new TteConfigError('NIK penandatangan harus tepat 16 digit angka');
    }
    if (!payload.passphrase || payload.passphrase.length > 256) {
      throw new TteConfigError(
        'Passphrase penandatangan wajib diisi (maksimal 256 karakter)',
      );
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(payload.idempotencyKey)) {
      throw new TteConfigError('Idempotency-Key TTE tidak valid');
    }
    if (payload.pdfBuffer.length > this.maxPdfBytes) {
      const mbLimit = (this.maxPdfBytes / (1024 * 1024)).toFixed(1);
      const actualMb = (payload.pdfBuffer.length / (1024 * 1024)).toFixed(1);
      throw new TteConfigError(
        `Ukuran berkas PDF (${actualMb} MB) melebihi batas maksimum TTE (${mbLimit} MB)`,
      );
    }

    const maskedNik = `${payload.nik.substring(0, 4)}****${payload.nik.substring(12)}`;
    this.logger.log(
      `Mengirim permintaan TTE untuk surat: ${payload.nomor ?? '-'}, NIK: ${maskedNik}, ukuran: ${payload.pdfBuffer.length} bytes`,
    );

    const response = await this.authorizedFetch('/api/v1/signkonsel', () => {
      // Tepat 4 field wajib; jangan menambah field lain.
      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(payload.pdfBuffer)], {
          type: 'application/pdf',
        }),
        payload.filename || 'dokumen.pdf',
      );
      form.append('nik', payload.nik);
      form.append('passphrase', payload.passphrase);
      form.append('tag_koordinat', tag);
      return {
        method: 'POST',
        headers: { 'Idempotency-Key': payload.idempotencyKey },
        body: form,
      };
    });

    const requestId = response.headers.get('X-Signing-Request-ID');
    const signedPdfBuffer = await this.readPdfResponse(response, requestId);

    this.logger.log(
      `Penandatanganan TTE berhasil untuk surat: ${payload.nomor ?? '-'} (request_id: ${requestId ?? '-'}, ${signedPdfBuffer.length} bytes)`,
    );

    return {
      requestId,
      filename: this.parseFilename(response.headers.get('Content-Disposition')),
      signedPdfBuffer,
    };
  }

  /** GET /api/v1/signkonsel/{request_id} — status transaksi. */
  async getStatus(requestId: string): Promise<TteStatusResult> {
    this.assertConfigured();
    const response = await this.authorizedFetch(
      `/api/v1/signkonsel/${encodeURIComponent(requestId)}`,
      () => ({ method: 'GET', headers: { Accept: 'application/json' } }),
    );
    if (!response.ok) {
      throw await this.toGatewayError(response);
    }
    const body = (await response.json()) as TteStatusResult;
    if (!body || !TX_STATUSES.includes(body.status)) {
      throw new TteGatewayError(
        'Respons status dari gateway TTE tidak dikenali',
        response.status,
        { requestId },
      );
    }
    return body;
  }

  /** GET /api/v1/signkonsel/{request_id}/document — unduh ulang PDF hasil. */
  async downloadDocument(requestId: string): Promise<Buffer> {
    this.assertConfigured();
    const response = await this.authorizedFetch(
      `/api/v1/signkonsel/${encodeURIComponent(requestId)}/document`,
      () => ({ method: 'GET', headers: { Accept: 'application/pdf' } }),
    );
    return this.readPdfResponse(response, requestId);
  }

  // ---------------------------------------------------------------------------

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new TteConfigError(
        'Integrasi TTE belum aktif (TTE_GATEWAY_URL, TTE_CLIENT_ID, atau TTE_CLIENT_SECRET belum dikonfigurasi)',
      );
    }
  }

  /**
   * Fetch dengan Bearer token. Jika gateway membalas 401 (token kedaluwarsa
   * atau dicabut), token dibuang dan request diulang sekali. Aman untuk signing
   * karena 401 ditolak sebelum transaksi dibuat dan Idempotency-Key tetap sama.
   */
  private async authorizedFetch(
    path: string,
    buildInit: () => RequestInit,
  ): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getAccessToken();
      const init = buildInit();
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${token}`);
      if (this.origin) headers.set('Origin', this.origin);

      const response = await this.send(`${this.baseUrl}${path}`, {
        ...init,
        headers,
      });

      if (response.status === 401 && attempt === 0) {
        this.cachedToken = null;
        await response.body?.cancel().catch(() => undefined);
        continue;
      }
      return response;
    }
    // Tidak tercapai: loop selalu mengembalikan respons pada percobaan kedua.
    throw new TteGatewayError('Gagal mengautentikasi ke gateway TTE', 401);
  }

  /** Access token di-cache sampai mendekati expires_in; tidak ada refresh token. */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }
    if (!this.pendingToken) {
      this.pendingToken = this.requestAccessToken().finally(() => {
        this.pendingToken = null;
      });
    }
    return this.pendingToken;
  }

  private async requestAccessToken(): Promise<string> {
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    if (this.scope) body.set('scope', this.scope);

    const basic = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
      'utf8',
    ).toString('base64');
    const headers: Record<string, string> = {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };
    if (this.origin) headers.Origin = this.origin;

    const response = await this.send(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await this.toGatewayError(response);
      this.logger.error(
        `Penerbitan access token TTE gagal (HTTP ${response.status}): ${error.message}`,
      );
      throw error;
    }

    const json = (await response.json()) as TteTokenResponseBody;
    if (!json.access_token) {
      throw new TteGatewayError(
        'Gateway TTE tidak mengembalikan access token',
        response.status,
      );
    }
    const expiresInMs = Math.max(Number(json.expires_in) || 0, 0) * 1000;
    this.cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + Math.max(expiresInMs - TOKEN_EXPIRY_MARGIN_MS, 0),
    };
    return json.access_token;
  }

  private async send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const isTimeout = name === 'TimeoutError' || name === 'AbortError';
      this.logger.error(
        isTimeout
          ? `Permintaan ke gateway TTE melampaui batas waktu (${this.timeoutMs} ms)`
          : `Kesalahan koneksi ke gateway TTE: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new TteGatewayError(
        isTimeout
          ? 'Gateway TTE tidak merespons dalam batas waktu (timeout)'
          : 'Gagal terhubung ke gateway TTE',
        null,
      );
    }
  }

  private async readPdfResponse(
    response: Response,
    requestId: string | null,
  ): Promise<Buffer> {
    const contentType = (response.headers.get('Content-Type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (response.status !== 200 || contentType !== 'application/pdf') {
      throw await this.toGatewayError(response, requestId);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (
      buffer.length < 100 ||
      buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new TteGatewayError(
        'Berkas dari gateway TTE bukan dokumen PDF yang valid',
        response.status,
        { requestId },
      );
    }
    return buffer;
  }

  private async toGatewayError(
    response: Response,
    fallbackRequestId: string | null = null,
  ): Promise<TteGatewayError> {
    let body: TteErrorResponseBody = {};
    try {
      const text = await response.text();
      const parsed: unknown = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed;
      }
    } catch {
      // Bukan JSON (mis. HTML dari proxy); pakai pesan umum.
    }

    const txStatus = TX_STATUSES.includes(body.status as TteTransactionStatus)
      ? (body.status as TteTransactionStatus)
      : null;
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : NaN;

    return new TteGatewayError(
      body.message ||
        body.error_description ||
        `Gateway TTE mengembalikan HTTP ${response.status}`,
      response.status,
      {
        code: body.code ?? body.error ?? null,
        requestId:
          body.request_id ??
          response.headers.get('X-Signing-Request-ID') ??
          fallbackRequestId,
        txStatus,
        retrySigning:
          typeof body.retry_signing === 'boolean' ? body.retry_signing : null,
        retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null,
      },
    );
  }

  private parseFilename(disposition: string | null): string | null {
    if (!disposition) return null;
    const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
    if (star) {
      try {
        return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
      } catch {
        // abaikan, coba bentuk biasa
      }
    }
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1].trim() : null;
  }
}
