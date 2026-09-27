import { apiRequest } from "@/lib/api-client";
import type {
  CreateJenisPemeriksaanInput,
  CreateStatusRekomendasiInput,
  CreateSuratTemplateInput,
  JenisPemeriksaan,
  StatusRekomendasi,
  SuratTemplate,
  UpdateJenisPemeriksaanInput,
  UpdateStatusRekomendasiInput,
  UpdateSuratTemplateInput,
} from "@/features/master-data/types";

type ApiResponseWrapper<T> = T | { data: T; success?: boolean };

function unwrapResponse<T>(res: ApiResponseWrapper<T>): T {
  if (res && typeof res === "object" && "data" in res && (res as { data: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

// ==========================================
// 1. JENIS PEMERIKSAAN
// ==========================================

export async function getJenisPemeriksaanList(activeOnly = false): Promise<JenisPemeriksaan[]> {
  const query = activeOnly ? "?active_only=true" : "";
  const res = await apiRequest<ApiResponseWrapper<JenisPemeriksaan[]>>(
    `/master-data/jenis-pemeriksaan${query}`,
  );
  return unwrapResponse(res);
}

export async function createJenisPemeriksaan(
  input: CreateJenisPemeriksaanInput,
): Promise<JenisPemeriksaan> {
  const res = await apiRequest<ApiResponseWrapper<JenisPemeriksaan>>(
    "/master-data/jenis-pemeriksaan",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

export async function updateJenisPemeriksaan(
  id: string,
  input: UpdateJenisPemeriksaanInput,
): Promise<JenisPemeriksaan> {
  const res = await apiRequest<ApiResponseWrapper<JenisPemeriksaan>>(
    `/master-data/jenis-pemeriksaan/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

// ==========================================
// 2. STATUS REKOMENDASI
// ==========================================

export async function getStatusRekomendasiList(activeOnly = false): Promise<StatusRekomendasi[]> {
  const query = activeOnly ? "?active_only=true" : "";
  const res = await apiRequest<ApiResponseWrapper<StatusRekomendasi[]>>(
    `/master-data/status-rekomendasi${query}`,
  );
  return unwrapResponse(res);
}

export async function createStatusRekomendasi(
  input: CreateStatusRekomendasiInput,
): Promise<StatusRekomendasi> {
  const res = await apiRequest<ApiResponseWrapper<StatusRekomendasi>>(
    "/master-data/status-rekomendasi",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

export async function updateStatusRekomendasi(
  id: string,
  input: UpdateStatusRekomendasiInput,
): Promise<StatusRekomendasi> {
  const res = await apiRequest<ApiResponseWrapper<StatusRekomendasi>>(
    `/master-data/status-rekomendasi/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

// ==========================================
// 3. SURAT TEMPLATE (VERSIONED)
// ==========================================

export async function getSuratTemplates(jenisSurat?: string): Promise<SuratTemplate[]> {
  const query = jenisSurat && jenisSurat !== "ALL" ? `?jenis_surat=${encodeURIComponent(jenisSurat)}` : "";
  const res = await apiRequest<ApiResponseWrapper<SuratTemplate[]>>(
    `/master-data/surat-templates${query}`,
  );
  return unwrapResponse(res);
}

export async function createSuratTemplate(
  input: CreateSuratTemplateInput,
): Promise<SuratTemplate> {
  const res = await apiRequest<ApiResponseWrapper<SuratTemplate>>(
    "/master-data/surat-templates",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

export async function updateSuratTemplate(
  id: string,
  input: UpdateSuratTemplateInput,
): Promise<SuratTemplate> {
  const res = await apiRequest<ApiResponseWrapper<SuratTemplate>>(
    `/master-data/surat-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}
