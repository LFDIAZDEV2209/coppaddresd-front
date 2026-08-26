"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clipboard,
  Clock,
  GraduationCap,
  Loader2,
  MailPlus,
  MapPin,
  Send,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";

const SPECIALTY_CATEGORIES = [
  "Medicina",
  "Nutrición",
  "Salud mental",
  "Enfermería",
  "Terapia",
  "Coordinación",
  "Fitness",
];

// --- Horarios de atención (solo frontend por ahora: el backend llega después) ---

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface DaySlot {
  enabled: boolean;
  start: string;
  end: string;
}

interface ClinicSchedule {
  /** Horario personalizado vs el estándar de la plataforma (8:00–17:00). */
  enabled: boolean;
  /** Un solo rango horario aplicado a todos los días habilitados. */
  sameEveryDay: boolean;
  days: Record<DayKey, DaySlot>;
}

const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const DAY_LABELS: Record<DayKey, { short: string; full: string }> = {
  mon: { short: "Lun", full: "Lunes" },
  tue: { short: "Mar", full: "Martes" },
  wed: { short: "Mié", full: "Miércoles" },
  thu: { short: "Jue", full: "Jueves" },
  fri: { short: "Vie", full: "Viernes" },
  sat: { short: "Sáb", full: "Sábado" },
  sun: { short: "Dom", full: "Domingo" },
};

const DEFAULT_DAY_SLOT = (enabled: boolean): DaySlot => ({
  enabled,
  start: "08:00",
  end: "17:00",
});

function defaultSchedule(): ClinicSchedule {
  return {
    enabled: false,
    sameEveryDay: true,
    days: {
      mon: DEFAULT_DAY_SLOT(true),
      tue: DEFAULT_DAY_SLOT(true),
      wed: DEFAULT_DAY_SLOT(true),
      thu: DEFAULT_DAY_SLOT(true),
      fri: DEFAULT_DAY_SLOT(true),
      sat: DEFAULT_DAY_SLOT(false),
      sun: DEFAULT_DAY_SLOT(false),
    },
  };
}

// --- Pasos del wizard ---

const STEPS = [
  {
    label: "Datos básicos",
    hint: "Identidad y contacto",
    icon: UserRound,
  },
  {
    label: "Clínicas y permisos",
    hint: "Organización y acceso",
    icon: Building2,
  },
  {
    label: "Profesión",
    hint: "Tipo y especialidades",
    icon: Stethoscope,
  },
  {
    label: "Horarios de atención",
    hint: "Disponibilidad para citas",
    icon: CalendarClock,
  },
  {
    label: "Revisar y enviar",
    hint: "Confirmación final",
    icon: Send,
  },
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
  /** Horarios por clínica asignada (prototipo frontend). */
  schedules: Record<string, ClinicSchedule>;
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
  schedules: {},
};

