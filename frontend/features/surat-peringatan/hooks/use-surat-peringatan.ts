import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSuratPeringatanRequest,
  deleteSuratPeringatanRequest,
  fetchDueLhps,
  fetchSuratPeringatanDetail,
  fetchSuratPeringatanList,
  regenerateDraftRequest,
  signTteRequest,
  updateSuratPeringatanRequest,
} from "../api/surat-peringatan-api";
import type {
  CreateSuratPeringatanInput,
  SignTteInput,
  SuratPeringatanFilterParams,
} from "../types";

export const SP_QUERY_KEYS = {
  all: ["surat-peringatan"] as const,
  due: (irbanId?: string) => ["surat-peringatan", "due", irbanId || "all"] as const,
  list: (params?: SuratPeringatanFilterParams) =>
    ["surat-peringatan", "list", params || {}] as const,
  detail: (id: string) => ["surat-peringatan", "detail", id] as const,
};

export function useDueLhpList(irbanId?: string) {
  return useQuery({
    queryKey: SP_QUERY_KEYS.due(irbanId),
    queryFn: () => fetchDueLhps(irbanId),
  });
}

export function useSuratPeringatanList(params?: SuratPeringatanFilterParams) {
  return useQuery({
    queryKey: SP_QUERY_KEYS.list(params),
    queryFn: () => fetchSuratPeringatanList(params),
  });
}

export function useSuratPeringatanDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: SP_QUERY_KEYS.detail(id || ""),
    queryFn: () => fetchSuratPeringatanDetail(id!),
    enabled: !!id,
  });
}

export function useCreateSuratPeringatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSuratPeringatanInput) =>
      createSuratPeringatanRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SP_QUERY_KEYS.all });
    },
  });
}

export function useUpdateSuratPeringatan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateSuratPeringatanInput>) =>
      updateSuratPeringatanRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SP_QUERY_KEYS.all });
    },
  });
}

export function useDeleteSuratPeringatan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSuratPeringatanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SP_QUERY_KEYS.all });
    },
  });
}

export function useRegenerateDraft(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateDraftRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SP_QUERY_KEYS.all });
    },
  });
}

export function useSignTteSuratPeringatan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SignTteInput) => signTteRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SP_QUERY_KEYS.all });
    },
  });
}
