import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignUnitKerja,
  browseSimpegUnitKerja,
  getUnitKerjaMappings,
  unassignUnitKerja,
} from "@/features/unit-kerja/api/unit-kerja-api";
import type { AssignUnitKerjaInput } from "@/features/unit-kerja/types";

export function useSimpegUnitKerja(search?: string) {
  return useQuery({
    queryKey: ["simpeg-unit-kerja", search],
    queryFn: () => browseSimpegUnitKerja(search),
    staleTime: 60 * 1000,
  });
}

export function useUnitKerjaMappings(irbanId?: string) {
  return useQuery({
    queryKey: ["unit-kerja-mappings", irbanId],
    queryFn: () => getUnitKerjaMappings(irbanId),
    staleTime: 60 * 1000,
  });
}

export function useAssignUnitKerja() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignUnitKerjaInput) => assignUnitKerja(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simpeg-unit-kerja"] });
      queryClient.invalidateQueries({ queryKey: ["unit-kerja-mappings"] });
    },
  });
}

export function useUnassignUnitKerja() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unassignUnitKerja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simpeg-unit-kerja"] });
      queryClient.invalidateQueries({ queryKey: ["unit-kerja-mappings"] });
    },
  });
}
