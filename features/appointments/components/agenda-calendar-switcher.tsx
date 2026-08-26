"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList } from "lucide-react";

/**
 * Conmutador Agenda | Calendario para la cabecera degradada. Permite alternar
 * entre ambas vistas sin perder el contexto (mismo profesional/rango).
 */
export function AgendaCalendarSwitcher({
  active,
}: {
  active: "agenda" | "calendario";
}) {
  const base =
    "flex min-w-24 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] transition-colors";
  const activeClass = "bg-white font-semibold text-primary-strong shadow-sm";
  const inactiveClass =
    "font-medium text-white/80 hover:bg-white/20 hover:text-white";

  return (
    <nav
      aria-label="Cambiar entre agenda y calendario"
      className="flex items-center gap-1 rounded-lg bg-white/10 p-1"
    >
      <Link
        href="/appointments/agenda"
        aria-current={active === "agenda" ? "page" : undefined}
        className={`${base} ${active === "agenda" ? activeClass : inactiveClass}`}
      >
        <ClipboardList className="size-4" aria-hidden="true" />
        Agenda
      </Link>
      <Link
        href="/appointments/calendario"
        aria-current={active === "calendario" ? "page" : undefined}
        className={`${base} ${active === "calendario" ? activeClass : inactiveClass}`}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        Calendario
      </Link>
    </nav>
  );
}
