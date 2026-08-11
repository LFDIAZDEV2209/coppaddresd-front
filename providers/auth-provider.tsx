"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
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

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("copp-auth-user");
  return stored ? JSON.parse(stored) : null;
}

function persistAuth(user: AuthUser | null) {
  if (user) {
    localStorage.setItem("copp-auth-user", JSON.stringify(user));
  } else {
    localStorage.removeItem("copp-auth-user");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading] = useState(false);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await mockAuthLogin(email, password);
      if (result.success && result.user) {
        persistAuth(result.user);
        setUser(result.user);
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
    setUser(null);
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
