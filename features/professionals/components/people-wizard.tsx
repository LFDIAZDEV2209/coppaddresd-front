/**
 * Shell del wizard de creación de personas (profesional, empleado o paciente).
 * Orquesta los pasos por modo, maneja submits y redirects.
 * Reemplaza a ProfessionalWizard en la ruta /people/new.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clipboard,
  Loader2,
  Send,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  fetchOrganizationTree,
  createProfessional,
  saveProfessionalSchedules,
  type OrganizationTree,
} from "@/features/professionals/services/employees-service";
import {
  fetchProfessionalTypes,
  fetchSpecialties,
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "@/features/professionals/services/professional-catalogs-service";
import { fetchRoles } from "@/features/roles/services/roles-service";
import type { Role } from "@/features/roles/types";
import { createPatient } from "@/features/patients/services/patients-service";
import type { PatientInput } from "@/features/patients/types";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";

import {
  type Mode,
  type FormState,
  EMPTY_FORM,
  parseMode,
  parseContext,
  getAvailableModes,
  getSteps,
  DAY_ORDER,
  DAY_TO_WEEKDAY,
} from "./wizard/wizard-state";
import { ModeSelectStep } from "./wizard/steps/mode-select-step";
import { IdentityStep } from "./wizard/steps/identity-step";
import { ClinicsStep } from "./wizard/steps/clinics-step";
import { ProfessionStep } from "./wizard/steps/profession-step";
import { ScheduleStep } from "./wizard/steps/schedule-step";
import { JobStep } from "./wizard/steps/job-step";
import { PatientClinicStep } from "./wizard/steps/patient-clinic-step";
import { ReviewStep } from "./wizard/steps/review-step";

// Iconos Lucide por nombre de paso (para el stepper visual)
const STEP_ICONS: Record<string, React.ElementType> = {
  identity: UserRound,
  clinics: Building2,
  profession: Stethoscope,
  schedule: CalendarClock,
  review: Send,
  job: UserRound,
  clinic: Building2,
};

interface PeopleWizardProps {
  initialMode?: string | null;
  initialContext?: string | null;
}

export function PeopleWizard({ initialMode, initialContext }: PeopleWizardProps) {
  const t = useT();
  const router = useRouter();
  const { hasPermission } = useAuth();

  const parsedMode = parseMode(initialMode);
  const parsedContext = parseContext(initialContext);

  // Cuando context=patient y no hay modo explícito, forzar paciente y saltar selector
  const effectiveMode =
    parsedMode ?? (parsedContext === "patient" ? "patient" : null);

  // Calcular modos disponibles para decidir si el selector es necesario
  const availableModes = getAvailableModes(parsedContext, hasPermission);
  const skipSelector =
    effectiveMode !== null || availableModes.length <= 1;

  // Estado del wizard
  const [step, setStep] = useState(skipSelector ? 0 : -1); // -1 = selector de modo
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    mode: effectiveMode,
  });
  const [organizations, setOrganizations] = useState<OrganizationTree[]>([]);
  const [types, setTypes] = useState<ProfessionalTypeDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    invitationLink: string | null;
    email: string;
    mode: Mode;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Cargar catálogos
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
        // Organización por defecto: la primera CON clínicas
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

  // Pasos del modo actual
  const mode = form.mode;
  const steps = mode ? getSteps(mode) : [];
  const totalSteps = steps.length;
  const stepIndex = step; // 0-based dentro de los pasos del modo

  // Navegación
  const goNext = useCallback(() => setStep((s) => s + 1), []);
  const goBack = useCallback(() => setStep((s) => s - 1), []);

  // Mapeo de schedules del form a payload del backend (weekday 1..7)
  const buildSchedulePayload = useCallback(() => {
    if (!mode || mode !== "professional") return [];
    // Usar la clínica primaria (o la primera asignada)
    const primaryAssignment = form.clinicAssignments.find(
      (c) => c.isPrimary,
    ) ?? form.clinicAssignments[0];
    if (!primaryAssignment) return [];
    const schedule = form.schedules[primaryAssignment.clinicId];
    if (!schedule?.enabled) return [];
    return DAY_ORDER.filter((d) => schedule.days[d].enabled).map((d) => ({
      weekday: DAY_TO_WEEKDAY[d],
      startTime: schedule.days[d].start,
      endTime: schedule.days[d].end,
    }));
  }, [mode, form.clinicAssignments, form.schedules]);

  // Submit según modo
  const submit = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (mode === "professional" || mode === "employee") {
        const result = await createProfessional({
          organizationId: form.organizationId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phone.trim() || null,
          phoneCountryCode: form.phone.startsWith("+") ? null : "1",
          // Empleado: payload clínico vacío (sin tipo ni especialidades)
          professionalTypeId:
            mode === "professional" ? form.professionalTypeId || null : null,
          clinics: form.clinicAssignments,
          specialtyIds: mode === "professional" ? form.specialtyIds : [],
          jobTitle: form.jobTitle.trim() || null,
          sendInvitation: form.sendInvitation,
        });

        // Horarios: best-effort PUT tras crear el profesional (solo modo profesional)
        if (mode === "professional") {
          const schedulePayload = buildSchedulePayload();
          if (schedulePayload.length > 0) {
            try {
              await saveProfessionalSchedules(
                result.employeeId,
                schedulePayload,
              );
            } catch {
              // No bloquear: el horario se edita en el detalle
            }
          }
        }

        setCreated({
          id: result.employeeId,
          invitationLink: result.invitationLink,
          email: form.email.trim(),
          mode,
        });
      } else if (mode === "patient") {
        // Paciente: payload mínimo — el resto se completa en el perfil
        const patientInput: PatientInput = {
          medicalRecordNumber: null,
          firstName: form.firstName.trim(),
          middleName: null,
          lastName: form.lastName.trim(),
          documentTypeId: null,
          documentNumber: form.documentNumber.trim() || null,
          dateOfBirth: form.birthDate || null,
          gender: form.gender || null,
          ethnicityId: null,
          bloodTypeId: null,
          phoneCountryCode: form.phone.startsWith("+") ? null : "1",
          phoneNumber: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: null,
          cityId: null,
          stateId: null,
          countryId: null,
          postalCode: null,
          emergencyContact: null,
          insurerId: null,
          memberId: null,
          maritalStatus: null,
          smokingStatus: null,
          alcoholStatus: null,
          exerciseLevel: null,
          disability: null,
          hospitalizationHistory: null,
          surgeryHistory: null,
          status: "Pendiente",
          notes: null,
          diagnoses: [],
          medications: [],
          allergies: [],
          vitalSigns: [],
        };
        const result = await createPatient(patientInput);
        setCreated({
          id: result.id,
          invitationLink: null,
          email: form.email.trim(),
          mode,
        });
      }
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof ApiError
          ? err.message
          : mode === "patient"
            ? "No se pudo crear el paciente. Intenta nuevamente."
            : "No se pudo crear el profesional. Intenta nuevamente.",
      );
    }
  }, [mode, form, buildSchedulePayload]);

  const copyInvitationLink = async () => {
    if (!created?.invitationLink) return;
    try {
      await navigator.clipboard.writeText(created.invitationLink);
      setCopied(true);
    } catch {
      setError("No se pudo copiar el enlace automáticamente.");
    }
  };

  // --- Renderizado ---

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t("Cargando catálogos...")}
      </div>
    );
  }

  // Título del page header según modo
  const headerTitle = !mode
    ? t("Nueva persona")
    : mode === "professional"
      ? t("Nuevo profesional")
      : mode === "employee"
        ? t("Nuevo empleado")
        : t("Nuevo paciente");

  const headerDescription = !mode
    ? t(
        "Selecciona el tipo de persona y completa los datos para agregarla al directorio.",
      )
    : mode === "professional"
      ? t(
          "Crea el perfil, asigna sus clínicas, permisos y horarios de atención, y envía la invitación por correo.",
        )
      : mode === "employee"
        ? t(
            "Crea el perfil, asigna sus clínicas y permisos, y envía la invitación por correo para que complete su acceso.",
          )
        : t(
            "Registra los datos básicos del paciente. Podrás completar la información clínica después.",
          );

  const headerIcon = !mode
    ? UserRound
    : mode === "professional"
      ? Stethoscope
      : mode === "employee"
        ? UserRound
        : UserRound;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t(headerTitle)}
        description={t(headerDescription)}
        icon={headerIcon}
      />

      {/* Stepper visual (solo si hay modo seleccionado) */}
      {mode && (
        <nav
          aria-label={t("Progreso del formulario")}
          className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 sm:px-6"
        >
          {steps.map((s, i) => {
            const Icon = STEP_ICONS[s.key] ?? UserRound;
            const active = stepIndex === i;
            const done = stepIndex > i;
            const clickable = done;
            return (
              <div
                key={s.key}
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
                {i < steps.length - 1 && (
                  <div
                    aria-hidden
                    className={cn(
                      "h-0.5 min-w-3 flex-1 rounded-full transition-colors duration-300",
                      stepIndex > i ? "bg-success" : "bg-border",
                    )}
                  />
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Éxito tras creación */}
      {created && (
        <div className="animate-scale-in mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success-foreground">
              <BadgeCheck className="size-6" />
            </span>
            <div>
              <h2 className="text-base font-bold">
                {created.mode === "patient"
                  ? t("Paciente creado correctamente")
                  : t("Profesional creado correctamente")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {created.email
                  ? `${created.email} ${
                      created.mode === "patient"
                        ? t("fue registrado en el sistema")
                        : created.invitationLink
                          ? t(
                              "recibió la invitación y puede completar su acceso con el enlace",
                            )
                          : t("recibió la invitación por correo")
                    }`
                  : t("Creado correctamente")}
                .
              </p>
            </div>
          </div>

          {created.invitationLink && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("Enlace de invitación (72 horas, un solo uso)")}
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
                  {copied ? t("Copiado") : t("Copiar enlace")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(`/employees/${created.id}`)
                  }
                >
                  {t("Ver perfil")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    router.push(
                      created.mode === "patient"
                        ? "/patients"
                        : "/employees",
                    )
                  }
                >
                  {t("Volver al directorio")}
                </Button>
              </div>
            </div>
          )}

          {!created.invitationLink && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    created.mode === "patient"
                      ? `/patients/${created.id}`
                      : `/employees/${created.id}`,
                  )
                }
              >
                {created.mode === "patient"
                  ? t("Ver paciente")
                  : t("Ver perfil")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  router.push(
                    created.mode === "patient"
                      ? "/patients"
                      : "/employees",
                  )
                }
              >
                {t("Volver al directorio")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Wizard body */}
      {!created && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          {error && (
            <div className="border-b border-border bg-destructive/5 px-5 py-2.5 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {/* Paso -1: selector de modo */}
          {step === -1 && (
            <ModeSelectStep
              form={form}
              setForm={setForm}
              onNext={goNext}
              onBack={() => {}}
              context={parsedContext}
            />
          )}

          {/* Pasos del modo */}
          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "identity" && (
              <IdentityStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={mode ? goBack : () => setStep(-1)}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "clinics" && (
              <ClinicsStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={goBack}
                organizations={organizations}
                roles={roles}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "profession" && (
              <ProfessionStep
                professionalTypeId={form.professionalTypeId}
                specialtyIds={form.specialtyIds}
                setProfessionalTypeId={(id) =>
                  setForm((f) => ({
                    ...f,
                    professionalTypeId: id,
                    specialtyIds: [],
                  }))
                }
                setSpecialtyIds={(ids) =>
                  setForm((f) => ({ ...f, specialtyIds: ids }))
                }
                types={types}
                specialties={specialties}
                onNext={goNext}
                onBack={goBack}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "schedule" && (
              <ScheduleStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={goBack}
                organizations={organizations}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "job" && (
              <JobStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={goBack}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "clinic" && (
              <PatientClinicStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={goBack}
                organizations={organizations}
              />
            )}

          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "review" && (
              <ReviewStep
                form={form}
                setForm={setForm}
                onNext={submit}
                onBack={goBack}
                saving={saving}
                organizations={organizations}
                roles={roles}
                types={types}
                specialties={specialties}
              />
            )}
        </div>
      )}
    </div>
  );
}
