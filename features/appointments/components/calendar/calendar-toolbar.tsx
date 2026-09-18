"use client";

import {
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  appointmentStatusColor,
  appointmentStatusDot,
  appointmentStatusLabel,
} from "../../utils/format";
import type { AppointmentStatus } from "../../types";
import type { CalendarViewType } from "./appointments-calendar";

const VIEW_OPTIONS: { key: CalendarViewType; label: string }[] = [
  { key: "dayGridMonth", label: "Mes" },
  { key: "timeGridWeek", label: "Semana" },
  { key: "timeGridDay", label: "Día" },
];

/** Estados filtrables en orden de flujo clínico. */
const FILTER_STATUSES: AppointmentStatus[] = [
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
  "NoShow",
  "Requested",
];

/**
 * Toolbar del calendario: navegación temporal + selector de vista + rango
 * visible + KPIs del rango cargado + filtros por estado y búsqueda por
 * paciente + acceso a nueva cita. Toda etiqueta pasa por i18n y los
 * controles son operables por teclado.
 */
export function CalendarToolbar({
  viewType,
  rangeLabel,
  isTodayRange,
  totalCount,
  countsByStatus,
  statuses,
  query,
  onQueryChange,
  onToggleStatus,
  onClearFilters,
  activeFilterCount,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  onNewAppointment,
}: {
  viewType: CalendarViewType;
  rangeLabel: string;
  isTodayRange: boolean;
  totalCount: number;
  countsByStatus: Map<AppointmentStatus, number>;
  statuses: AppointmentStatus[] | null;
  query: string;
  onQueryChange: (value: string) => void;
  onToggleStatus: (status: AppointmentStatus) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarViewType) => void;
  onNewAppointment: () => void;
}) {
  const t = useT();

  const kpis: { label: string; value: number; dot: string }[] = [
    { label: t("Total"), value: totalCount, dot: "var(--primary)" },
    {
      label: appointmentStatusLabel.Confirmed,
      value: countsByStatus.get("Confirmed") ?? 0,
      dot: appointmentStatusDot("Confirmed"),
    },
    {
      label: appointmentStatusLabel.Completed,
      value: countsByStatus.get("Completed") ?? 0,
      dot: appointmentStatusDot("Completed"),
    },
    {
      label: appointmentStatusLabel.Cancelled,
      value: countsByStatus.get("Cancelled") ?? 0,
      dot: appointmentStatusDot("Cancelled"),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Fila 1: navegación + fecha + vistas + búsqueda + nueva cita */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onPrev}
            aria-label={t("Rango anterior")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="sm"
            variant={isTodayRange ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-[12px] font-semibold"
            onClick={onToday}
            aria-label={t("Ir a hoy")}
          >
            <CalendarCheck className="size-3.5" data-icon="inline-start" />
            {t("Hoy")}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onNext}
            aria-label={t("Rango siguiente")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="mr-auto text-[16px] font-bold tracking-tight text-foreground">
          {rangeLabel}
        </h2>

        <ToggleGroup
          value={[viewType]}
          onValueChange={(values) => {
            const next = values[0] as CalendarViewType | undefined;
            if (next) onViewChange(next);
          }}
          size="sm"
          variant="outline"
          aria-label={t("Cambiar vista del calendario")}
        >
          {VIEW_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.key} value={option.key}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("Buscar paciente")}
            aria-label={t("Buscar paciente por nombre")}
            className="h-8 w-44 pl-8 text-[12.5px]"
          />
        </div>

        <Button size="sm" onClick={onNewAppointment} className="shadow-sm">
          <Plus data-icon="inline-start" /> {t("Nueva cita")}
        </Button>
      </div>

      {/* Fila 2: KPIs + filtros por estado */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: kpi.dot }}
                aria-hidden="true"
              />
              <span className="text-[11.5px] font-medium text-muted-foreground">
                {kpi.label}
              </span>
              <span className="text-[13px] font-bold text-foreground">
                {kpi.value}
              </span>
            </div>
          ))}
        </div>

        <div
          className="ml-auto flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label={t("Filtrar por estado")}
        >
          {FILTER_STATUSES.map((status) => {
            const active = statuses?.includes(status) ?? false;
            const count = countsByStatus.get(status) ?? 0;
            const color = appointmentStatusColor(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => onToggleStatus(status)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-transparent shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
                style={
                  active
                    ? { backgroundColor: color.bg, color: color.text }
                    : undefined
                }
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: appointmentStatusDot(status) }}
                  aria-hidden="true"
                />
                {appointmentStatusLabel[status]}
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10.5px] font-bold",
                      active ? "" : "bg-muted",
                    )}
                    style={
                      active
                        ? { backgroundColor: "rgba(0,0,0,0.08)" }
                        : undefined
                    }
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {activeFilterCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11.5px] text-muted-foreground"
              onClick={onClearFilters}
            >
              <X className="size-3.5" data-icon="inline-start" />
              {t("Limpiar filtros")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
