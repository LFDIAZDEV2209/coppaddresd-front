import { mockAuthCurrentUser, type AuthUser } from "@/lib/api/auth-service";

export type { AuthUser as CurrentUser };
export const mockCurrentUser: AuthUser = mockAuthCurrentUser;
