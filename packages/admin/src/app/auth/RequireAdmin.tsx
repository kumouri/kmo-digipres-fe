import { Navigate, Outlet } from "react-router";

import { useAuth } from "./useAuth";
import { isAdmin } from "./roles";

// Route guard for admin-only surfaces. Defense-in-depth alongside the
// AppShell nav filter: a non-admin who deep-links or bookmarks an
// admin-only route is sent back to the dashboard rather than hitting a
// backend 403.
export function RequireAdmin() {
  const { roles } = useAuth();
  if (!isAdmin(roles)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
