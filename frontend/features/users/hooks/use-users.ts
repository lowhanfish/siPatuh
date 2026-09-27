import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  getUsers,
  searchEgovUsers,
  toggleUserStatus,
  updateUser,
} from "@/features/users/api/users-api";
import type {
  ActivateUserInput,
  UpdateUserInput,
  UserFilterParams,
} from "@/features/users/types";

export function useUsers(filters?: UserFilterParams) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => getUsers(filters),
    staleTime: 30 * 1000,
  });
}

export function useEgovSearch(query: string, enabled = false) {
  return useQuery({
    queryKey: ["egov-search", query],
    queryFn: () => searchEgovUsers(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 60 * 1000,
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ActivateUserInput) => activateUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["egov-search"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggleUserStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
