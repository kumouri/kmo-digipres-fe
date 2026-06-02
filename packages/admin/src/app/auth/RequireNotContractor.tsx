import { Navigate, Outlet } from "react-router";

import { useAuth } from "./useAuth";
import { isContractor } from "./roles";

// Route guard for surfaces a scoped-down contractor must not see. Defense in
// depth alongside the AppShell nav filter: a contractor who deep-links or
// bookmarks (e.g.) /deals, /team, or /invoices is sent back to the dashboard
// rather than rendering a page they have no business in (and would 403 on).
// Admin/staff are unaffected.
export function RequireNotContractor() {
  const { roles } = useAuth();
  if (isContractor(roles)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
