import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import * as authApi from "@/api/auth";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  UNAUTHORIZED_EVENT,
} from "@/api/client";
import type { LoginRequest, User } from "@kmosf/crm-components";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  tenantId: string | null;
  tenantName: string | null;
  roles: string[];
  isAuthenticated: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    getStoredToken() ? "loading" : "unauthenticated",
  );
  // Tracks the latest hydration request so a stale /auth/me response can't
  // overwrite a newer login.
  const hydrationSeqRef = useRef(0);

  const forceLogout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    const handler = () => forceLogout();
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [forceLogout]);

  useEffect(() => {
    if (!getStoredToken()) {
      setStatus("unauthenticated");
      return;
    }
    const seq = ++hydrationSeqRef.current;
    authApi
      .me()
      .then((u) => {
        if (seq !== hydrationSeqRef.current) return;
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        if (seq !== hydrationSeqRef.current) return;
        forceLogout();
      });
  }, [forceLogout]);

  const doLogin = useCallback(async (body: LoginRequest) => {
    const res = await authApi.login(body);
    setStoredToken(res.token);
    const seq = ++hydrationSeqRef.current;
    const fresh = await authApi.me();
    if (seq !== hydrationSeqRef.current) return;
    setUser(fresh);
    setStatus("authenticated");
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Stateless JWTs — server has nothing to invalidate. Clearing local
      // state below is what actually logs the user out.
    }
    forceLogout();
  }, [forceLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      tenantId: user?.tenantId ?? null,
      tenantName: user?.tenantName ?? null,
      roles: user?.roles ?? [],
      isAuthenticated: status === "authenticated",
      login: doLogin,
      logout: doLogout,
    }),
    [status, user, doLogin, doLogout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
