/**
 * Paso de clínicas y permisos — compartido entre profesional y empleado.
 * Extraído del monolito ProfessionalWizard (paso 2, líneas 761–957).
 * Requiere organizations, roles y las funciones de toggle/assignment.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  type OrganizationTree,
  type ProfessionalClinicAssignment,
} from "@/features/professionals/services/employees-service";
import type { Role } from "@/features/roles/types";
import { cn } from "@/lib/utils";
import type { FormState } from "../wizard-state";

interface ClinicsStepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
  organizations: OrganizationTree[];
  roles: Role[];
}

export function ClinicsStep({
  form,
  setForm,
  onNext,
  onBack,
  organizations,
  roles,
}: ClinicsStepProps) {
  const t = useT();

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  const canContinue =
    form.organizationId !== "" && form.clinicAssignments.length > 0;

  const toggleClinic = useCallback((clinicId: string) => {
    setForm((f) => {
      const exists = f.clinicAssignments.some((c) => c.clinicId === clinicId);
      if (exists) {
        const rest = { ...f.schedules };
        delete rest[clinicId];
        return {
          ...f,
          clinicAssignments: f.clinicAssignments.filter(
            (c) => c.clinicId !== clinicId,
          ),
          schedules: rest,
        };
      }
      const item: ProfessionalClinicAssignment = {
        clinicId,
        isPrimary: f.clinicAssignments.length === 0,
        status: "Active",
        roleId: null,
        locationIds: [],
      };
      return {
        ...f,
        clinicAssignments: [...f.clinicAssignments, item],
      };
    });
  }, [setForm]);

  const updateAssignment = useCallback(
    (clinicId: string, patch: Partial<ProfessionalClinicAssignment>) => {
      setForm((f) => ({
        ...f,
        clinicAssignments: f.clinicAssignments.map((c) =>
          c.clinicId === clinicId ? { ...c, ...patch } : c,
        ),
      }));
    },
    [setForm],
  );

  const toggleLocation = useCallback(
    (clinicId: string, locationId: string) => {
      setForm((f) => ({
        ...f,
        clinicAssignments: f.clinicAssignments.map((c) => {
          if (c.clinicId !== clinicId) return c;
          const has = c.locationIds.includes(locationId);
          return {
            ...c,
            locationIds: has
              ? c.locationIds.filter((l) => l !== locationId)
              : [...c.locationIds, locationId],
          };
        }),
      }));
    },
    [setForm],
  );

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Clínicas y permisos")}
        description={t("Organización, sedes y rol por clínica")}
        icon={Building2}
        variant="primary"
      />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t("Organización")}</label>
          <NativeSelect
            value={form.organizationId}
            onChange={(value) =>
              setForm({
                ...form,
                organizationId: value,
                clinicAssignments: [],
                schedules: {},
              })
            }
            options={organizations.map((o) => ({
              value: o.id,
              label: o.name,
            }))}
            ariaLabel={t("Organización")}
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] font-semibold text-muted-foreground">
            {t("Clínicas asignadas")}
            {form.clinicAssignments.length > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                {form.clinicAssignments.length}
              </span>
            )}
          </p>
          {activeOrg && activeOrg.clinics.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
                <Building2 className="size-5" />
              </span>
              <p className="max-w-sm text-[12.5px] text-muted-foreground">
                {t(
                  "Esta organización no tiene clínicas. Selecciona otra organización para continuar.",
                )}
              </p>
            </div>
          ) : (
            activeOrg?.clinics.map((clinic) => {
              const assignment = form.clinicAssignments.find(
                (c) => c.clinicId === clinic.id,
              );
              const selected = Boolean(assignment);
              return (
                <div
                  key={clinic.id}
                  className={cn(
                    "overflow-hidden rounded-xl border transition-colors",
                    selected
                      ? "border-primary/50 bg-primary/[0.04]"
                      : "border-border hover:border-border",
                  )}
                >
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleClinic(clinic.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {clinic.name}
                      </span>
                      <span className="block text-[11.5px] text-muted-foreground">
                        {clinic.locations.length}{" "}
                        {clinic.locations.length === 1
                          ? t("sede")
                          : t("sedes")}
                      </span>
                    </span>
                    {assignment && clinic.locations.length === 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {t("Sin sedes para asignar")}
                      </span>
                    )}
                  </label>

                  {assignment && (
                    <div className="animate-fade-in flex flex-col gap-4 border-t border-border/60 bg-background/50 px-4 py-4 sm:flex-row sm:items-start sm:gap-5">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("Rol en esta clínica")}
                        </p>
                        <NativeSelect
                          value={assignment.roleId ?? ""}
                          onChange={(value) =>
                            updateAssignment(clinic.id, {
                              roleId: value || null,
                            })
                          }
                          options={[
                            { value: "", label: t("— Sin rol —") },
                            ...roles.map((r) => ({
                              value: r.id,
                              label: r.name,
                            })),
                          ]}
                          ariaLabel={t("Rol en {clinic}", {
                            clinic: clinic.name,
                          })}
                        />
                      </div>
                      {clinic.locations.length > 0 && (
                        <div className="flex flex-1 flex-col gap-1.5">
                          <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            <MapPin className="size-3" />
                            {t("Sedes asignadas")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {clinic.locations.map((loc) => {
                              const on =
                                assignment.locationIds.includes(loc.id);
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() =>
                                    toggleLocation(clinic.id, loc.id)
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                                    on
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary/40"
                                  }`}
                                >
                                  {on && (
                                    <CheckCircle2 className="size-3" />
                                  )}
                                  {loc.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            clinicAssignments: f.clinicAssignments.map(
                              (c) => ({
                                ...c,
                                isPrimary: c.clinicId === clinic.id,
                              }),
                            ),
                          }))
                        }
                        aria-pressed={assignment.isPrimary}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full border px-3 text-[12px] font-semibold transition-colors",
                          assignment.isPrimary
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {assignment.isPrimary && (
                          <CheckCircle2 className="size-3.5" />
                        )}
                        {t("Clínica principal")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            {t("Continuar")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
