"use client";

import type { LucideIcon } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Item de información del patrón del módulo Usuarios: label en mayúsculas,
 * valor con icono semántico. Se usa en las vistas de detalle (grid de datos).
 */
export function InfoItem({
  label,
  value,
  icon: Icon,
  mono,
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  mono?: boolean;
  hint?: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {hint && (
          <span className="ml-1 normal-case opacity-70">· {t(hint)}</span>
        )}
      </dt>
      <dd
        className={cn(
          "flex items-center gap-1.5 truncate text-[13px] font-medium text-foreground",
          mono && "font-mono text-[12px]",
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        {value}
      </dd>
    </div>
  );
}
