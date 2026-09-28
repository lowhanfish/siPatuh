import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTindakLanjutRequest,
  createVerifikasiRequest,
  fetchFinancialSummary,
  fetchTindakLanjutList,
} from "../api/tindak-lanjut-api";
import { TEMUAN_QUERY_KEYS } from "@/features/temuan-rekomendasi/hooks/use-temuan-rekomendasi";
import { LHP_QUERY_KEYS } from "@/features/lhp/hooks/use-lhp";

export const TINDAK_LANJUT_QUERY_KEYS = {
  byRekomendasi: (rekomendasiId: string) =>
    ["tindak-lanjut", "byRekomendasi", rekomendasiId] as const,
  financialSummary: (rekomendasiId: string) =>
    ["financial-summary", rekomendasiId] as const,
};

export function useTindakLanjutList(rekomendasiId: string | null | undefined) {
  return useQuery({
    queryKey: TINDAK_LANJUT_QUERY_KEYS.byRekomendasi(rekomendasiId || ""),
    queryFn: () => fetchTindakLanjutList(rekomendasiId!),
    enabled: !!rekomendasiId,
  });
}

export function useFinancialSummary(rekomendasiId: string | null | undefined) {
  return useQuery({
    queryKey: TINDAK_LANJUT_QUERY_KEYS.financialSummary(rekomendasiId || ""),
    queryFn: () => fetchFinancialSummary(rekomendasiId!),
    enabled: !!rekomendasiId,
  });
}

export function useCreateTindakLanjut(rekomendasiId: string, lhpId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      createTindakLanjutRequest(rekomendasiId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TINDAK_LANJUT_QUERY_KEYS.byRekomendasi(rekomendasiId),
      });
      queryClient.invalidateQueries({
        queryKey: TINDAK_LANJUT_QUERY_KEYS.financialSummary(rekomendasiId),
      });
      if (lhpId) {
        queryClient.invalidateQueries({
          queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId),
        });
        queryClient.invalidateQueries({
          queryKey: LHP_QUERY_KEYS.detail(lhpId),
        });
      }
    },
  });
}

export function useCreateVerifikasi(rekomendasiId: string, lhpId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tindakLanjutId,
      formData,
    }: {
      tindakLanjutId: string;
      formData: FormData;
    }) => createVerifikasiRequest(tindakLanjutId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TINDAK_LANJUT_QUERY_KEYS.byRekomendasi(rekomendasiId),
      });
      queryClient.invalidateQueries({
        queryKey: TINDAK_LANJUT_QUERY_KEYS.financialSummary(rekomendasiId),
      });
      if (lhpId) {
        queryClient.invalidateQueries({
          queryKey: TEMUAN_QUERY_KEYS.byLhp(lhpId),
        });
        queryClient.invalidateQueries({
          queryKey: LHP_QUERY_KEYS.detail(lhpId),
        });
      }
    },
  });
}
