import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div
        data-testid="auth-loading"
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
      >
        Verifying session…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
