/**
 * Paso de revisión — adapta el resumen al modo activo.
 * - Profesional: identidad + profesión + clínicas + horarios + invitación
 * - Empleado: identidad + clínicas + puesto + invitación
 * - Paciente: identidad + clínica
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useMemo } from "react";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  GraduationCap,
  Loader2,
  MailPlus,
  Send,
  Stethoscope,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  type OrganizationTree,
} from "@/features/professionals/services/employees-service";
import {
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "@/features/professionals/services/professional-catalogs-service";
import type { Role } from "@/features/roles/types";
import { ReviewEditButton } from "../shared";
import {
  type FormState,
  type Mode,
  DAY_ORDER,
  DAY_LABELS,
  defaultSchedule,
} from "../wizard-state";

interface ReviewStepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  organizations: OrganizationTree[];
  types: ProfessionalTypeDto[];
  specialties: SpecialtyDto[];
  roles: Role[];
}

export function ReviewStep({
  form,
  setForm,
  onNext,
  onBack,
  saving,
  organizations,
  types,
  specialties,
  roles,
}: ReviewStepProps) {
  const t = useT();
  const mode = form.mode as Mode;

  const isProfessional = mode === "professional";
  const isEmployee = mode === "employee";
  const isPatient = mode === "patient";

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  const selectedType = useMemo(
    () => types.find((tp) => tp.id === form.professionalTypeId) ?? null,
    [types, form.professionalTypeId],
  );

  const summaryClinics = form.clinicAssignments
    .map((c) => {
      const clinic = activeOrg?.clinics.find((x) => x.id === c.clinicId);
      const locations =
        clinic?.locations.filter((l) => c.locationIds.includes(l.id)) ?? [];
      // Rol elegido por clínica (solo modo profesional).
      const roleName =
        isProfessional && c.roleId
          ? roles.find((r) => r.id === c.roleId)?.name
          : undefined;
      return { clinic, locations, roleName };
    })
    .filter((s) => s.clinic);

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Revisa y envía")}
        description={t("Confirma los datos antes de crear")}
        icon={Send}
        variant="primary"
      />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="overflow-hidden rounded-xl border border-border">
          {/* Datos de identidad */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-muted/20 p-4 text-[13px] sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Nombre")}
              </p>
              <p className="mt-0.5 truncate font-medium">
                {form.firstName} {form.lastName}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Correo")}
              </p>
              <p className="mt-0.5 truncate font-medium">
                {form.email || "—"}
              </p>
            </div>
            {!isPatient && (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Organización")}
                </p>
                <p className="mt-0.5 truncate font-medium">
                  {activeOrg?.name ?? "—"}
                </p>
              </div>
            )}
            {isPatient && form.phone && (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Teléfono")}
                </p>
                <p className="mt-0.5 truncate font-medium">{form.phone}</p>
              </div>
            )}
            {isPatient && form.documentNumber && (
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Documento")}
                </p>
                <p className="mt-0.5 truncate font-medium">
                  {form.documentNumber}
                </p>
              </div>
            )}
          </div>

          {/* Clínica del paciente */}
          {isPatient && summaryClinics.length > 0 && (
            <div className="border-t border-border p-4">
              <p className="text-[12px] font-semibold text-muted-foreground">
                {t("Clínica")}
              </p>
              <p className="mt-1 text-[12.5px]">
                {summaryClinics.map(({ clinic }) => clinic!.name).join(", ")}
              </p>
            </div>
          )}

          {/* Profesión (solo profesional) — sección reordenada: va antes de clínicas */}
          {isProfessional && form.professionalTypeId && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <Stethoscope className="size-3.5" />
                  {t("Profesión")}
                </p>
              </div>
              <p className="mt-1 min-w-0 text-[12.5px]">
                {selectedType?.name}
                {form.specialtyIds.length > 0 &&
                  ` · ${form.specialtyIds
                    .map(
                      (id) =>
                        specialties.find((s) => s.id === id)?.name,
                    )
                    .filter(Boolean)
                    .join(", ")}`}
              </p>
            </div>
          )}

          {/* Clínicas (profesional/empleado) — después de profesión en modo profesional */}
          {!isPatient && summaryClinics.length > 0 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-muted-foreground">
                  {t("Clínicas")}
                </p>
                <ReviewEditButton onClick={onBack} />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {summaryClinics.map(({ clinic, locations, roleName }) => (
                  <div
                    key={clinic!.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[12.5px]"
                  >
                    <span className="font-semibold">{clinic!.name}</span>
                    {locations.length > 0 && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="min-w-0 truncate text-muted-foreground">
                          {t("Sedes")}:{" "}
                          {locations.map((l) => l.name).join(", ")}
                        </span>
                      </>
                    )}
                    {isProfessional && roleName && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {roleName}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Puesto (solo empleado) */}
          {isEmployee && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <Briefcase className="size-3.5" />
                  {t("Puesto")}
                </p>
              </div>
              <p className="mt-1 text-[12.5px]">
                {form.jobTitle}
                {form.department && (
                  <span className="text-muted-foreground">
                    {" "}
                    · {form.department}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Horarios de atención (solo profesional) */}
          {isProfessional && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <CalendarClock className="size-3.5" />
                  {t("Horarios de atención")}
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {summaryClinics.map(({ clinic }) => {
                  const schedule =
                    form.schedules[clinic!.id] ?? defaultSchedule();
                  const enabledDays = DAY_ORDER.filter(
                    (d) => schedule.days[d].enabled,
                  );
                  return (
                    <div
                      key={clinic!.id}
                      className="rounded-lg bg-muted/40 px-3 py-2 text-[12.5px]"
                    >
                      <span className="font-semibold">
                        {clinic!.name}:{" "}
                      </span>
                      {!schedule.enabled ? (
                        <span className="text-muted-foreground">
                          {t("Horario estándar (lun–vie 8:00–17:00)")}
                        </span>
                      ) : enabledDays.length === 0 ? (
                        <span className="text-warning-foreground">
                          {t(
                            "Sin días de atención configurados",
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {enabledDays
                            .map(
                              (d) =>
                                `${DAY_LABELS[d].short} ${schedule.days[d].start}–${schedule.days[d].end}`,
                            )
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Invitación (profesional/empleado) */}
        {!isPatient && (
          <label className="flex items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={form.sendInvitation}
              onChange={(e) =>
                setForm({ ...form, sendInvitation: e.target.checked })
              }
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                <MailPlus className="size-4 text-primary" />
                {t("Enviar invitación por correo ahora")}
              </span>
              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                {t(
                  "El profesional recibirá un enlace de primer acceso (válido por 72 h). Si lo desactivas, podrás invitarlo después desde su perfil.",
                )}
              </span>
            </span>
          </label>
        )}

        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          <Button onClick={onNext} disabled={saving}>
            {saving ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <GraduationCap data-icon="inline-start" />
            )}
            {isPatient ? t("Crear paciente") : t("Crear e invitar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
