import { AuthGuard } from "@/components/feedback/auth-guard";

/**
 * Layout de la sala virtual: solo guard de autenticación, sin el shell del
 * dashboard (sidebar). La videollamada ocupa la pantalla completa.
 */
export default function SalaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}