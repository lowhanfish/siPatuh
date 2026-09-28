import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeLhpRequest,
  createLhpRequest,
  deleteLhpRequest,
  fetchLhpDetail,
  fetchLhpList,
  reopenLhpRequest,
  updateLhpRequest,
  uploadLhpFileRequest,
} from "../api/lhp-api";
import type { LhpFilter, ReopenLhpInput, UpdateLhpInput } from "../types";

export const LHP_QUERY_KEYS = {
  all: ["lhp"] as const,
  list: (filter: LhpFilter) => ["lhp", "list", filter] as const,
  detail: (id: string) => ["lhp", "detail", id] as const,
};

export function useLhpList(filter: LhpFilter = {}) {
  return useQuery({
    queryKey: LHP_QUERY_KEYS.list(filter),
    queryFn: () => fetchLhpList(filter),
  });
}

export function useLhpDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: LHP_QUERY_KEYS.detail(id || ""),
    queryFn: () => fetchLhpDetail(id!),
    enabled: !!id,
  });
}

export function useCreateLhp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => createLhpRequest(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}

export function useUpdateLhp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLhpInput }) =>
      updateLhpRequest(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(variables.id) });
    },
  });
}

export function useUploadLhpFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadLhpFileRequest(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(variables.id) });
    },
  });
}

export function useCloseLhp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeLhpRequest(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(id) });
    },
  });
}

export function useReopenLhp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReopenLhpInput }) =>
      reopenLhpRequest(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(variables.id) });
    },
  });
}

export function useDeleteLhp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLhpRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}
