"use client";

import { useT } from "@/providers/i18n-provider";
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
  Info,
  Loader2,
  MailPlus,
  MapPin,
  Pencil,
  Send,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { ProfessionalAvatar } from "./professional-visuals";

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
        // Organización por defecto: la primera CON clínicas (evita la lista vacía).
        const withClinics = orgs.find((o) => o.clinics.length > 0);
        if (withClinics) {
          setForm((f) => ({ ...f, organizationId: withClinics.id }));
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

  // Errores por campo (se muestran al salir del campo — patrón Usuarios).
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.firstName.trim() === "")
      errors.firstName = t("El nombre es obligatorio.");
    if (form.lastName.trim() === "")
      errors.lastName = t("El apellido es obligatorio.");
    if (form.email.trim() === "") errors.email = t("El correo es obligatorio.");
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errors.email = t("Ingresa un correo válido (ej. nombre@clinica.com).");
    return errors;
  }, [form.firstName, form.lastName, form.email, t]);
  const handleBlur = (field: string) => () =>
    setTouched((current) => new Set(current).add(field));

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
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Nuevo profesional")}
        description={t(
          "Crea el perfil, asigna sus clínicas, permisos y horarios de atención, y envía la invitación por correo.",
        )}
        icon={Stethoscope}
      />

      {/* Stepper profesional: círculos con iconos, conectores y navegación por pasos completados. */}
      <nav
        aria-label={t("Progreso del formulario")}
        className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 sm:px-6"
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
                      "scale-105 border-[var(--sidebar)] bg-[var(--sidebar)] text-white shadow-md shadow-[var(--sidebar)]/30 ring-4 ring-primary/15",
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
                    "hidden max-w-36 flex-col leading-tight text-center sm:flex sm:text-left",
                    done && "cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "truncate text-[11.5px] font-bold",
                      active ? "text-[var(--sidebar)]" : "text-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {done ? t("Completado") : s.hint}
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
        <div className="animate-scale-in mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
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
                    router.push(`/employees/${created.employeeId}`)
                  }
                >
                  Ver perfil del profesional
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push("/employees")}
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
                  router.push(`/employees/${created.employeeId}`)
                }
              >
                Ver perfil del profesional
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/employees")}
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
            <div className="animate-slide-up flex flex-col gap-0">
              <SectionHeader
                title={t("Datos básicos")}
                description={t("Identidad y contacto del profesional")}
                icon={UserRound}
                variant="primary"
              />
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex gap-5">
                  <div className="hidden shrink-0 flex-col items-center gap-2 sm:flex">
                    <ProfessionalAvatar
                      employee={{
                        firstName: form.firstName.trim() || "?",
                        lastName: form.lastName.trim(),
                      }}
                      size="lg"
                    />
                    <span className="text-[10.5px] text-muted-foreground">
                      {t("Vista previa")}
                    </span>
                  </div>
                  <div className="grid flex-1 gap-4 sm:grid-cols-2">
                    <Field
                      label={t("Nombre")}
                      required
                      error={
                        touched.has("firstName") ? fieldErrors.firstName : ""
                      }
                    >
                      <Input
                        value={form.firstName}
                        onChange={(e) =>
                          setForm({ ...form, firstName: e.target.value })
                        }
                        onBlur={handleBlur("firstName")}
                        placeholder={t("Jane")}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                      />
                    </Field>
                    <Field
                      label={t("Apellido")}
                      required
                      error={
                        touched.has("lastName") ? fieldErrors.lastName : ""
                      }
                    >
                      <Input
                        value={form.lastName}
                        onChange={(e) =>
                          setForm({ ...form, lastName: e.target.value })
                        }
                        onBlur={handleBlur("lastName")}
                        placeholder={t("Doe")}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                      />
                    </Field>
                    <Field
                      label={t("Correo electrónico")}
                      required
                      error={touched.has("email") ? fieldErrors.email : ""}
                      hint={t(
                        "El profesional usará este correo para acceder al ERP.",
                      )}
                    >
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        onBlur={handleBlur("email")}
                        placeholder={t("jane.doe@mediquer.com")}
                        disabled={saving}
                        aria-invalid={Boolean(fieldErrors.email)}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label={t("Teléfono (opcional)")}>
                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        placeholder={t("555-010-2244")}
                        disabled={saving}
                        autoComplete="off"
                      />
                    </Field>
                  </div>
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
            <div className="animate-slide-up flex flex-col gap-0">
              <SectionHeader
                title={t("Clínicas y permisos")}
                description={t("Organización, sedes y rol por clínica")}
                icon={Building2}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <Field label={t("Organización")}>
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
                </Field>

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
            <div className="animate-slide-up flex flex-col gap-0">
              <SectionHeader
                title={t("Profesión y especialidades")}
                description={t("Tipo de profesional y áreas que puede atender")}
                icon={Stethoscope}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-[12.5px] text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t(
                    "Opcional: si lo dejas vacío, el profesional lo completará al aceptar la invitación (perfil autogestionable).",
                  )}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-muted-foreground">
                    {t("Tipo de profesional")}
                    <span className="ml-1.5 text-[11px] font-normal">
                      {t("{count} disponibles", {
                        count: String(types.length),
                      })}
                    </span>
                  </p>
                  {form.professionalTypeId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground"
                      onClick={() =>
                        setForm({
                          ...form,
                          professionalTypeId: "",
                          specialtyIds: [],
                        })
                      }
                    >
                      <X data-icon="inline-start" />
                      {t("Sin tipo")}
                    </Button>
                  )}
                </div>

                <div className="stagger-children grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {types.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setForm({
                          ...form,
                          professionalTypeId: type.id,
                          specialtyIds: [],
                        });
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        form.professionalTypeId === type.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          form.professionalTypeId === type.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Stethoscope className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {type.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                          {type.description}
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
                              <div className="animate-fade-in flex flex-col gap-4 p-4">
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
                                      <Field label={t("Desde")}>
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
                                      </Field>
                                      <Field label={t("Hasta")}>
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
            <div className="animate-slide-up flex flex-col gap-0">
              <SectionHeader
                title={t("Revisa y envía")}
                description={t("Confirma los datos antes de crear e invitar")}
                icon={Send}
                variant="primary"
              />
              <div className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="overflow-hidden rounded-xl border border-border">
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
                        {form.email}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("Organización")}
                      </p>
                      <p className="mt-0.5 truncate font-medium">
                        {activeOrg?.name}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-muted-foreground">
                        {t("Clínicas y roles")}
                      </p>
                      <ReviewEditButton onClick={() => setStep(1)} />
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
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
                              <span className="min-w-0 truncate text-muted-foreground">
                                {t("Sedes")}:{" "}
                                {locations.map((l) => l.name).join(", ")}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {form.professionalTypeId && (
                    <div className="border-t border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-muted-foreground">
                          {t("Profesión")}
                        </p>
                        <ReviewEditButton onClick={() => setStep(2)} />
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

                  {/* Resumen de horarios de atención */}
                  <div className="border-t border-border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {t("Horarios de atención")}
                      </p>
                      <ReviewEditButton onClick={() => setStep(3)} />
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
                    className="mt-0.5 size-4 accent-[var(--primary)]"
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

/** Botón "Cambiar" de las secciones de revisión: salta al paso indicado. */
function ReviewEditButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      onClick={onClick}
    >
      <Pencil data-icon="inline-start" className="size-3" />
      {t("Cambiar")}
    </Button>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p
          className="text-xs leading-snug whitespace-pre-line text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
