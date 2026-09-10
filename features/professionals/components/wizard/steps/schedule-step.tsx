/**
 * Paso de horarios de atención — extraído del monolito ProfessionalWizard
 * (paso 4, líneas 1100–1383). Al enviar, se mapea a PUT
 * /api/v1/professionals/{id}/schedules con weekday 1=lun..7=dom.
 * Solo se muestra en modo profesional.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Clock,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type {
  OrganizationTree,
} from "@/features/professionals/services/employees-service";
import { cn } from "@/lib/utils";
import {
  type FormState,
  DAY_ORDER,
  DAY_LABELS,
  defaultSchedule,
} from "../wizard-state";

interface ScheduleStepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
  organizations: OrganizationTree[];
}

export function ScheduleStep({
  form,
  setForm,
  onNext,
  onBack,
  organizations,
}: ScheduleStepProps) {
  const t = useT();

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  const assignedClinics = useMemo(
    () =>
      activeOrg?.clinics.filter((c) =>
        form.clinicAssignments.some((a) => a.clinicId === c.id),
      ) ?? [],
    [activeOrg, form.clinicAssignments],
  );

  const updateSchedule = useCallback(
    (clinicId: string, patch: Record<string, unknown>) => {
      setForm((f) => ({
        ...f,
        schedules: {
          ...f.schedules,
          [clinicId]: {
            ...(f.schedules[clinicId] ?? defaultSchedule()),
            ...patch,
          },
        },
      }));
    },
    [setForm],
  );

  const toggleDay = useCallback(
    (clinicId: string, day: (typeof DAY_ORDER)[number]) => {
      setForm((f) => {
        const schedule = f.schedules[clinicId] ?? defaultSchedule();
        const slot = schedule.days[day];
        const nextDays = {
          ...schedule.days,
          [day]: { ...slot, enabled: !slot.enabled },
        };
        return {
          ...f,
          schedules: {
            ...f.schedules,
            [clinicId]: { ...schedule, days: nextDays },
          },
        };
      });
    },
    [setForm],
  );

  const updateDayTime = useCallback(
    (
      clinicId: string,
      day: (typeof DAY_ORDER)[number],
      patch: { start?: string; end?: string },
    ) => {
      setForm((f) => {
        const schedule = f.schedules[clinicId] ?? defaultSchedule();
        const nextDays = {
          ...schedule.days,
          [day]: { ...schedule.days[day], ...patch },
        };
        return {
          ...f,
          schedules: {
            ...f.schedules,
            [clinicId]: { ...schedule, days: nextDays },
          },
        };
      });
    },
    [setForm],
  );

  const applySameTimeToAll = useCallback(
    (clinicId: string, start: string, end: string) => {
      setForm((f) => {
        const schedule = f.schedules[clinicId] ?? defaultSchedule();
        const nextDays = { ...schedule.days };
        for (const day of DAY_ORDER) {
          if (nextDays[day].enabled) {
            nextDays[day] = { ...nextDays[day], start, end };
          }
        }
        return {
          ...f,
          schedules: {
            ...f.schedules,
            [clinicId]: { ...schedule, days: nextDays },
          },
        };
      });
    },
    [setForm],
  );

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Horarios de atención")}
        description={t(
          "Disponibilidad del profesional para agendar citas, por clínica",
        )}
        icon={CalendarClock}
        variant="primary"
      />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {assignedClinics.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Building2 className="size-6" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">
                {t("Primero asigna una clínica")}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {t(
                  "Los horarios se configuran por clínica. Regresa al paso anterior y selecciona al menos una clínica.",
                )}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onBack}>
              <ArrowLeft data-icon="inline-start" />
              {t("Ir a clínicas y permisos")}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-muted-foreground">
              {t(
                "Define cuándo puede recibir citas el profesional en cada clínica. El horario estándar de la plataforma es de",
              )}{" "}
              <strong className="text-foreground">8:00 a 17:00</strong>,{" "}
              {t("lunes a viernes")}.
            </p>

            <div className="flex flex-col gap-4">
              {assignedClinics.map((clinic) => {
                const schedule =
                  form.schedules[clinic.id] ?? defaultSchedule();
                const enabledDays = DAY_ORDER.filter(
                  (d) => schedule.days[d].enabled,
                );
                const firstEnabled = enabledDays[0];
                const hasCustom = schedule.enabled;
                return (
                  <div
                    key={clinic.id}
                    className={cn(
                      "overflow-hidden rounded-xl border transition-colors",
                      hasCustom ? "border-primary/40" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            hasCustom
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Building2 className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">
                            {clinic.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {hasCustom
                              ? `${enabledDays.length} día(s) de atención`
                              : t("Horario estándar de la plataforma")}
                          </p>
                        </div>
                      </div>
                      <label className="flex shrink-0 items-center gap-2 text-[12px] font-medium">
                        {t("Horario personalizado")}
                        <Switch
                          checked={hasCustom}
                          onCheckedChange={(checked: boolean) =>
                            updateSchedule(clinic.id, {
                              enabled: checked,
                            })
                          }
                        />
                      </label>
                    </div>

                    {hasCustom && (
                      <div className="animate-fade-in flex flex-col gap-4 p-4">
                        {/* Días de la semana */}
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                            <span className="flex size-5 items-center justify-center rounded-md bg-muted">
                              <CalendarClock className="size-3.5" />
                            </span>
                            {t("Días de atención")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {DAY_ORDER.map((day) => {
                              const on = schedule.days[day].enabled;
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() =>
                                    toggleDay(clinic.id, day)
                                  }
                                  aria-pressed={on}
                                  title={DAY_LABELS[day].full}
                                  className={cn(
                                    "flex min-w-11 flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 transition-colors",
                                    on
                                      ? "border-[var(--sidebar)] bg-[var(--sidebar)] text-white shadow-sm"
                                      : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:text-foreground",
                                  )}
                                >
                                  <span className="text-[12.5px] font-bold leading-tight">
                                    {DAY_LABELS[day].short}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[9px] leading-tight tabular-nums",
                                      on
                                        ? "text-white/80"
                                        : "text-foreground/50",
                                    )}
                                  >
                                    {on
                                      ? schedule.days[day].start.slice(
                                          0,
                                          5,
                                        )
                                      : "—"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mismo horario + rangos */}
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                            <span className="flex items-center gap-2 text-[12.5px] font-medium">
                              <span className="flex size-5 items-center justify-center rounded-md bg-muted">
                                <Clock className="size-3.5 text-muted-foreground" />
                              </span>
                              {t("Mismo horario todos los días")}
                              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                ({t("se aplica a los días marcados")})
                              </span>
                            </span>
                            <Switch
                              checked={schedule.sameEveryDay}
                              onCheckedChange={(checked: boolean) =>
                                updateSchedule(clinic.id, {
                                  sameEveryDay: checked,
                                })
                              }
                            />
                          </label>

                          {schedule.sameEveryDay ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium">
                                  {t("Desde")}
                                </label>
                                <Input
                                  type="time"
                                  value={
                                    schedule.days[firstEnabled ?? "mon"]
                                      .start
                                  }
                                  onChange={(e) =>
                                    applySameTimeToAll(
                                      clinic.id,
                                      e.target.value,
                                      schedule.days[
                                        firstEnabled ?? "mon"
                                      ].end,
                                    )
                                  }
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium">
                                  {t("Hasta")}
                                </label>
                                <Input
                                  type="time"
                                  value={
                                    schedule.days[firstEnabled ?? "mon"]
                                      .end
                                  }
                                  onChange={(e) =>
                                    applySameTimeToAll(
                                      clinic.id,
                                      schedule.days[
                                        firstEnabled ?? "mon"
                                      ].start,
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {DAY_ORDER.filter(
                                (d) => schedule.days[d].enabled,
                              ).map((day) => (
                                <div
                                  key={day}
                                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2"
                                >
                                  <span className="w-16 text-[12px] font-semibold">
                                    {DAY_LABELS[day].full}
                                  </span>
                                  <div className="flex flex-1 items-center gap-2">
                                    <Input
                                      type="time"
                                      value={schedule.days[day].start}
                                      onChange={(e) =>
                                        updateDayTime(clinic.id, day, {
                                          start: e.target.value,
                                        })
                                      }
                                      aria-label={`Inicio ${DAY_LABELS[day].full}`}
                                      className="w-full sm:w-32"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      a
                                    </span>
                                    <Input
                                      type="time"
                                      value={schedule.days[day].end}
                                      onChange={(e) =>
                                        updateDayTime(clinic.id, day, {
                                          end: e.target.value,
                                        })
                                      }
                                      aria-label={`Fin ${DAY_LABELS[day].full}`}
                                      className="w-full sm:w-32"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {enabledDays.length === 0 && (
                            <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning-foreground">
                              {t(
                                "Marca al menos un día de atención para esta clínica.",
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft data-icon="inline-start" />
                {t("Atrás")}
              </Button>
              <Button onClick={onNext}>
                {t("Continuar")}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
