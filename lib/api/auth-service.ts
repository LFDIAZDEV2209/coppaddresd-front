import { AUTH_API_URL, setAuthToken } from "@/lib/api/config";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  roles: string[];
}

export async function authLogin(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const response = await fetch(`${AUTH_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return { success: false, error: "Credenciales incorrectas." };
    }

    const data = (await response.json()) as LoginResponse;
    setAuthToken(data.accessToken);

    const name = email.split("@")[0];
    const initials = name
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "CA";

    return {
      success: true,
      user: {
        id: data.userId,
        name: email,
        email: data.email,
        role: data.roles[0] ?? "Usuario",
        initials,
      },
    };
  } catch {
    return { success: false, error: "No fue posible conectar con el servidor de autenticación." };
  }
}

export function authLogout(): void {
  setAuthToken(null);
}

export const mockAuthCurrentUser: AuthUser = {
  id: "usr-001",
  name: "María López",
  email: "admin@coppaddresd.com",
  role: "Superadministradora",
  initials: "ML",
};

export function getDemoCredentials() {
  return [
    { email: "admin@coppaddresd.com", password: "Test@1234", role: "Admin" },
  ];
}
