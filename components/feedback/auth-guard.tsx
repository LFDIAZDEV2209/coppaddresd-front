"use client";

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Este contenedor es lo único que existe en el DOM durante la hidratación
    // (el shell se monta tras restaurar la sesión). suppressHydrationWarning
    // evita falsos positivos por atributos inyectados por extensiones.
    return (
      <div
        className="flex h-screen items-center justify-center bg-background"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Verificando sesión...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
