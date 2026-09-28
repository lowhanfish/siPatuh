import { apiDownloadBlob, apiRequest } from "@/lib/api-client";
import type { ReportFilterParams, ReportSummaryResponse } from "../types";

function buildQueryString(params?: ReportFilterParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.tahun) sp.set("tahun", params.tahun);
  if (params.irban_id) sp.set("irban_id", params.irban_id);
  if (params.simpeg_unit_kerja_id)
    sp.set("simpeg_unit_kerja_id", params.simpeg_unit_kerja_id);
  if (params.jenis_pemeriksaan_id)
    sp.set("jenis_pemeriksaan_id", params.jenis_pemeriksaan_id);
  if (params.status_rekomendasi_id)
    sp.set("status_rekomendasi_id", params.status_rekomendasi_id);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchSummaryReport(
  params?: ReportFilterParams,
): Promise<ReportSummaryResponse> {
  const qs = buildQueryString(params);
  return apiRequest<ReportSummaryResponse>(`/reports/summary${qs}`, {
    method: "GET",
  });
}

export async function exportReportExcel(
  params?: ReportFilterParams,
): Promise<void> {
  const qs = buildQueryString(params);
  const yr = params?.tahun || new Date().getFullYear();
  const filename = `Laporan_Pengawasan_SIPATUH_${yr}_${Date.now()}.csv`;
  return apiDownloadBlob(`/reports/export/excel${qs}`, filename);
}

export async function exportReportPdf(
  params?: ReportFilterParams,
): Promise<void> {
  const qs = buildQueryString(params);
  const yr = params?.tahun || new Date().getFullYear();
  const filename = `Laporan_Pengawasan_SIPATUH_${yr}_${Date.now()}.pdf`;
  return apiDownloadBlob(`/reports/export/pdf${qs}`, filename);
}
