"use client";

import { CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { getFullName, getInitials } from "../services/users-service";
import type { User, ScopedUserRole } from "../types";

/**
 * Visuales compartidos del módulo de usuarios (tabla, cards, detalle):
 * avatar con el gradiente de marca, badge de estado con icono + texto
 * (nunca solo color) y chips de roles.
 */

/** Avatar del usuario con gradiente de marca (consistente con el dashboard). */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, "firstName" | "lastName">;
  className?: string;
}) {
  return (
    <Avatar className={cn("border-2 border-white shadow-sm", className)}>
      <AvatarFallback className="bg-gradient-to-br from-[var(--sidebar)] to-brand-teal text-[11px] font-bold text-white">
        {getInitials(user as User)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Badge de estado con contraste alto: Activo = sólido verde (destaca),
 * Inactivo = pizarra sólida (visible, no pastel). Siempre icono + texto.
 */
export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  const t = useT();
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-[5px] text-[11.5px] font-semibold text-white shadow-sm">
      <CheckCircle2 className="size-3.5" />
      {t("Activo")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-[5px] text-[11.5px] font-semibold text-slate-700 shadow-sm">
      <XCircle className="size-3.5" />
      {t("Inactivo")}
    </span>
  );
}

/** Chips de roles (globales + scoped) con icono; muestra "+N" si hay más. */
export function RoleChips({
  roles,
  scopedRoles,
  max = 2,
  className,
}: {
  roles: string[];
  scopedRoles?: ScopedUserRole[] | null;
  max?: number;
  className?: string;
}) {
  const t = useT();

  // Combinar roles globales y scoped en una lista unificada para el display.
  const allChips: { label: string; scoped: boolean }[] = [];

  for (const role of roles) {
    allChips.push({ label: role, scoped: false });
  }
  if (scopedRoles) {
    for (const sr of scopedRoles) {
      const label = sr.scopeName
        ? `${sr.roleName} · ${sr.scopeName}`
        : sr.roleName;
      allChips.push({ label, scoped: true });
    }
  }

  const visible = allChips.slice(0, max);
  const extra = allChips.length - visible.length;
  const hasNoRoles = allChips.length === 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {hasNoRoles && (
        <span className="inline-flex items-center gap-1 rounded-md bg-warning px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-sm">
          <ShieldAlert className="size-3" />
          {t("Sin roles")}
        </span>
      )}
      {visible.map((chip) =>
        chip.scoped ? (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/40 bg-primary/[0.06] px-2 py-0.5 text-[11px] font-medium text-primary"
          >
            <ShieldCheck className="size-3 text-primary/70" />
            {chip.label}
          </span>
        ) : (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
          >
            <ShieldCheck className="size-3 text-primary" />
            {chip.label}
          </span>
        ),
      )}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}

/** Nombre completo en una línea + email debajo (celda "Usuario" rica). */
export function UserIdentity({
  user,
  emailClassName,
}: {
  user: User;
  emailClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-[13px] font-semibold text-foreground">
        {getFullName(user)}
      </span>
      <span
        className={cn(
          "truncate text-[11px] text-muted-foreground",
          emailClassName,
        )}
      >
        {user.email}
      </span>
    </div>
  );
}
