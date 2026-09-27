import { apiRequest } from "@/lib/api-client";
import type {
  ActivateUserInput,
  EgovCandidateUser,
  Irban,
  SipatuhUser,
  ToggleUserStatusInput,
  UpdateIrbanInput,
  UpdateUserInput,
  UserFilterParams,
} from "@/features/users/types";

type ApiResponseWrapper<T> = T | { data: T; success?: boolean };

function unwrapResponse<T>(res: ApiResponseWrapper<T>): T {
  if (res && typeof res === "object" && "data" in res && (res as { data: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export async function getUsers(filters?: UserFilterParams): Promise<SipatuhUser[]> {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.irban_id) params.set("irban_id", filters.irban_id);
  if (filters?.is_active !== undefined) params.set("is_active", String(filters.is_active));
  if (filters?.search) params.set("search", filters.search);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest<ApiResponseWrapper<SipatuhUser[]>>(`/users${query}`);
  return unwrapResponse(res);
}

export async function searchEgovUsers(query: string): Promise<EgovCandidateUser[]> {
  if (!query || query.trim().length === 0) return [];
  const res = await apiRequest<ApiResponseWrapper<EgovCandidateUser[]>>(
    `/users/egov-search?query=${encodeURIComponent(query.trim())}`,
  );
  return unwrapResponse(res);
}

export async function activateUser(input: ActivateUserInput): Promise<SipatuhUser> {
  const res = await apiRequest<ApiResponseWrapper<SipatuhUser>>("/users/activate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return unwrapResponse(res);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<SipatuhUser> {
  const res = await apiRequest<ApiResponseWrapper<SipatuhUser>>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return unwrapResponse(res);
}

export async function toggleUserStatus(id: string, is_active: boolean): Promise<SipatuhUser> {
  const payload: ToggleUserStatusInput = { is_active };
  const res = await apiRequest<ApiResponseWrapper<SipatuhUser>>(
    `/users/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  return unwrapResponse(res);
}

export async function getIrbans(): Promise<Irban[]> {
  const res = await apiRequest<ApiResponseWrapper<Irban[]>>("/irban");
  return unwrapResponse(res);
}

export async function updateIrban(id: string, input: UpdateIrbanInput): Promise<Irban> {
  const res = await apiRequest<ApiResponseWrapper<Irban>>(`/irban/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return unwrapResponse(res);
}
