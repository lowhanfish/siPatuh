export interface SignTtePayload {
  judul: string;
  nomor: string;
  passphrase: string;
  nik: string;
  tagTTDX?: string;
  pdfBuffer: Buffer;
}

export interface SignTteResult {
  filename: string;
  signedPdfBuffer: Buffer;
}

export interface TteWrapperResponseBody {
  status: number | string;
  filename?: string;
  base64?: string;
  message?: string;
}
