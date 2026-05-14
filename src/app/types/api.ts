// Mirrors backend DTOs in repos/kmo-digipres-be/src/main/java/com/kumouri/kmodigipresbe/model/.
// When the backend's DTOs change, update this file. Keep field names identical.

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
}

export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
  status: UserStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
