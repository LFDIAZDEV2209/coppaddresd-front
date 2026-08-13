"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { mockAuthLogin, mockAuthLogout, type AuthUser } from "@/lib/api/auth-service";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "copp-auth-user";

const listeners = new Set<() => void>();

let cachedStoredUser: AuthUser | null | undefined;

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  if (cachedStoredUser === undefined) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      cachedStoredUser = null;
    } else {
      try {
        cachedStoredUser = JSON.parse(stored) as AuthUser;
      } catch {
        cachedStoredUser = null;
      }
    }
  }
  return cachedStoredUser;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function persistAuth(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  cachedStoredUser = undefined;
  listeners.forEach((listener) => listener());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribe, getStoredUser, () => null);
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const loading = !isHydrated;

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await mockAuthLogin(email, password);
      if (result.success && result.user) {
        persistAuth(result.user);
        router.push("/dashboard");
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [router]
  );

  const logout = useCallback(() => {
    mockAuthLogout();
    persistAuth(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
