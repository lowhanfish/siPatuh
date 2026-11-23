/**
 * Kontrak API Gateway Esign Konsel (TTE BSrE Kabupaten Konawe Selatan).
 * Panduan: <TTE_GATEWAY_URL>/admin/guide, Swagger: <TTE_GATEWAY_URL>/docs
 */

/** Status transaksi signing sesuai gateway. */
export type TteTransactionStatus =
  'sending' | 'succeeded' | 'failed' | 'unknown';

export interface SignTtePayload {
  /** Tepat 16 digit, dikirim sebagai teks. */
  nik: string;
  /** Diisi penandatangan per operasi; tidak pernah dicatat ke log. */
  passphrase: string;
  /** Key unik per operasi (8–128 karakter, [A-Za-z0-9._:-]). */
  idempotencyKey: string;
  pdfBuffer: Buffer;
  /** Marker 1 karakter di PDF; default TTE_SIGNATURE_TAG. */
  tag?: string;
  /** Nama berkas pada field multipart `file`. */
  filename?: string;
  /** Untuk log saja. */
  nomor?: string;
}

export interface SignTteResult {
  /** Nilai header X-Signing-Request-ID. */
  requestId: string | null;
  filename: string | null;
  signedPdfBuffer: Buffer;
}

export interface TteStatusResult {
  id: string;
  status: TteTransactionStatus;
  created_at?: string | null;
  completed_at?: string | null;
  error_code?: string | null;
  result_expires_at?: string | null;
}

export interface TteTokenResponseBody {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/** Body JSON error dari gateway (signing, status, unduhan, maupun token). */
export interface TteErrorResponseBody {
  message?: string;
  request_id?: string;
  status?: string;
  code?: string;
  retry_signing?: boolean;
  error?: string;
  error_description?: string;
}
