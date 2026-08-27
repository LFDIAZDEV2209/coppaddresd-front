"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MailPlus,
  MapPin,
  Send,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  fetchOrganizationTree,
  createProfessional,
  type OrganizationTree,
  type ProfessionalClinicAssignment,
} from "@/features/professionals/services/employees-service";
import {
  fetchProfessionalTypes,
  fetchSpecialties,
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "@/features/professionals/services/professional-catalogs-service";
import { fetchRoles } from "@/features/roles/services/roles-service";
import type { Role } from "@/features/roles/types";
import { ApiError } from "@/lib/api/http";

const SPECIALTY_CATEGORIES = [
  "Medicina",
  "Nutrición",
  "Salud mental",
  "Enfermería",
  "Terapia",
  "Coordinación",
  "Fitness",
];

const STEPS = [
  { label: "Datos básicos", icon: UserRound },
  { label: "Clínicas y permisos", icon: Building2 },
  { label: "Profesión", icon: Stethoscope },
  { label: "Revisar y enviar", icon: Send },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organizationId: string;
  clinicAssignments: ProfessionalClinicAssignment[];
  professionalTypeId: string;
  specialtyIds: string[];
  sendInvitation: boolean;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  organizationId: "",
  clinicAssignments: [],
  professionalTypeId: "",
  specialtyIds: [],
  sendInvitation: true,
};

export function ProfessionalWizard() {
  const t = useT();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [organizations, setOrganizations] = useState<OrganizationTree[]>([]);
  const [types, setTypes] = useState<ProfessionalTypeDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [orgs, ts, ss, rs] = await Promise.all([
          fetchOrganizationTree(),
          fetchProfessionalTypes(),
          fetchSpecialties(),
          fetchRoles(),
        ]);
        if (cancelled) return;
        setOrganizations(orgs);
        setTypes(ts);
        setSpecialties(ss);
        setRoles(rs);
        if (orgs.length > 0) {
          setForm((f) => ({ ...f, organizationId: orgs[0].id }));
        }
      } catch {
        if (!cancelled) setError(t("No se pudieron cargar los catálogos. Intenta nuevamente."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  const selectedType = useMemo(
    () => types.find((pt) => pt.id === form.professionalTypeId) ?? null,
    [types, form.professionalTypeId],
  );

  const validSpecialtyIds = useMemo(
    () => new Set(selectedType?.validSpecialtyIds ?? []),
    [selectedType],
  );

  const specialtiesByCategory = useMemo(() => {
    const valid = specialties.filter((s) => validSpecialtyIds.has(s.id));
    return SPECIALTY_CATEGORIES.map((category) => ({
      category,
      items: valid.filter((s) => s.category === category),
    })).filter((g) => g.items.length > 0);
  }, [specialties, validSpecialtyIds]);

  const canContinueStep0 =
    form.firstName.trim() !== "" && form.lastName.trim() !== "" && /\S+@\S+\.\S+/.test(form.email);

  const canContinueStep1 =
    form.organizationId !== "" && form.clinicAssignments.length > 0;

  const toggleClinic = useCallback(
    (clinicId: string) => {
      setForm((f) => {
        const exists = f.clinicAssignments.some((c) => c.clinicId === clinicId);
        if (exists) {
          return {
            ...f,
            clinicAssignments: f.clinicAssignments.filter((c) => c.clinicId !== clinicId),
          };
        }
        const item: ProfessionalClinicAssignment = {
          clinicId,
          isPrimary: f.clinicAssignments.length === 0,
          status: "Active",
          roleId: null,
          locationIds: [],
        };
        return { ...f, clinicAssignments: [...f.clinicAssignments, item] };
      });
    },
    [],
  );

  const updateAssignment = useCallback(
    (clinicId: string, patch: Partial<ProfessionalClinicAssignment>) => {
      setForm((f) => ({
        ...f,
        clinicAssignments: f.clinicAssignments.map((c) =>
          c.clinicId === clinicId ? { ...c, ...patch } : c,
        ),
      }));
    },
    [],
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
    [],
  );

  const toggleSpecialty = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      specialtyIds: f.specialtyIds.includes(id)
        ? f.specialtyIds.filter((x) => x !== id)
        : [...f.specialtyIds, id],
    }));
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await createProfessional({
        organizationId: form.organizationId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phone.trim() || null,
        phoneCountryCode: form.phone.startsWith("+") ? null : "1",
        professionalTypeId: form.professionalTypeId || null,
        clinics: form.clinicAssignments,
        specialtyIds: form.specialtyIds,
        sendInvitation: form.sendInvitation,
      });
      router.push(`/professionals/${result.employeeId}`);
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError
          ? err.message
          : t("No se pudo crear el profesional. Intenta nuevamente."),
      );
    }
  };

  const summaryClinics = form.clinicAssignments
    .map((c) => {
      const clinic = activeOrg?.clinics.find((x) => x.id === c.clinicId);
      const role = roles.find((r) => r.id === c.roleId);
      const locations = clinic?.locations.filter((l) => c.locationIds.includes(l.id)) ?? [];
      return { clinic, role, locations };
    })
    .filter((s) => s.clinic);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t("Cargando catálogos...")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        title={t("Nuevo profesional")}
        description={t("Crea el perfil, asigna sus clínicas y permisos, y envía la invitación por correo para que complete su acceso.")}
        icon={Stethoscope}
      />

      {/* Stepper */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === i;
          const done = step > i;
          return (
            <div key={s.label} className="flex flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  done || active ? "bg-primary" : "bg-muted"
                }`}
              />
              <span
                className={`flex items-center gap-1.5 text-[11px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="size-3 text-primary" /> : <Icon className="size-3" />}
                {t(s.label)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {/* Paso 1: datos básicos */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <UserRound className="size-4 text-primary" />
                {t("Datos del profesional")}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {t("Solo los datos mínimos: el profesional completará su perfil al recibir la invitación.")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Nombre")}>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Jane"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Field>
              <Field label={t("Apellido")}>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Doe"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Field>
              <Field label={t("Correo electrónico")}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane.doe@mediquer.com"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Field>
              <Field label={t("Teléfono (opcional)")}>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="555-010-2244"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!canContinueStep0}>
                {t("Continuar")}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: organización, clínicas y permisos */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Building2 className="size-4 text-primary" />
                {t("Organización, clínicas y permisos")}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {t("Elige la organización y las clínicas donde trabajará. El rol se asigna")}
                <strong>{t(" por clínica")}</strong>{t(": el profesional puede tener permisos distintos en cada una.")}
              </p>
            </div>

            <Field label={t("Organización")}>
              <select
                value={form.organizationId}
                onChange={(e) =>
                  setForm({ ...form, organizationId: e.target.value, clinicAssignments: [] })
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-3">
              <p className="text-[12.5px] font-semibold text-muted-foreground">
                {t("Clínicas asignadas")}
              </p>
              {activeOrg?.clinics.map((clinic) => {
                const assignment = form.clinicAssignments.find((c) => c.clinicId === clinic.id);
                const selected = Boolean(assignment);
                return (
                  <div
                    key={clinic.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      selected ? "border-primary/50 bg-primary/5" : "border-border"
                    }`}
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleClinic(clinic.id)}
                        className="mt-0.5 size-4 accent-[var(--primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">{clinic.name}</span>
                        <span className="block text-[11.5px] text-muted-foreground">
                          {t("{count} sede(s)", { count: String(clinic.locations.length) })}
                        </span>
                      </span>
                    </label>

                    {assignment && (
                      <div className="mt-3 space-y-3 pl-7">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={t("Rol en esta clínica")}>
                            <select
                              value={assignment.roleId ?? ""}
                              onChange={(e) =>
                                updateAssignment(clinic.id, {
                                  roleId: e.target.value || null,
                                })
                              }
                              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                              <option value="">{t("— Sin rol —")}</option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <label className="flex items-end gap-2 pb-2.5">
                            <input
                              type="checkbox"
                              checked={assignment.isPrimary}
                              onChange={() =>
                                setForm((f) => ({
                                  ...f,
                                  clinicAssignments: f.clinicAssignments.map((c) => ({
                                    ...c,
                                    isPrimary: c.clinicId === clinic.id,
                                  })),
                                }))
                              }
                              className="size-4 accent-[var(--primary)]"
                            />
                            <span className="text-[12.5px] font-medium">{t("Clínica principal")}</span>
                          </label>
                        </div>

                        {clinic.locations.length > 0 && (
                          <div>
                            <p className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                              <MapPin className="size-3" />
                              {t("Sedes asignadas")}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {clinic.locations.map((loc) => {
                                const on = assignment.locationIds.includes(loc.id);
                                return (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => toggleLocation(clinic.id, loc.id)}
                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                                      on
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border hover:border-primary/40"
                                    }`}
                                  >
                                    {on && <CheckCircle2 className="size-3" />}
                                    {loc.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {activeOrg && activeOrg.clinics.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">
                  {t("Esta organización no tiene clínicas.")}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4" />
                {t("Atrás")}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canContinueStep1}>
                {t("Continuar")}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 3: profesión (opcional) */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Stethoscope className="size-4 text-primary" />
                {t("Profesión y especialidades")}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {t("Opcional: si lo dejas vacío, el profesional lo completará al aceptar la invitación (perfil autogestionable).")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {types.map((professionalType) => (
                <button
                  key={professionalType.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, professionalTypeId: professionalType.id, specialtyIds: [] });
                  }}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    form.professionalTypeId === professionalType.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">{professionalType.name}</span>
                  <span className="mt-0.5 block text-[11.5px] text-muted-foreground line-clamp-1">
                    {professionalType.description}
                  </span>
                </button>
              ))}
            </div>

            {selectedType && (
              <div>
                <h3 className="text-[13.5px] font-semibold">
                  {t("Especialidades válidas para {type}", { type: selectedType.name })}
                </h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {t("Puedes seleccionar una o varias.")}
                </p>
                <div className="mt-3 space-y-3">
                  {specialtiesByCategory.map((group) => (
                    <div key={group.category}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t(group.category)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.items.map((s) => {
                          const active = form.specialtyIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSpecialty(s.id)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              {active && <BadgeCheck className="size-3.5" />}
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" />
                {t("Atrás")}
              </Button>
              <Button onClick={() => setStep(3)}>
                {t("Continuar")}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 4: revisión */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Send className="size-4 text-primary" />
                {t("Revisa y envía")}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {t("Confirma los datos. El profesional recibirá un correo con un enlace seguro para establecer su contraseña y completar su perfil.")}
              </p>
            </div>

            <div className="rounded-xl border border-border">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[13px] sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Nombre")}
                  </p>
                  <p className="mt-0.5 font-medium">
                    {form.firstName} {form.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Correo")}
                  </p>
                  <p className="mt-0.5 font-medium">{form.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("Organización")}
                  </p>
                  <p className="mt-0.5 font-medium">{activeOrg?.name}</p>
                </div>
              </div>

              <div className="border-t border-border p-4">
                <p className="text-[12px] font-semibold text-muted-foreground">
                  {t("Clínicas y roles")}
                </p>
                <div className="mt-2 space-y-2">
                  {summaryClinics.map(({ clinic, role, locations }) => (
                    <div
                      key={clinic!.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[12.5px]"
                    >
                      <span className="font-semibold">{clinic!.name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{role?.name ?? t("Sin rol")}</span>
                      {locations.length > 0 && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {t("Sedes:")}: {locations.map((l) => l.name).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {form.professionalTypeId && (
                <div className="border-t border-border p-4">
                  <p className="text-[12px] font-semibold text-muted-foreground">{t("Profesión")}</p>
                  <p className="mt-1 text-[12.5px]">
                    {selectedType?.name}
                    {form.specialtyIds.length > 0 &&
                      ` · ${form.specialtyIds
                        .map((id) => specialties.find((s) => s.id === id)?.name)
                        .filter(Boolean)
                        .join(", ")}`}
                  </p>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border p-4">
              <input
                type="checkbox"
                checked={form.sendInvitation}
                onChange={(e) => setForm({ ...form, sendInvitation: e.target.checked })}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <MailPlus className="size-4 text-primary" />
                  {t("Enviar invitación por correo ahora")}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {t("El profesional recibirá un enlace de primer acceso (válido por 72 h). Si lo desactivas, podrás invitarlo después desde su perfil.")}
                </span>
              </span>
            </label>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="size-4" />
                {t("Atrás")}
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GraduationCap className="size-4" />
                )}
                {t("Crear e invitar")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium">{label}</label>
      {children}
    </div>
  );
}