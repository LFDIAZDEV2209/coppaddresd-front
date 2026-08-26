"use client";

import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAppContext } from "@/providers/context-provider";
import {
  findModuleForPath,
  hasNavPermission,
} from "@/lib/config/navigation";
import { useT } from "@/providers/i18n-provider";

/**
 * Guard de rutas por permisos (centralizado en la config de navegación):
 * si la ruta actual pertenece a un módulo o ítem con permiso declarado que el
 * usuario no posee en el contexto activo, muestra "acceso denegado" en lugar
 * del contenido. La autorización REAL siempre la aplica el backend; esto solo
 * evita la navegación directa a rutas protegidas (mínimo privilegio en la UI).
 */
export function PermissionRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAppContext();
  const t = useT();

  const navModule = findModuleForPath(pathname);
  if (!navModule) {
    return <>{children}</>;
  }

  const item = navModule.items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const permission = item?.permission ?? navModule.permission;

  if (!hasNavPermission(permission, can)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <ShieldAlert className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{t("Acceso denegado")}</p>
        <p className="max-w-sm text-[12.5px] text-muted-foreground">
          {t("No tenés permisos para acceder a esta sección en el contexto actual.")}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}