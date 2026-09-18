"use client";

import { CalendarDays, ClipboardList } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export type AgendaCalendarView = "agenda" | "calendario";

/**
 * Conmutador Agenda | Calendario en estado local: alterna el componente
 * renderizado sin navegar (misma URL, sin recarga).
 */
export function AgendaCalendarSwitcher({
  active,
  onChange,
}: {
  active: AgendaCalendarView;
  onChange: (view: AgendaCalendarView) => void;
}) {
  const t = useT();
  const base =
    "flex min-w-24 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] transition-colors";
  const activeClass = "bg-white font-semibold text-primary-strong shadow-sm";
  const inactiveClass =
    "font-medium text-white/80 hover:bg-white/20 hover:text-white";

  return (
    <nav
      aria-label={t("Cambiar entre agenda y calendario")}
      className="flex items-center gap-1 rounded-lg bg-white/10 p-1"
    >
      <button
        type="button"
        aria-pressed={active === "agenda"}
        onClick={() => onChange("agenda")}
        className={`${base} ${active === "agenda" ? activeClass : inactiveClass}`}
      >
        <ClipboardList className="size-4" aria-hidden="true" />
        {t("Agenda")}
      </button>
      <button
        type="button"
        aria-pressed={active === "calendario"}
        onClick={() => onChange("calendario")}
        className={`${base} ${active === "calendario" ? activeClass : inactiveClass}`}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        {t("Calendario")}
      </button>
    </nav>
  );
}
