import { apiDownloadBlob, apiRequest } from "@/lib/api-client";
import type {
  LhpDetail,
  LhpFilter,
  LhpListResponse,
  ReopenLhpInput,
  UpdateLhpInput,
} from "../types";

export async function fetchLhpList(filter: LhpFilter = {}): Promise<LhpListResponse> {
  const params = new URLSearchParams();

  if (filter.tahun !== undefined) {
    params.set("tahun", String(filter.tahun));
  }
  if (filter.irban_id) {
    params.set("irban_id", filter.irban_id);
  }
  if (filter.jenis_pemeriksaan_id) {
    params.set("jenis_pemeriksaan_id", filter.jenis_pemeriksaan_id);
  }
  if (filter.status && filter.status !== "ALL") {
    params.set("status", filter.status);
  }
  if (filter.search && filter.search.trim()) {
    params.set("search", filter.search.trim());
  }
  if (filter.page) {
    params.set("page", String(filter.page));
  }
  if (filter.limit) {
    params.set("limit", String(filter.limit));
  }

  const query = params.toString();
  const path = query ? `/lhp?${query}` : "/lhp";

  return apiRequest<LhpListResponse>(path, { method: "GET" });
}

export async function fetchLhpDetail(id: string): Promise<LhpDetail> {
  return apiRequest<LhpDetail>(`/lhp/${id}`, { method: "GET" });
}

export async function createLhpRequest(formData: FormData): Promise<LhpDetail> {
  return apiRequest<LhpDetail>("/lhp", {
    method: "POST",
    body: formData,
  });
}

export async function updateLhpRequest(
  id: string,
  input: UpdateLhpInput,
): Promise<LhpDetail> {
  return apiRequest<LhpDetail>(`/lhp/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function uploadLhpFileRequest(
  id: string,
  file: File,
): Promise<{ message: string; file_path: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ message: string; file_path: string }>(`/lhp/${id}/file`, {
    method: "POST",
    body: formData,
  });
}

export async function downloadLhpFileRequest(
  id: string,
  nomorLhp: string,
): Promise<void> {
  const safeName = nomorLhp.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fallbackFilename = `LHP-${safeName}.pdf`;
  return apiDownloadBlob(`/lhp/${id}/file`, fallbackFilename);
}

export async function closeLhpRequest(id: string): Promise<LhpDetail> {
  return apiRequest<LhpDetail>(`/lhp/${id}/close`, {
    method: "POST",
  });
}

export async function reopenLhpRequest(
  id: string,
  input: ReopenLhpInput,
): Promise<LhpDetail> {
  return apiRequest<LhpDetail>(`/lhp/${id}/reopen`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteLhpRequest(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/lhp/${id}`, {
    method: "DELETE",
  });
}
