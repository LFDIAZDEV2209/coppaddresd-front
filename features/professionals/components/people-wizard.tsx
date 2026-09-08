/**
 * Shell del wizard de creación de personas (profesional, empleado o paciente).
 * Orquesta los pasos por modo, maneja submits y redirects.
 * Reemplaza a ProfessionalWizard en la ruta /people/new.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  Clipboard,
  KeyRound,
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
import { StepNav } from "./wizard/step-nav";
import { UserWizard } from "@/features/users/components/user-wizard";

// --- Caché de sesión para catálogos del wizard (~5 min TTL) ---
// Evita re-fetch al volver al selector de modo y re-elegir en la misma sesión.
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const sessionCache: {
  organizations: CacheEntry<OrganizationTree[]> | null;
  professionalTypes: CacheEntry<ProfessionalTypeDto[]> | null;
  specialties: CacheEntry<SpecialtyDto[]> | null;
  roles: CacheEntry<Role[]> | null;
} = {
  organizations: null,
  professionalTypes: null,
  specialties: null,
  roles: null,
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
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    invitationLink: string | null;
    email: string;
    mode: Mode;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Ref para evitar re-fetch de catálogos ya cargados (ciclo de vida del componente)
  const loadedRef = useRef({
    organizations: false,
    professionalTypes: false,
    specialties: false,
    roles: false,
  });

  // Cargar catálogos de forma condicional según el modo SELECCIONADO (no al montar).
  // Cuando form.mode=null (selector de modo), NO se hace fetch — el selector
  // necesita cero datos. Al elegir un modo, se carga solo lo que ese modo requiere:
  //   - patient → solo árbol de organizaciones
  //   - employee → organizaciones + roles
  //   - professional → los 4 catálogos en paralelo
  //   - user → nada (UserWizard embebido carga los suyos)
  // Se usa caché de sesión (~5 min) y ref para evitar re-fetch.
  useEffect(() => {
    const mode = form.mode;
    if (!mode || mode === "user") return;

    let cancelled = false;

    (async () => {
      setCatalogLoading(true);
      try {
        const tasks: Promise<void>[] = [];

        // Organizaciones (necesario para patient, employee, professional)
        if (!loadedRef.current.organizations) {
          loadedRef.current.organizations = true;
          const entry = sessionCache.organizations;
          if (entry && Date.now() < entry.expiry) {
            setOrganizations(entry.data);
            const withClinics = entry.data.find((o) => o.clinics.length > 0);
            if (withClinics) {
              setForm((f) => ({ ...f, organizationId: withClinics.id }));
            }
          } else {
            tasks.push(
              fetchOrganizationTree().then((orgs) => {
                if (cancelled) return;
                setOrganizations(orgs);
                sessionCache.organizations = {
                  data: orgs,
                  expiry: Date.now() + CACHE_TTL_MS,
                };
                const withClinics = orgs.find((o) => o.clinics.length > 0);
                if (withClinics) {
                  setForm((f) => ({ ...f, organizationId: withClinics.id }));
                }
              }),
            );
          }
        }

        // Tipos profesionales (solo modo professional)
        if (mode === "professional" && !loadedRef.current.professionalTypes) {
          loadedRef.current.professionalTypes = true;
          const entry = sessionCache.professionalTypes;
          if (entry && Date.now() < entry.expiry) {
            setTypes(entry.data);
          } else {
            tasks.push(
              fetchProfessionalTypes().then((ts) => {
                if (cancelled) return;
                setTypes(ts);
                sessionCache.professionalTypes = {
                  data: ts,
                  expiry: Date.now() + CACHE_TTL_MS,
                };
              }),
            );
          }
        }

        // Especialidades (solo modo professional)
        if (mode === "professional" && !loadedRef.current.specialties) {
          loadedRef.current.specialties = true;
          const entry = sessionCache.specialties;
          if (entry && Date.now() < entry.expiry) {
            setSpecialties(entry.data);
          } else {
            tasks.push(
              fetchSpecialties().then((ss) => {
                if (cancelled) return;
                setSpecialties(ss);
                sessionCache.specialties = {
                  data: ss,
                  expiry: Date.now() + CACHE_TTL_MS,
                };
              }),
            );
          }
        }

        // Roles (modo professional y employee)
        if (
          (mode === "professional" || mode === "employee") &&
          !loadedRef.current.roles
        ) {
          loadedRef.current.roles = true;
          const entry = sessionCache.roles;
          if (entry && Date.now() < entry.expiry) {
            setRoles(entry.data);
          } else {
            tasks.push(
              fetchRoles().then((rs) => {
                if (cancelled) return;
                setRoles(rs);
                sessionCache.roles = {
                  data: rs,
                  expiry: Date.now() + CACHE_TTL_MS,
                };
              }),
            );
          }
        }

        await Promise.all(tasks);
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los catálogos. Intenta nuevamente.");
          // Permitir reintentar al volver al selector y re-elegir
          loadedRef.current = {
            organizations: false,
            professionalTypes: false,
            specialties: false,
            roles: false,
          };
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.mode]);

  // Pasos del modo actual
  const mode = form.mode;
  const steps = mode ? getSteps(mode) : [];
  const totalSteps = steps.length;
  const stepIndex = step; // 0-based dentro de los pasos del modo

  // Navegación
  const goNext = useCallback(() => setStep((s) => s + 1), []);
  const goBack = useCallback(() => setStep((s) => s - 1), []);

  // Volver al selector de modo: limpiar la selección para que el selector
  // muestre las cards sin pre-selección (sin ring ni check).
  const backToSelector = useCallback(() => {
    setForm((f) => ({ ...f, mode: null }));
    setStep(-1);
  }, []);

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
        // En modo profesional, asignar el rol "Professional" a cada clínica
        // (se asume desde la profesión, no se selecciona por clínica).
        const professionalRoleId =
          mode === "professional"
            ? (roles.find(
                (r) => r.name.toLowerCase() === "professional",
              )?.id ?? null)
            : null;

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
          clinics: form.clinicAssignments.map((c) => ({
            ...c,
            roleId: professionalRoleId,
          })),
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
  }, [mode, form, buildSchedulePayload, roles]);

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

  // Título del page header según modo
  const headerTitle = !mode
    ? t("Nueva persona")
    : mode === "professional"
      ? t("Nuevo profesional")
      : mode === "employee"
        ? t("Nuevo empleado")
        : mode === "user"
          ? t("Nuevo usuario")
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
        : mode === "user"
          ? t(
              "Crea credenciales de acceso con roles y permisos, sin perfil de empleado ni paciente.",
            )
          : t(
              "Registra los datos básicos del paciente. Podrás completar la información clínica después.",
            );

  const headerIcon = !mode
    ? UserRound
    : mode === "professional"
      ? Stethoscope
      : mode === "user"
        ? KeyRound
        : UserRound;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t(headerTitle)}
        description={t(headerDescription)}
        icon={headerIcon}
      />

      {/* Stepper visual (solo si hay modo seleccionado y no es usuario) */}
      {mode && mode !== "user" && (
        <StepNav
          steps={steps}
          currentIndex={stepIndex}
          onStepClick={(i) => setStep(i)}
        />
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

      {/* Wizard body. En modo usuario la caja la aportan el StepNav y la tarjeta del UserWizard embebido. */}
      {!created && (
        <div
          className={`mt-5${mode === "user" && step >= 0 ? "" : " overflow-hidden rounded-2xl border border-border bg-card"}`}
        >
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

          {/* Modo usuario: wizard embebido con sus propios pasos */}
          {mode === "user" && step >= 0 && (
            <UserWizard
              mode="create"
              embedded
              onBackToSelector={
                availableModes.length > 1 ? backToSelector : undefined
              }
            />
          )}

          {/* Pasos del modo (no usuario) */}
          {mode &&
            step >= 0 &&
            step < totalSteps &&
            steps[step]?.key === "identity" && (
              <IdentityStep
                form={form}
                setForm={setForm}
                onNext={goNext}
                onBack={availableModes.length > 1 ? backToSelector : undefined}
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
                loading={catalogLoading}
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
                loading={catalogLoading}
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
                loading={catalogLoading}
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
                types={types}
                specialties={specialties}
              />
            )}
        </div>
      )}
    </div>
  );
}