export function ProfessionalWizard() {
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
  const [created, setCreated] = useState<{
    employeeId: string;
    invitationLink: string | null;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
        if (!cancelled)
          setError("No se pudieron cargar los catálogos. Intenta nuevamente.");
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
    () => types.find((t) => t.id === form.professionalTypeId) ?? null,
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
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    /\S+@\S+\.\S+/.test(form.email);

  const canContinueStep1 =
    form.organizationId !== "" && form.clinicAssignments.length > 0;

  const assignedClinics = useMemo(
    () =>
      activeOrg?.clinics.filter((c) =>
        form.clinicAssignments.some((a) => a.clinicId === c.id),
      ) ?? [],
    [activeOrg, form.clinicAssignments],
  );

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
        schedules: { ...f.schedules, [clinicId]: defaultSchedule() },
      };
    });
  }, []);

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

  const toggleLocation = useCallback((clinicId: string, locationId: string) => {
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
  }, []);

  const toggleSpecialty = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      specialtyIds: f.specialtyIds.includes(id)
        ? f.specialtyIds.filter((x) => x !== id)
        : [...f.specialtyIds, id],
    }));
  }, []);

  // --- Handlers de horarios ---

  const updateSchedule = useCallback(
    (clinicId: string, patch: Partial<ClinicSchedule>) => {
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
    [],
  );

  const toggleDay = useCallback((clinicId: string, day: DayKey) => {
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
  }, []);

  const updateDayTime = useCallback(
    (clinicId: string, day: DayKey, patch: Partial<DaySlot>) => {
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
    [],
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
    [],
  );

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
      setCreated({
        employeeId: result.employeeId,
        invitationLink: result.invitationLink,
        email: form.email.trim(),
      });
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo crear el profesional. Intenta nuevamente.",
      );
    }
  };

  const copyInvitationLink = async () => {
    if (!created?.invitationLink) return;
    try {
      await navigator.clipboard.writeText(created.invitationLink);
      setCopied(true);
    } catch {
      setError("No se pudo copiar el enlace automáticamente.");
    }
  };

  const summaryClinics = form.clinicAssignments
    .map((c) => {
      const clinic = activeOrg?.clinics.find((x) => x.id === c.clinicId);
      const role = roles.find((r) => r.id === c.roleId);
      const locations =
        clinic?.locations.filter((l) => c.locationIds.includes(l.id)) ?? [];
      return { clinic, role, locations };
    })
    .filter((s) => s.clinic);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Cargando catálogos...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageHeader
        title="Nuevo profesional"
        description="Crea el perfil, asigna sus clínicas, permisos y horarios de atención, y envía la invitación por correo."
        icon={Stethoscope}
      />

      {/* Stepper profesional: círculos con iconos, conectores y navegación por pasos completados. */}
      <nav
        aria-label="Progreso del formulario"
        className="mt-6 flex items-stretch rounded-2xl border border-border bg-card px-4 py-4 sm:px-6"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === i;
          const done = step > i;
          const clickable = done;
          return (
            <div
              key={s.label}
              className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3"
            >
              <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setStep(i)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${s.label}${done ? " (completado)" : ""}`}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 sm:size-11",
                    done &&
                      "border-success bg-success text-white shadow-sm shadow-success/30",
                    active &&
                      "border-[var(--sidebar)] bg-[var(--sidebar)] text-white shadow-md shadow-[var(--sidebar)]/30 ring-4 ring-primary/15",
                    !done &&
                      !active &&
                      "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-4.5 sm:size-5" />
                  ) : (
                    <Icon className="size-4 sm:size-4.5" />
                  )}
                </button>
                <span
                  className={cn(
                    "hidden flex-col leading-tight text-center sm:flex sm:text-left",
                    done && "cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11.5px] font-bold whitespace-nowrap",
                      active ? "text-[var(--sidebar)]" : "text-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {done ? "Completado" : s.hint}
                  </span>
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    "h-0.5 min-w-3 flex-1 rounded-full transition-colors duration-300",
                    step > i ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Éxito: enlace de invitación copiable (si se envió). */}
      {created && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success-foreground">
              <BadgeCheck className="size-6" />
            </span>
            <div>
              <h2 className="text-base font-bold">
                Profesional creado correctamente
              </h2>
              <p className="text-xs text-muted-foreground">
                {created.email} recibió la invitación
                {created.invitationLink
                  ? " y puede completar su acceso con el enlace"
                  : " por correo"}
                .
              </p>
            </div>
          </div>

          {created.invitationLink && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Enlace de invitación (72 horas, un solo uso)
              </span>
              <code className="break-all font-mono text-xs text-foreground">
                {created.invitationLink}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyInvitationLink}
                >
                  {copied ? <CheckCircle2 /> : <Clipboard />}
                  {copied ? "Copiado" : "Copiar enlace"}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/professionals/${created.employeeId}`)
                  }
                >
                  Ver perfil del profesional
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push("/professionals")}
                >
                  Volver al directorio
                </Button>
              </div>
            </div>
          )}

          {!created.invitationLink && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/professionals/${created.employeeId}`)
                }
              >
                Ver perfil del profesional
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/professionals")}
              >
                Volver al directorio
              </Button>
            </div>
          )}
        </div>
      )}

      {!created && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          {error && (
            <div className="border-b border-border bg-destructive/5 px-5 py-2.5 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {/* Paso 1: datos básicos */}
          {step === 0 && (
            <div className="flex flex-col gap-0">
              <SectionHeader
                title="Datos básicos"
                description="Identidad y contacto del profesional"
                icon={UserRound}
                variant="primary"
              />
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre">
                    <input
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      placeholder="Jane"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      placeholder="Doe"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                  <Field label="Correo electrónico">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="jane.doe@mediquer.com"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                  <Field label="Teléfono (opcional)">
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="555-010-2244"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                </div>

                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={() => setStep(1)}
                    disabled={!canContinueStep0}
                  >
                    Continuar
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: organización, clínicas y permisos */}
          {step === 1 && (
            <div className="flex flex-col gap-0">
              <SectionHeader
                title="Clínicas y permisos"
                description="Organización, sedes y rol por clínica"
                icon={Building2}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <Field label="Organización">
                  <select
                    value={form.organizationId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        organizationId: e.target.value,
                        clinicAssignments: [],
                        schedules: {},
                      })
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

                <div className="flex flex-col gap-3">
                  <p className="text-[12.5px] font-semibold text-muted-foreground">
                    Clínicas asignadas
                  </p>
                  {activeOrg?.clinics.map((clinic) => {
                    const assignment = form.clinicAssignments.find(
                      (c) => c.clinicId === clinic.id,
                    );
                    const selected = Boolean(assignment);
                    return (
                      <div
                        key={clinic.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          selected
                            ? "border-primary/50 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleClinic(clinic.id)}
                            className="mt-0.5 size-4 accent-[#0B2B4A]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold">
                              {clinic.name}
                            </span>
                            <span className="block text-[11.5px] text-muted-foreground">
                              {clinic.locations.length} sede(s)
                            </span>
                          </span>
                        </label>

                        {assignment && (
                          <div className="mt-3 flex flex-col gap-3 pl-7">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Rol en esta clínica">
                                <select
                                  value={assignment.roleId ?? ""}
                                  onChange={(e) =>
                                    updateAssignment(clinic.id, {
                                      roleId: e.target.value || null,
                                    })
                                  }
                                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  <option value="">— Sin rol —</option>
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
                                      clinicAssignments:
                                        f.clinicAssignments.map((c) => ({
                                          ...c,
                                          isPrimary: c.clinicId === clinic.id,
                                        })),
                                    }))
                                  }
                                  className="size-4 accent-[#0B2B4A]"
                                />
                                <span className="text-[12.5px] font-medium">
                                  Clínica principal
                                </span>
                              </label>
                            </div>

                            {clinic.locations.length > 0 && (
                              <div>
                                <p className="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                                  <MapPin className="size-3" />
                                  Sedes asignadas
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {clinic.locations.map((loc) => {
                                    const on = assignment.locationIds.includes(
                                      loc.id,
                                    );
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activeOrg && activeOrg.clinics.length === 0 && (
                    <p className="text-[12.5px] text-muted-foreground">
                      Esta organización no tiene clínicas.
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    <ArrowLeft data-icon="inline-start" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canContinueStep1}
                  >
                    Continuar
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: profesión (opcional) */}
          {step === 2 && (
            <div className="flex flex-col gap-0">
              <SectionHeader
                title="Profesión y especialidades"
                description="Tipo de profesional y áreas que puede atender"
                icon={Stethoscope}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <p className="text-[12.5px] text-muted-foreground">
                  Opcional: si lo dejas vacío, el profesional lo completará al
                  aceptar la invitación (perfil autogestionable).
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setForm({
                          ...form,
                          professionalTypeId: t.id,
                          specialtyIds: [],
                        });
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        form.professionalTypeId === t.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          form.professionalTypeId === t.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Stethoscope className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {t.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                          {t.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {selectedType && (
                  <div>
                    <h3 className="text-[13.5px] font-semibold">
                      Especialidades válidas para {selectedType.name}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      Puedes seleccionar una o varias.
                    </p>
                    <div className="mt-3 flex flex-col gap-3">
                      {specialtiesByCategory.map((group) => (
                        <div key={group.category}>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            {group.category}
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
                                  {active && (
                                    <BadgeCheck className="size-3.5" />
                                  )}
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

                <div className="mt-2 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft data-icon="inline-start" />
                    Atrás
                  </Button>
                  <Button onClick={() => setStep(3)}>
                    Continuar
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paso 4: horarios de atención (prototipo frontend) */}
          {step === 3 && (
            <div className="flex flex-col gap-0">
              <SectionHeader
                title="Horarios de atención"
                description="Disponibilidad del profesional para agendar citas, por clínica"
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
                        Primero asigna una clínica
                      </h3>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        Los horarios se configuran por clínica. Regresa al paso
                        anterior y selecciona al menos una clínica.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft data-icon="inline-start" />
                      Ir a clínicas y permisos
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[12.5px] text-muted-foreground">
                      Define cuándo puede recibir citas el profesional en cada
                      clínica. El horario estándar de la plataforma es de{" "}
                      <strong className="text-foreground">8:00 a 17:00</strong>,
                      lunes a viernes.
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
                                      : "Horario estándar de la plataforma"}
                                  </p>
                                </div>
                              </div>
                              <label className="flex shrink-0 items-center gap-2 text-[12px] font-medium">
                                Horario personalizado
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
                              <div className="flex flex-col gap-4 p-4">
                                {/* Días de la semana */}
                                <div>
                                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                                    <span className="flex size-5 items-center justify-center rounded-md bg-muted">
                                      <CalendarClock className="size-3.5" />
                                    </span>
                                    Días de atención
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
                                      Mismo horario todos los días
                                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                        (se aplica a los días marcados)
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
                                      <Field label="Desde">
                                        <input
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
                                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                      </Field>
                                      <Field label="Hasta">
                                        <input
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
                                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                      </Field>
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
                                            <input
                                              type="time"
                                              value={schedule.days[day].start}
                                              onChange={(e) =>
                                                updateDayTime(clinic.id, day, {
                                                  start: e.target.value,
                                                })
                                              }
                                              aria-label={`Inicio ${DAY_LABELS[day].full}`}
                                              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-32"
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              a
                                            </span>
                                            <input
                                              type="time"
                                              value={schedule.days[day].end}
                                              onChange={(e) =>
                                                updateDayTime(clinic.id, day, {
                                                  end: e.target.value,
                                                })
                                              }
                                              aria-label={`Fin ${DAY_LABELS[day].full}`}
                                              className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-32"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {enabledDays.length === 0 && (
                                    <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning-foreground">
                                      Marca al menos un día de atención para
                                      esta clínica.
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
                      <Button variant="outline" onClick={() => setStep(2)}>
                        <ArrowLeft data-icon="inline-start" />
                        Atrás
                      </Button>
                      <Button onClick={() => setStep(4)}>
                        Continuar
                        <ArrowRight data-icon="inline-end" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Paso 5: revisión */}
          {step === 4 && (
            <div className="flex flex-col gap-0">
              <SectionHeader
                title="Revisa y envía"
                description="Confirma los datos antes de crear e invitar"
                icon={Send}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-muted/20 p-4 text-[13px] sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Nombre
                      </p>
                      <p className="mt-0.5 font-medium">
                        {form.firstName} {form.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Correo
                      </p>
                      <p className="mt-0.5 font-medium">{form.email}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Organización
                      </p>
                      <p className="mt-0.5 font-medium">{activeOrg?.name}</p>
                    </div>
                  </div>

                  <div className="border-t border-border p-4">
                    <p className="text-[12px] font-semibold text-muted-foreground">
                      Clínicas y roles
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {summaryClinics.map(({ clinic, role, locations }) => (
                        <div
                          key={clinic!.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[12.5px]"
                        >
                          <span className="font-semibold">{clinic!.name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{role?.name ?? "Sin rol"}</span>
                          {locations.length > 0 && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">
                                Sedes: {locations.map((l) => l.name).join(", ")}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {form.professionalTypeId && (
                    <div className="border-t border-border p-4">
                      <p className="text-[12px] font-semibold text-muted-foreground">
                        Profesión
                      </p>
                      <p className="mt-1 text-[12.5px]">
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

                  {/* Resumen de horarios de atención */}
                  <div className="border-t border-border p-4">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      Horarios de atención
                    </p>
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
                                Horario estándar (lun–vie 8:00–17:00)
                              </span>
                            ) : enabledDays.length === 0 ? (
                              <span className="text-warning-foreground">
                                Sin días de atención configurados
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
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-border p-4">
                  <input
                    type="checkbox"
                    checked={form.sendInvitation}
                    onChange={(e) =>
                      setForm({ ...form, sendInvitation: e.target.checked })
                    }
                    className="mt-0.5 size-4 accent-[#0B2B4A]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <MailPlus className="size-4 text-primary" />
                      Enviar invitación por correo ahora
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      El profesional recibirá un enlace de primer acceso (válido
                      por 72 h). Si lo desactivas, podrás invitarlo después
                      desde su perfil.
                    </span>
                  </span>
                </label>

                <div className="mt-2 flex items-center justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft data-icon="inline-start" />
                    Atrás
                  </Button>
                  <Button onClick={submit} disabled={saving}>
                    {saving ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <GraduationCap data-icon="inline-start" />
                    )}
                    Crear e invitar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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
