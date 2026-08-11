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

const MOCK_CREDENTIALS: { email: string; password: string; user: AuthUser }[] = [
  {
    email: "admin@coppaddresd.com",
    password: "Test@1234",
    user: {
      id: "usr-001",
      name: "María López",
      email: "maria.lopez@coppaddresd.com",
      role: "Superadministradora",
      initials: "ML",
    },
  },
  {
    email: "demo@coppaddresd.com",
    password: "Demo@1234",
    user: {
      id: "usr-002",
      name: "Carlos Ruiz",
      email: "carlos.ruiz@coppaddresd.com",
      role: "Administrador",
      initials: "CR",
    },
  },
];

export async function mockAuthLogin(
  email: string,
  password: string
): Promise<LoginResult> {
  await simulateDelay(800);

  if (!email || !password) {
    return { success: false, error: "Correo y contraseña son obligatorios." };
  }

  const match = MOCK_CREDENTIALS.find(
    (c) => c.email === email && c.password === password
  );

  if (!match) {
    return {
      success: false,
      error: "Credenciales incorrectas. Verifica tu correo y contraseña.",
    };
  }

  return { success: true, user: match.user };
}

export function mockAuthLogout(): void {
  // In production: call API to invalidate session/refresh tokens
}

export const mockAuthCurrentUser: AuthUser = MOCK_CREDENTIALS[0].user;

export function getDemoCredentials() {
  return MOCK_CREDENTIALS.map((c) => ({
    email: c.email,
    password: c.password,
    role: c.user.role,
  }));
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
