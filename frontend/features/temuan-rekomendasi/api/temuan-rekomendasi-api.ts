import { apiRequest } from "@/lib/api-client";
import type {
  CreateRekomendasiInput,
  CreateTemuanInput,
  RekomendasiItem,
  TemuanItem,
  UpdateRekomendasiInput,
  UpdateTemuanInput,
} from "../types";

// ==========================================
// TEMUAN APIS
// ==========================================

export async function fetchTemuanByLhpId(lhpId: string): Promise<TemuanItem[]> {
  return apiRequest<TemuanItem[]>(`/lhp/${lhpId}/temuan`, { method: "GET" });
}

export async function fetchTemuanById(id: string): Promise<TemuanItem> {
  return apiRequest<TemuanItem>(`/temuan/${id}`, { method: "GET" });
}

export async function createTemuanRequest(
  lhpId: string,
  input: CreateTemuanInput,
): Promise<TemuanItem> {
  return apiRequest<TemuanItem>(`/lhp/${lhpId}/temuan`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTemuanRequest(
  id: string,
  input: UpdateTemuanInput,
): Promise<TemuanItem> {
  return apiRequest<TemuanItem>(`/temuan/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTemuanRequest(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/temuan/${id}`, {
    method: "DELETE",
  });
}

// ==========================================
// REKOMENDASI APIS
// ==========================================

export async function fetchRekomendasiByTemuanId(
  temuanId: string,
): Promise<RekomendasiItem[]> {
  return apiRequest<RekomendasiItem[]>(`/temuan/${temuanId}/rekomendasi`, {
    method: "GET",
  });
}

export async function fetchRekomendasiById(id: string): Promise<RekomendasiItem> {
  return apiRequest<RekomendasiItem>(`/rekomendasi/${id}`, { method: "GET" });
}

export async function createRekomendasiRequest(
  temuanId: string,
  input: CreateRekomendasiInput,
): Promise<RekomendasiItem> {
  return apiRequest<RekomendasiItem>(`/temuan/${temuanId}/rekomendasi`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateRekomendasiRequest(
  id: string,
  input: UpdateRekomendasiInput,
): Promise<RekomendasiItem> {
  return apiRequest<RekomendasiItem>(`/rekomendasi/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteRekomendasiRequest(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/rekomendasi/${id}`, {
    method: "DELETE",
  });
}
