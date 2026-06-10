import {
  ApiError,
  createCrmClient,
  type CrmClient,
} from "@kmosf/crm-components";

export { ApiError };

// Security FE-02 (DEFERRED / tracked follow-up): the admin JWT lives in
// localStorage, which is XSS-exfiltratable. The hardened design is an
// httpOnly + Secure + SameSite=Strict session cookie set by the backend, but
// that is a coordinated BE+FE architectural change (CORS + CSRF handling), so
// it is intentionally NOT done here. The immediate XSS sink that made this
// exploitable (FE-01 `javascript:` href stored XSS) is fixed in this PR; keep
// the token TTL short until the cookie migration lands. Do NOT change the
// storage mechanism in this change. See security-remediation-plan-2026-06-09.md.
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
