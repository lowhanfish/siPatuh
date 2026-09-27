import { apiRequest } from "@/lib/api-client";
import type { ApiSuccess, AuthUser, LoginInput } from "@/features/auth/types";

type AuthPayload = {
  user: AuthUser;
};

export async function login(input: LoginInput) {
  const response = await apiRequest<ApiSuccess<AuthPayload>>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    skipAuthRefresh: true,
  });

  return response.data.user;
}

export async function logout() {
  await apiRequest<{ success: true; message: string }>("/auth/logout", {
    method: "POST",
    skipAuthRefresh: true,
  });
}

export async function getCurrentUser() {
  const response = await apiRequest<ApiSuccess<AuthUser>>("/auth/me");
  return response.data;
}
