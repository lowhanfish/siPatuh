import { apiDownloadBlob, apiRequest } from "@/lib/api-client";
import type {
  CreateSuratPeringatanInput,
  SignTteInput,
  SpEligibilityResult,
  SuratPeringatanDetail,
  SuratPeringatanFilterParams,
  SuratPeringatanItem,
} from "../types";

export async function fetchDueLhps(
  irbanId?: string,
): Promise<SpEligibilityResult[]> {
  const query = irbanId ? `?irban_id=${encodeURIComponent(irbanId)}` : "";
  return apiRequest<SpEligibilityResult[]>(`/surat-peringatan/due${query}`, {
    method: "GET",
  });
}

export async function fetchSuratPeringatanList(
  params?: SuratPeringatanFilterParams,
): Promise<SuratPeringatanItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.lhp_id) searchParams.set("lhp_id", params.lhp_id);
  if (params?.level) searchParams.set("level", params.level);
  if (params?.irban_id) searchParams.set("irban_id", params.irban_id);
  if (params?.tahun) searchParams.set("tahun", params.tahun);

  const qs = searchParams.toString();
  const url = qs ? `/surat-peringatan?${qs}` : "/surat-peringatan";

  return apiRequest<SuratPeringatanItem[]>(url, {
    method: "GET",
  });
}

export async function fetchSuratPeringatanDetail(
  id: string,
): Promise<SuratPeringatanDetail> {
  return apiRequest<SuratPeringatanDetail>(`/surat-peringatan/${id}`, {
    method: "GET",
  });
}

export async function createSuratPeringatanRequest(
  data: CreateSuratPeringatanInput,
): Promise<SuratPeringatanItem> {
  return apiRequest<SuratPeringatanItem>("/surat-peringatan", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSuratPeringatanRequest(
  id: string,
  data: Partial<CreateSuratPeringatanInput>,
): Promise<SuratPeringatanItem> {
  return apiRequest<SuratPeringatanItem>(`/surat-peringatan/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSuratPeringatanRequest(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(
    `/surat-peringatan/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function regenerateDraftRequest(
  id: string,
): Promise<SuratPeringatanItem> {
  return apiRequest<SuratPeringatanItem>(
    `/surat-peringatan/${id}/regenerate-draft`,
    {
      method: "POST",
    },
  );
}

export async function signTteRequest(
  id: string,
  data: SignTteInput,
): Promise<SuratPeringatanItem> {
  return apiRequest<SuratPeringatanItem>(`/surat-peringatan/${id}/sign-tte`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function downloadDraftPdf(
  id: string,
  filename: string,
): Promise<void> {
  return apiDownloadBlob(`/surat-peringatan/${id}/draft`, filename);
}

export async function downloadSignedPdf(
  id: string,
  filename: string,
): Promise<void> {
  return apiDownloadBlob(`/surat-peringatan/${id}/signed`, filename);
}
