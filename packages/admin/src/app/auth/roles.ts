// Single source of truth for role checks. Used by the nav filter
// (AppShell), the route guards (RequireAdmin / RequireNotContractor), and
// per-feature gating (router wrappers) so "what counts as admin" — and "what
// counts as a scoped-down contractor" — is defined once.

// Canonical role names from the backend. CONTRACTOR implies STAFF.
export const ROLE = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CONTRACTOR: "CONTRACTOR",
} as const;

export function hasRole(roles: readonly string[], role: string): boolean {
  return roles.includes(role);
}

export function hasAnyRole(
  roles: readonly string[],
  allowed: readonly string[],
): boolean {
  return allowed.some((r) => roles.includes(r));
}

export function isAdmin(roles: readonly string[]): boolean {
  return hasRole(roles, ROLE.ADMIN);
}

// A contractor is a STAFF user carrying the CONTRACTOR role. The owner/admin is
// never scoped down, even if (somehow) also tagged CONTRACTOR.
export function isContractor(roles: readonly string[]): boolean {
  return hasRole(roles, ROLE.CONTRACTOR) && !hasRole(roles, ROLE.ADMIN);
}
