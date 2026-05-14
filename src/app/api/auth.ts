import { api } from "./client";
import type { LoginRequest, LoginResponse, User } from "@/types/api";

export function login(body: LoginRequest): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function me(): Promise<User> {
  return api<User>("/auth/me");
}

export function logout(): Promise<void> {
  return api<void>("/auth/logout", { method: "POST" });
}
