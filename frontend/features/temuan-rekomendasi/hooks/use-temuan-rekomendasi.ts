import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRekomendasiRequest,
  createTemuanRequest,
  deleteRekomendasiRequest,
  deleteTemuanRequest,
  fetchTemuanByLhpId,
  updateRekomendasiRequest,
  updateTemuanRequest,
} from "../api/temuan-rekomendasi-api";
import type {
  CreateRekomendasiInput,
  CreateTemuanInput,
  UpdateRekomendasiInput,
  UpdateTemuanInput,
} from "../types";
import { LHP_QUERY_KEYS } from "@/features/lhp/hooks/use-lhp";

export const TEMUAN_QUERY_KEYS = {
  all: ["temuan"] as const,
  byLhp: (lhpId: string) => ["temuan", "byLhp", lhpId] as const,
};

export function useTemuanList(lhpId: string | null | undefined) {
  return useQuery({
    queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId || ""),
    queryFn: () => fetchTemuanByLhpId(lhpId!),
    enabled: !!lhpId,
  });
}

export function useCreateTemuan(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemuanInput) => createTemuanRequest(lhpId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTemuan(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTemuanInput }) =>
      updateTemuanRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
    },
  });
}

export function useDeleteTemuan(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemuanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}

export function useCreateRekomendasi(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      temuanId,
      input,
    }: {
      temuanId: string;
      input: CreateRekomendasiInput;
    }) => createRekomendasiRequest(temuanId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}

export function useUpdateRekomendasi(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRekomendasiInput;
    }) => updateRekomendasiRequest(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
    },
  });
}

export function useDeleteRekomendasi(lhpId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRekomendasiRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.detail(lhpId) });
      queryClient.invalidateQueries({ queryKey: LHP_QUERY_KEYS.all });
    },
  });
}
