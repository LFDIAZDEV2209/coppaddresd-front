/**
 * Paso de clínicas — compartido entre profesional y empleado.
 * En modo profesional cada clínica puede llevar un rol distinto
 * (se preselecciona "Professional" y es editable por clínica).
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type OrganizationTree,
  type ProfessionalClinicAssignment,
} from "@/features/professionals/services/employees-service";
import type { Role } from "@/features/roles/types";
import { cn } from "@/lib/utils";
import type { FormState, Mode } from "../wizard-state";

interface ClinicsStepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
  organizations: OrganizationTree[];
  roles: Role[];
  mode: Mode;
  loading?: boolean;
}

export function ClinicsStep({
  form,
  setForm,
  onNext,
  onBack,
  organizations,
  roles,
  mode,
  loading = false,
}: ClinicsStepProps) {
  const t = useT();

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  // Roles activos del catálogo para el selector por clínica.
  const activeRoles = useMemo(() => roles.filter((r) => r.isActive), [roles]);

  // Rol clínico por defecto: "Professional" (case-insensitive).
  const professionalRoleId = useMemo(
    () =>
      roles.find((r) => r.name.toLowerCase() === "professional")?.id ?? null,
    [roles],
  );

  // Las clínicas son opcionales: el backend acepta empleados sin asignaciones
  // (scoped assignments quedan vacíos y la invitación no lleva scopes).
  const canContinue = form.organizationId !== "";

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
      // En modo profesional la clínica se agrega con el rol "Professional"
      // preseleccionado (editable por clínica). En empleado queda sin rol.
      const item: ProfessionalClinicAssignment = {
        clinicId,
        isPrimary: f.clinicAssignments.length === 0,
        status: "Active",
        roleId: mode === "professional" ? professionalRoleId : null,
        locationIds: [],
      };
      return {
        ...f,
        clinicAssignments: [...f.clinicAssignments, item],
      };
    });
  }, [setForm, mode, professionalRoleId]);

  // Cambiar el rol asignado a una clínica ("" = sin rol).
  const setClinicRole = useCallback(
    (clinicId: string, roleId: string) => {
      setForm((f) => ({
        ...f,
        clinicAssignments: f.clinicAssignments.map((c) =>
          c.clinicId === clinicId ? { ...c, roleId: roleId || null } : c,
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
        title={t("Clínicas")}
        description={t("Organización y sedes")}
        icon={Building2}
        variant="primary"
      />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t("Organización")}</label>
          <Select
            value={loading ? "" : form.organizationId}
            onValueChange={(value) =>
              setForm({
                ...form,
                organizationId: value ?? "",
                clinicAssignments: [],
                schedules: {},
              })
            }
            disabled={loading}
          >
            <SelectTrigger
              aria-label={t("Organización")}
              className="h-9! w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {loading && <SelectItem value="">{t("Cargando...")}</SelectItem>}
              {organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <p className="max-w-sm text-[12.5px] font-medium text-foreground">
                {t("Esta organización aún no tiene clínicas.")}
              </p>
              <p className="max-w-sm text-[12px] text-muted-foreground">
                {t(
                  "Podés continuar sin asignar clínicas y hacerlo después desde el perfil.",
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
                      {mode === "professional" && (
                        <div className="flex w-full flex-col gap-1.5 sm:w-44 sm:shrink-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("Rol en esta clínica")}
                          </p>
                          <Select
                            value={assignment.roleId ?? ""}
                            onValueChange={(value) =>
                              setClinicRole(clinic.id, value ?? "")
                            }
                          >
                            <SelectTrigger
                              aria-label={t("Rol en esta clínica")}
                              className="h-9! w-full"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeRoles.length === 0 ? (
                                <SelectItem value="">
                                  {t("Cargando...")}
                                </SelectItem>
                              ) : (
                                activeRoles.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
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
