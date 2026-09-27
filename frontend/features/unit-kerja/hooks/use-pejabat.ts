import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPejabat,
  deletePejabat,
  getPejabatList,
  resolveRecipient,
  updatePejabat,
} from "@/features/unit-kerja/api/unit-kerja-api";
import type { CreatePejabatInput, UpdatePejabatInput } from "@/features/unit-kerja/types";

export function usePejabatList(simpegUnitKerjaId?: string, isActive?: boolean) {
  return useQuery({
    queryKey: ["pejabat", simpegUnitKerjaId, isActive],
    queryFn: () => getPejabatList(simpegUnitKerjaId, isActive),
    staleTime: 30 * 1000,
  });
}

export function useResolveRecipient(simpegUnitKerjaId?: string) {
  return useQuery({
    queryKey: ["pejabat", "resolve-recipient", simpegUnitKerjaId],
    queryFn: () => resolveRecipient(simpegUnitKerjaId!),
    enabled: !!simpegUnitKerjaId,
    staleTime: 30 * 1000,
  });
}

export function useCreatePejabat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePejabatInput) => createPejabat(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pejabat"] });
      queryClient.invalidateQueries({
        queryKey: ["pejabat", "resolve-recipient", variables.simpeg_unit_kerja_id],
      });
    },
  });
}

export function useUpdatePejabat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePejabatInput }) =>
      updatePejabat(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pejabat"] });
    },
  });
}

export function useDeletePejabat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePejabat(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pejabat"] });
    },
  });
}
