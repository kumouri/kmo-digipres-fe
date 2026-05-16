import {
  ApiError,
  createCrmClient,
  type CrmClient,
} from "@kmosf/crm-components";

export { ApiError };

export const TOKEN_STORAGE_KEY = "kmosf.jwt";
export const UNAUTHORIZED_EVENT = "kmosf:unauthorized";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const adminClient: CrmClient = createCrmClient({
  baseUrl: BASE_URL,
  getToken: getStoredToken,
  onUnauthorized: () => {
    clearStoredToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  },
});

export const api = adminClient.api;
