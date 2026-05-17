// Single source of truth for role checks. Used by the nav filter
// (AppShell), the route guard (RequireAdmin), and per-feature admin
// gating (router wrappers) so "what counts as admin" is defined once.

export function hasRole(roles: readonly string[], role: string): boolean {
  return roles.includes(role);
}

export function isAdmin(roles: readonly string[]): boolean {
  return hasRole(roles, "ADMIN");
}
