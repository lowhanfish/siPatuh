import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getIrbans, updateIrban } from "@/features/users/api/users-api";
import type { UpdateIrbanInput } from "@/features/users/types";

export function useIrbans() {
  return useQuery({
    queryKey: ["irbans"],
    queryFn: () => getIrbans(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateIrban() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIrbanInput }) =>
      updateIrban(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["irbans"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
