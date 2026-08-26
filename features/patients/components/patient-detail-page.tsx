"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Cigarette,
  ClipboardPenLine,
  CreditCard,
  Droplets,
  Dumbbell,
  Gauge,
  Heart,
  HeartPulse,
  Hospital,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Pill,
  RefreshCw,
  Ruler,
  Scissors,
  Shield,
  Stethoscope,
  Thermometer,
  UserRound,
  Weight,
  Wind,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { StatCard } from "@/components/feedback/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatient } from "../services/patients-service";
import { PatientProfessionalsSection } from "./patient-professionals-section";
import type { Patient } from "../types";

/** Estilos de la caja de icono por tono semántico (colores representativos). */
const TONES = {
  primary: "bg-primary/20 text-primary ring-1 ring-primary/40",
  info: "bg-info/20 text-info ring-1 ring-info/40",
  success: "bg-success/20 text-success ring-1 ring-success/40",
  warning: "bg-warning/20 text-warning ring-1 ring-warning/40",
  destructive: "bg-destructive/20 text-destructive ring-1 ring-destructive/40",
} as const;

type Tone = keyof typeof TONES;

export function PatientDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getPatient(id)
      .then((data) => {
        if (!cancelled) setPatient(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Ocurrió un error inesperado.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  if (loading) return <DetailSkeleton />;

  if (error || !patient)
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
        <p className="text-sm font-semibold text-destructive">
          No pudimos cargar el paciente
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {error ?? "El paciente no existe o fue eliminado."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw data-icon="inline-start" />
            Reintentar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patients")}
          >
            <ArrowLeft data-icon="inline-start" />
            Volver al directorio
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/patients")}
        aria-label={t("Volver al directorio de pacientes")}
        className="w-fit"
      >
        <ArrowLeft data-icon="inline-start" />
        Directorio
      </Button>

      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        description={patient.medicalRecordNumber ?? "Sin MRN"}
        icon={UserRound}
        actions={
          <>
            <StatusBadge
              status={patient.status}
              color={statusColor(patient.status)}
            />
            <Button
              size="sm"
              onClick={() => router.push(`/patients/${patient.id}/edit`)}
            >
              <Pencil data-icon="inline-start" />
              Editar
            </Button>
          </>
        }
      />

      {/* Stats del paciente con colores representativos. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Edad")}
          value={getAge(patient.dateOfBirth)}
          icon={CalendarDays}
          variant="primary"
          context={t("Años cumplidos")}
        />
        <StatCard
          label={t("Género")}
          value={patient.gender ?? "No registrado"}
          icon={UserRound}
          variant="info"
          context={t("Perfil demográfico")}
        />
        <StatCard
          label={t("Clínica")}
          value={patient.clinicName ?? "Sin asignar"}
          icon={Building2}
          variant="success"
          context={patient.locationName ?? "Sin sede"}
        />
        <StatCard
          label={t("Aseguradora")}
          value={patient.insurerName ?? "Sin aseguradora"}
          icon={Shield}
          variant="warning"
          context={patient.memberId ?? "Sin número de miembro"}
        />
      </div>

      <PatientProfessionalsSection patientId={patient.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailCard
          title={t("Datos personales")}
          icon={UserRound}
          tone="primary"
          items={[
            {
              icon: CreditCard,
              label: "Tipo de documento",
              value: patient.documentTypeName ?? "No registrado",
            },
            {
              icon: CreditCard,
              label: "Número de documento",
              value: patient.documentNumber ?? "No registrado",
            },
            {
              icon: CalendarDays,
              label: "Fecha de nacimiento",
              value: formatDate(patient.dateOfBirth),
            },
            {
              icon: UserRound,
              label: "Etnia",
              value: patient.ethnicityName ?? "No registrada",
            },
            {
              icon: Droplets,
              label: "Grupo sanguíneo",
              value: patient.bloodTypeName ?? "No registrado",
            },
            {
              icon: Heart,
              label: "Estado civil",
              value: patient.maritalStatus ?? "No registrado",
            },
          ]}
        />
        <DetailCard
          title={t("Contacto")}
          icon={MapPin}
          tone="info"
          items={[
            {
              icon: Phone,
              label: "Teléfono",
              value: formatPhone(patient) ?? "No registrado",
            },
            {
              icon: Mail,
              label: "Correo",
              value: patient.email ?? "No registrado",
            },
            {
              icon: MapPin,
              label: "Dirección",
              value:
                [
                  patient.address,
                  patient.cityName,
                  patient.stateCode,
                  patient.countryName,
                ]
                  .filter(Boolean)
                  .join(", ") || "No registrada",
            },
            {
              icon: MapPin,
              label: "Código postal",
              value: patient.postalCode ?? "No registrado",
            },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailCard
          title={t("Cobertura")}
          icon={Shield}
          tone="warning"
          items={[
            {
              icon: Shield,
              label: "Aseguradora",
              value: patient.insurerName ?? "Sin aseguradora",
            },
            {
              icon: CreditCard,
              label: "Número de miembro",
              value: patient.memberId ?? "No registrado",
            },
          ]}
        />
        <DetailCard
          title={t("Clínica y sede")}
          icon={Building2}
          tone="success"
          items={[
            {
              icon: Building2,
              label: "Clínica",
              value: patient.clinicName ?? "Sin asignar",
            },
            {
              icon: MapPin,
              label: "Sede",
              value: patient.locationName ?? "No registrada",
            },
          ]}
        />
      </div>

      <DetailCard
        title={t("Estilo de vida e historial")}
        icon={HeartPulse}
        tone="destructive"
        items={[
          {
            icon: Cigarette,
            label: "Tabaquismo",
            value: patient.smokingStatus ?? "No registrado",
          },
          {
            icon: Wine,
            label: "Consumo de alcohol",
            value: patient.alcoholStatus ?? "No registrado",
          },
          {
            icon: Dumbbell,
            label: "Nivel de ejercicio",
            value: patient.exerciseLevel ?? "No registrado",
          },
          {
            icon: UserRound,
            label: "Discapacidad",
            value: patient.disability ?? "No registrada",
          },
          {
            icon: Hospital,
            label: "Hospitalizaciones",
            value: patient.hospitalizationHistory ?? "No registrado",
          },
          {
            icon: Scissors,
            label: "Cirugías",
            value: patient.surgeryHistory ?? "No registradas",
          },
        ]}
      />

      {patient.notes && (
        <DetailCard
          title={t("Notas")}
          icon={ClipboardPenLine}
          tone="primary"
          items={[
            {
              icon: ClipboardPenLine,
              label: "Notas clínicas",
              value: patient.notes,
            },
          ]}
        />
      )}

      <DiagnosesSection patient={patient} />
      <MedicationsSection patient={patient} />
      <AllergiesSection patient={patient} />
      <VitalSignsSection patient={patient} />
    </div>
  );
}

function DetailCard({
  title,
  icon,
  tone = "primary",
  items,
}: {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  items: { icon: LucideIcon; label: string; value: string }[];
}) {
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={title}
    >
      <SectionHeader title={title} icon={icon} variant="primary" />
      <dl className="grid gap-x-4 gap-y-4 p-4 text-sm sm:grid-cols-2 sm:p-5">
        {items.map(({ icon: ItemIcon, label, value }) => (
          <div className="flex items-start gap-3" key={`${label}-${value}`}>
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}
            >
              <ItemIcon className="size-4" />
            </span>
            <span className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd
                className={`mt-0.5 break-words font-medium ${
                  isEmptyValue(value)
                    ? "italic text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {value}
              </dd>
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DiagnosesSection({ patient }: { patient: Patient }) {
  const t = useT();
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Diagnósticos")}
    >
      <SectionHeader
        title={t("Diagnósticos")}
        description={`${patient.diagnoses.length} registrados`}
        icon={Stethoscope}
        variant="primary"
      />
      {patient.diagnoses.length ? (
        <ul className="flex flex-col gap-2 p-4 text-sm sm:p-5">
          {patient.diagnoses.map((diagnosis) => (
            <li
              key={diagnosis.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Stethoscope className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {diagnosis.description}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {diagnosis.icd10Code}
                  </p>
                </div>
              </div>
              {diagnosis.isPrimary && (
                <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                  Principal
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-xs text-muted-foreground sm:p-5">
          Sin diagnósticos registrados.
        </p>
      )}
    </section>
  );
}

function MedicationsSection({ patient }: { patient: Patient }) {
  const t = useT();
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Medicamentos")}
    >
      <SectionHeader
        title={t("Medicamentos")}
        description={`${patient.medications.length} prescritos`}
        icon={ClipboardPenLine}
        variant="primary"
      />
      {patient.medications.length ? (
        <ul className="flex flex-col gap-2 p-4 text-sm sm:p-5">
          {patient.medications.map((medication) => (
            <li
              key={medication.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                  <Pill className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{medication.name}</p>
                  {medication.drugClass && (
                    <p className="truncate text-xs text-muted-foreground">
                      {medication.drugClass}
                    </p>
                  )}
                </div>
              </div>
              {medication.frequency && (
                <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info">
                  {medication.frequency}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-xs text-muted-foreground sm:p-5">
          Sin medicamentos registrados.
        </p>
      )}
    </section>
  );
}

function AllergiesSection({ patient }: { patient: Patient }) {
  const t = useT();
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Alergias")}
    >
      <SectionHeader
        title={t("Alergias")}
        description={`${patient.allergies.length} registradas`}
        icon={HeartPulse}
        variant="primary"
      />
      {patient.allergies.length ? (
        <ul className="flex flex-col gap-2 p-4 text-sm sm:p-5">
          {patient.allergies.map((allergy) => (
            <li
              key={allergy.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive">
                  <AlertTriangle className="size-4" />
                </span>
                <span className="truncate font-medium">{allergy.allergen}</span>
              </div>
              {allergy.notes && (
                <span className="truncate text-xs text-muted-foreground">
                  {allergy.notes}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-xs text-muted-foreground sm:p-5">
          Sin alergias registradas.
        </p>
      )}
    </section>
  );
}

function VitalSignsSection({ patient }: { patient: Patient }) {
  const t = useT();
  const latest = patient.vitalSigns[0];
  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Signos vitales")}
    >
      <SectionHeader
        title={t("Signos vitales")}
        description={
          latest
            ? `Última medición · ${formatDate(latest.measuredAt)}`
            : "Sin mediciones"
        }
        icon={HeartPulse}
        variant="primary"
      />
      {latest ? (
        <div className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3 sm:p-5 xl:grid-cols-6">
          <VitalStat
            icon={Gauge}
            tone="primary"
            label={t("Presión")}
            value={
              latest.systolic
                ? `${latest.systolic}/${latest.diastolic ?? "—"} mmHg`
                : "—"
            }
          />
          <VitalStat
            icon={HeartPulse}
            tone="destructive"
            label={t("Frecuencia cardíaca")}
            value={latest.heartRate ? `${latest.heartRate} lpm` : "—"}
          />
          <VitalStat
            icon={Thermometer}
            tone="warning"
            label={t("Temperatura")}
            value={latest.temperatureC ? `${latest.temperatureC} °C` : "—"}
          />
          <VitalStat
            icon={Wind}
            tone="success"
            label={t("Saturación O₂")}
            value={latest.o2Saturation ? `${latest.o2Saturation} %` : "—"}
          />
          <VitalStat
            icon={Ruler}
            tone="info"
            label={t("Estatura")}
            value={latest.heightCm ? `${latest.heightCm} cm` : "—"}
          />
          <VitalStat
            icon={Weight}
            tone="warning"
            label={t("Peso")}
            value={latest.weightKg ? `${latest.weightKg} kg` : "—"}
          />
        </div>
      ) : (
        <p className="p-4 text-xs text-muted-foreground sm:p-5">
          Sin mediciones registradas.
        </p>
      )}
    </section>
  );
}

function VitalStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[110px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

function getAge(date: string | null) {
  if (!date) return "—";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()))
    age -= 1;
  return `${Math.max(0, age)} años`;
}

function formatDate(date: string | null) {
  if (!date) return "No registrada";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No registrada";
  return parsed.toLocaleDateString("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPhone(patient: Patient): string | null {
  if (!patient.phoneNumber) return null;
  return patient.phoneCountryCode
    ? `+${patient.phoneCountryCode} ${patient.phoneNumber}`
    : patient.phoneNumber;
}

function statusColor(status: Patient["status"]) {
  const colors = {
    Activo: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    Pendiente: {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    Inactivo: {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
  };
  return colors[status];
}

/** ¿El valor es un empty state ("No registrado", "Sin asignar", ...)? */
function isEmptyValue(value: string): boolean {
  return /^(no registrad|sin asignar|sin aseguradora|sin sede|sin número)/i.test(
    value.trim(),
  );
}
