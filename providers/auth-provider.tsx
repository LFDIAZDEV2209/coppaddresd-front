"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  logout as apiLogout,
  login as apiLogin,
  restoreSession,
} from "@/lib/api/auth-service";
import { setAccessToken, setSessionInvalidatedHandler } from "@/lib/api/http";
import type { AuthSession, LoginResult, LogoutReason } from "@/lib/api/types";
import { useSessionTimeout } from "@/hooks/use-session-timeout";

interface AuthContextValue {
  user: AuthSession | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe: boolean,
  ) => Promise<LoginResult>;
  logout: (reason?: LogoutReason) => void;
  hasPermission: (code: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Restauración de sesión al montar: refresh (cookie HttpOnly) + /api/me.
  // El estado inicial (null + loading) es idéntico en server y client, por lo
  // que no hay mismatches de hidratación y no se persiste nada en el cliente.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await restoreSession();
      if (!cancelled) {
        setUser(session);
      }
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cuando el interceptor HTTP detecta una sesión irrecuperable (refresh
  // token inválido/corrupto/expirado), limpia el estado y redirige al login.
  useEffect(() => {
    const handleInvalidated = () => {
      setUser(null);
      setAccessToken(null);
      router.push("/login?expired=1");
    };

    setSessionInvalidatedHandler(handleInvalidated);
    return () => setSessionInvalidatedHandler(null);
  }, [router]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean,
    ): Promise<LoginResult> => {
      const result = await apiLogin(email, password, rememberMe);
      if (result.success && result.session) {
        setUser(result.session);
        router.push("/dashboard");
      }
      return result;
    },
    [router],
  );

  const logout = useCallback(
    (reason: LogoutReason = "manual") => {
      // Limpieza inmediata local + redirect; la revocación en el Auth Service
      // es best effort (si el servicio no responde, la cookie caduca sola).
      setUser(null);
      setAccessToken(null);
      router.push(reason === "expired" ? "/login?expired=1" : "/login");
      void apiLogout();
    },
    [router],
  );

  // Expiración por inactividad: solo mientras hay sesión activa.
  useSessionTimeout(user !== null && !loading, () => logout("expired"));

  const hasPermission = useCallback(
    (code: string) => user?.permissions.includes(code) ?? false,
    [user],
  );

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasPermission, hasRole }),
    [user, loading, login, logout, hasPermission, hasRole],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}