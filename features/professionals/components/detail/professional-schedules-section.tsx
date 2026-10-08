"use client";

/**
 * Sección "Horarios" del detalle del profesional: tabla semanal
 * Día | Inicio | Fin en modo lectura, con skeleton, estado vacío guiado,
 * error con reintento y edición inline para usuarios con
 * Professionals.Update.
 * Contrato: GET/PUT /api/v1/professionals/{id}/schedules (weekday 1–7 ISO,
 * "HH:mm" sin zona; la hora es la local de la clínica — ver tooltip).
 */

import { useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { CalendarClock, Clock, Info, Pencil, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useProfessionalSchedules } from "../../hooks/use-professional-schedules";
import { ScheduleEditForm } from "./schedule-edit-form";
import {
  WEEKDAY_KEYS,
  type ProfessionalScheduleDto,
} from "../../types/schedule";

/** Franja mostrada ordenada por weekday (1=lunes … 7=domingo). */
function sortByWeekday(rows: ProfessionalScheduleDto[]) {
  return [...rows].sort((a, b) => a.weekday - b.weekday);
}

export function ProfessionalSchedulesSection({
  professionalId,
}: {
  /** Id de la extensión profesional (employee.professional?.id). */
  professionalId: string | null;
}) {
  const t = useT();
  const { can } = useAppContext();
  const canEdit = can("Professionals.Update");

  const {
    schedules,
    isLoading,
    error,
    isEditing,
    draft,
    updateDraft,
    isSaving,
    saveError,
    startEdit,
    cancelEdit,
    save,
    retry,
    clearSaveError,
  } = useProfessionalSchedules(professionalId);

  // Toast efímero del resultado de guardado (patrón de media-page).
  const [toast, setToastState] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const setToast = (next: { kind: "ok" | "error"; text: string } | null) => {
    setToastState(next);
    if (next) setTimeout(() => setToastState(null), 4000);
  };

  /** Guardar con feedback tipo toast (éxito vuelve a modo lectura). */
  const onSave = async () => {
    const ok = await save();
    if (ok) {
      setToast({ kind: "ok", text: t("Horarios actualizados") });
    } else {
      setToast({
        kind: "error",
        text: saveError ?? t("No se pudieron guardar los horarios."),
      });
      clearSaveError();
    }
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Horarios")}
    >
      <SectionHeader
        title={t("Horarios")}
        description={t("Atención semanal para agendar citas")}
        icon={CalendarClock}
        variant="primary"
        actions={
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className="text-current opacity-80"
                  aria-label={t("Hora local de la clínica")}
                >
                  <Info className="size-4" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>
                  {t(
                    "Hora local de la clínica, sin zona horaria (formato HH:mm)",
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canEdit &&
              !isEditing &&
              !isLoading &&
              !error &&
              schedules.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20"
                  onClick={startEdit}
                >
                  <Pencil data-icon="inline-start" />
                  {schedules.length > 0
                    ? t("Editar")
                    : t("Configurar horarios")}
                </Button>
              )}
          </>
        }
      />

      <div className="space-y-3 p-5">
        {toast && (
          <div
            className={`animate-slide-down rounded-xl px-4 py-3 text-[13px] ${
              toast.kind === "ok"
                ? "bg-success-soft text-success-soft-foreground"
                : "bg-destructive-soft text-destructive"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.text}
          </div>
        )}

        {isLoading ? (
          // Skeleton con la forma de la tabla de horarios.
          <div aria-hidden="true" className="space-y-2">
            <Skeleton className="h-4 w-2/3 rounded-lg" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive-soft/40 p-5 text-center">
            <p className="text-sm font-semibold text-destructive">
              {t("No se pudieron cargar los horarios")}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="mx-auto"
            >
              <RefreshCw data-icon="inline-start" />
              {t("Reintentar")}
            </Button>
          </div>
        ) : isEditing && draft !== null ? (
          <ScheduleEditForm
            rows={draft}
            onChange={updateDraft}
            isSaving={isSaving}
            onSave={onSave}
            onCancel={cancelEdit}
          />
        ) : schedules.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Día")}</TableHead>
                <TableHead>{t("Inicio")}</TableHead>
                <TableHead>{t("Fin")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortByWeekday(schedules).map((slot) => (
                <TableRow key={slot.weekday}>
                  <TableCell className="text-[13px] font-semibold">
                    {t(WEEKDAY_KEYS[slot.weekday] ?? String(slot.weekday))}
                  </TableCell>
                  <TableCell className="font-mono text-[13px] tabular-nums">
                    {slot.startTime.slice(0, 5)}
                  </TableCell>
                  <TableCell className="font-mono text-[13px] tabular-nums">
                    {slot.endTime.slice(0, 5)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          // Vacío: profesional sin horarios aún (dar de alta vía edición).
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Clock className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {t("Este profesional no tiene horarios configurados")}
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {t(
                  "Sin horarios el paciente no verá su disponibilidad para agendar citas",
                )}
              </p>
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil data-icon="inline-start" />
                {t("Configurar horarios")}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
