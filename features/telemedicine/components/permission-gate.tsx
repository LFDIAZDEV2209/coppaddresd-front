"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

/**
 * Guard de permisos de la UI: si el usuario no tiene el permiso, muestra un
 * estado de acceso denegado. La autorización REAL siempre la aplica el backend;
 * esto solo oculta la navegación (mínimo privilegio en la UI).
 */
export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useAuth();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <ShieldAlert className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Acceso denegado</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">
        Necesitás el permiso <code className="rounded bg-muted px-1">{permission}</code>{" "}
        para ver esta sección.
      </p>
    </div>
  );
}
