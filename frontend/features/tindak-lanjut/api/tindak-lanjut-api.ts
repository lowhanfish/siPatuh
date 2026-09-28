import { apiDownloadBlob, apiRequest } from "@/lib/api-client";
import type {
  FinancialSummary,
  TindakLanjutItem,
  VerifikasiItem,
} from "../types";

export async function fetchTindakLanjutList(
  rekomendasiId: string,
): Promise<TindakLanjutItem[]> {
  return apiRequest<TindakLanjutItem[]>(
    `/rekomendasi/${rekomendasiId}/tindak-lanjut`,
    { method: "GET" },
  );
}

export async function fetchFinancialSummary(
  rekomendasiId: string,
): Promise<FinancialSummary> {
  return apiRequest<FinancialSummary>(
    `/rekomendasi/${rekomendasiId}/financial-summary`,
    { method: "GET" },
  );
}

export async function createTindakLanjutRequest(
  rekomendasiId: string,
  formData: FormData,
): Promise<TindakLanjutItem> {
  return apiRequest<TindakLanjutItem>(
    `/rekomendasi/${rekomendasiId}/tindak-lanjut`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function createVerifikasiRequest(
  tindakLanjutId: string,
  formData: FormData,
): Promise<VerifikasiItem> {
  return apiRequest<VerifikasiItem>(
    `/tindak-lanjut/${tindakLanjutId}/verifikasi`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function downloadTlAttachment(
  tindakLanjutId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  return apiDownloadBlob(
    `/tindak-lanjut/${tindakLanjutId}/files/${attachmentId}`,
    filename,
  );
}

export async function downloadVerifikasiAttachment(
  verifikasiId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  return apiDownloadBlob(
    `/verifikasi/${verifikasiId}/files/${attachmentId}`,
    filename,
  );
}
