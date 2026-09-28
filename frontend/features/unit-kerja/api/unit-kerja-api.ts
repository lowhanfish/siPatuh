import { apiRequest } from "@/lib/api-client";
import type {
  AssignUnitKerjaInput,
  AutocompleteUnitKerjaItem,
  CreatePejabatInput,
  IrbanUnitKerjaMapping,
  PejabatUnitKerja,
  ResolvedRecipientResponse,
  SimpegUnitKerjaItem,
  UpdatePejabatInput,
} from "@/features/unit-kerja/types";


type ApiResponseWrapper<T> = T | { data: T; success?: boolean };

function unwrapResponse<T>(res: ApiResponseWrapper<T>): T {
  if (res && typeof res === "object" && "data" in res && (res as { data: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export async function browseSimpegUnitKerja(search?: string): Promise<SimpegUnitKerjaItem[]> {
  const query = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await apiRequest<ApiResponseWrapper<SimpegUnitKerjaItem[]>>(`/unit-kerja/simpeg${query}`);
  return unwrapResponse(res);
}

export async function searchUnitKerjaAutocomplete(
  search?: string,
  limit?: number,
): Promise<AutocompleteUnitKerjaItem[]> {
  const params = new URLSearchParams();
  if (search && search.trim()) params.set("q", search.trim());
  if (limit) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<ApiResponseWrapper<AutocompleteUnitKerjaItem[]>>(`/unit-kerja/search${query}`);
  return unwrapResponse(res);
}


export async function getUnitKerjaMappings(irbanId?: string): Promise<IrbanUnitKerjaMapping[]> {
  const query = irbanId ? `?irban_id=${encodeURIComponent(irbanId)}` : "";
  const res = await apiRequest<ApiResponseWrapper<IrbanUnitKerjaMapping[]>>(`/unit-kerja/mappings${query}`);
  return unwrapResponse(res);
}

export async function assignUnitKerja(input: AssignUnitKerjaInput): Promise<IrbanUnitKerjaMapping> {
  const res = await apiRequest<ApiResponseWrapper<IrbanUnitKerjaMapping>>("/unit-kerja/mappings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return unwrapResponse(res);
}

export async function unassignUnitKerja(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest<ApiResponseWrapper<{ success: boolean; message: string }>>(
    `/unit-kerja/mappings/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  return unwrapResponse(res);
}

export async function getPejabatList(
  simpegUnitKerjaId?: string,
  isActive?: boolean,
): Promise<PejabatUnitKerja[]> {
  const params = new URLSearchParams();
  if (simpegUnitKerjaId) params.set("simpeg_unit_kerja_id", simpegUnitKerjaId);
  if (isActive !== undefined) params.set("is_active", String(isActive));

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<ApiResponseWrapper<PejabatUnitKerja[]>>(`/pejabat${query}`);
  return unwrapResponse(res);
}

export async function createPejabat(input: CreatePejabatInput): Promise<PejabatUnitKerja> {
  const res = await apiRequest<ApiResponseWrapper<PejabatUnitKerja>>("/pejabat", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return unwrapResponse(res);
}

export async function updatePejabat(id: string, input: UpdatePejabatInput): Promise<PejabatUnitKerja> {
  const res = await apiRequest<ApiResponseWrapper<PejabatUnitKerja>>(
    `/pejabat/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return unwrapResponse(res);
}

export async function deletePejabat(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest<ApiResponseWrapper<{ success: boolean; message: string }>>(
    `/pejabat/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  return unwrapResponse(res);
}

export async function resolveRecipient(simpegUnitKerjaId: string): Promise<ResolvedRecipientResponse> {
  const res = await apiRequest<ApiResponseWrapper<ResolvedRecipientResponse>>(
    `/pejabat/resolve-recipient/${encodeURIComponent(simpegUnitKerjaId)}`,
  );
  return unwrapResponse(res);
}
