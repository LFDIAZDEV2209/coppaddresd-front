"use client";

import type { ElementType } from "react";
import { Activity, CalendarDays, BarChart3, Dna, Zap } from "lucide-react";

export type EnrollmentDetailTab =
  | "summary"
  | "content"
  | "scores"
  | "baseline"
  | "xp-ledger";

const TABS: { id: EnrollmentDetailTab; label: string; icon: ElementType }[] = [
  { id: "summary", label: "Resumen", icon: Activity },
  { id: "content", label: "Contenido semanal", icon: CalendarDays },
  { id: "scores", label: "Scores clínicos", icon: BarChart3 },
  { id: "baseline", label: "Línea base", icon: Dna },
  { id: "xp-ledger", label: "Historial XP", icon: Zap },
];

interface Props {
  activeTab: EnrollmentDetailTab;
  onTabChange: (tab: EnrollmentDetailTab) => void;
}

/**
 * Barra de pestañas del panel del paciente. Rol ARIA `tablist` con botones
 * `role="tab"` y `aria-selected` para lectores de pantalla.
 */
export function EnrollmentTabsNav({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
      role="tablist"
      aria-label="Secciones del paciente"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}