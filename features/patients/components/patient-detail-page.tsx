"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardPenLine,
  HeartPulse,
  MapPin,
  Pencil,
  RefreshCw,
  Shield,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatient } from "../services/patients-service";
import { PatientProfessionalsSection } from "./patient-professionals-section";
import type { Patient } from "../types";
import { useT } from "@/providers/i18n-provider";

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
              : t("Ocurrió un error inesperado."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, t]);

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
          {t('No pudimos cargar el paciente')}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {error ?? t("El paciente no existe o fue eliminado.")}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw data-icon="inline-start" />
            {t('Reintentar')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/patients")}>
            <ArrowLeft data-icon="inline-start" />
            {t('Volver al directorio')}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/patients")}
          aria-label={t('Volver al directorio de pacientes')}
        >
          <ArrowLeft data-icon="inline-start" />
          {t('Directorio')}
        </Button>
      </div>
      <PageHeader
        title={`${patient.firstName} ${patient.lastName}`}
        description={patient.medicalRecordNumber ?? t("Sin MRN")}
        icon={UserRound}
        actions={
          <>
            <StatusBadge status={patient.status} color={statusColor(patient.status)} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/patients/${patient.id}/edit`)}
            >
              <Pencil data-icon="inline-start" />
              {t('Editar')}
            </Button>
          </>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label={t("Edad")} value={getAge(patient.dateOfBirth)} icon={<CalendarDays />} />
        <Summary label={t("Género")} value={patient.gender ?? t("No registrado")} icon={<UserRound />} />
        <Summary label={t("Clínica")} value={patient.clinicName ?? t("Sin asignar")} icon={<Building2 />} />
        <Summary label={t("Aseguradora")} value={patient.insurerName ?? t("Sin aseguradora")} icon={<Shield />} />
      </section>
      <PatientProfessionalsSection patientId={patient.id} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard
          title={t("Datos personales")}
          icon={UserRound}
          items={[
            [t("Tipo de documento"), patient.documentTypeName ?? t("No registrado")],
            [t("Número de documento"), patient.documentNumber ?? t("No registrado")],
            [t("Fecha de nacimiento"), formatDate(patient.dateOfBirth)],
            [t("Etnia"), patient.ethnicityName ?? t("No registrada")],
            [t("Grupo sanguíneo"), patient.bloodTypeName ?? t("No registrado")],
            [t("Estado civil"), patient.maritalStatus ?? t("No registrado")],
          ]}
        />
        <DetailCard
          title={t("Contacto")}
          icon={MapPin}
          items={[
            [t("Teléfono"), formatPhone(patient) ?? t("No registrado")],
            [t("Correo"), patient.email ?? t("No registrado")],
            [
              t("Dirección"),
              [patient.address, patient.cityName, patient.stateCode, patient.countryName]
                .filter(Boolean)
                .join(", ") || t("No registrada"),
            ],
            [t("Código postal"), patient.postalCode ?? t("No registrado")],
          ]}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard
          title={t("Cobertura")}
          icon={Shield}
          items={[
            [t("Aseguradora"), patient.insurerName ?? t("Sin aseguradora")],
            [t("Número de miembro"), patient.memberId ?? t("No registrado")],
          ]}
        />
        <DetailCard
          title={t("Clínica y sede")}
          icon={Building2}
          items={[
            [t("Clínica"), patient.clinicName ?? t("Sin asignar")],
            [t("Sede"), patient.locationName ?? t("No registrada")],
          ]}
        />
      </div>
      <DetailCard
        title={t("Estilo de vida e historial")}
        icon={HeartPulse}
        items={[
          [t("Tabaquismo"), patient.smokingStatus ?? t("No registrado")],
          [t("Consumo de alcohol"), patient.alcoholStatus ?? t("No registrado")],
          [t("Nivel de ejercicio"), patient.exerciseLevel ?? t("No registrado")],
          [t("Discapacidad"), patient.disability ?? t("No registrada")],
          [t("Hospitalizaciones"), patient.hospitalizationHistory ?? t("No registrado")],
          [t("Cirugías"), patient.surgeryHistory ?? t("No registradas")],
        ]}
      />
      {patient.notes && (
        <DetailCard
          title={t("Notas")}
          icon={ClipboardPenLine}
          items={[["", patient.notes]]}
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
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: [string, string][];
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label={title}
    >
      <SectionHeader title={title} icon={icon} variant="primary" />
      <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={`${label}-${value}`}>
            {label && (
              <dt className="text-xs text-muted-foreground">{label}</dt>
            )}
            <dd className="mt-1 font-medium">{value}</dd>
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
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label={t("Diagnósticos")}
    >
      <SectionHeader
        title={t("Diagnósticos")}
        description={`${patient.diagnoses.length} ${t("registrados")}`}
        icon={Stethoscope}
        variant="primary"
      />
      {patient.diagnoses.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {patient.diagnoses.map((diagnosis) => (
            <li
              key={diagnosis.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
            >
              <div className="flex min-w-0 gap-3">
                <span className="font-mono text-xs font-semibold text-primary">
                  {diagnosis.icd10Code}
                </span>
                <span className="truncate">{diagnosis.description}</span>
              </div>
              {diagnosis.isPrimary && (
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                  {t('Principal')}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('Sin diagnósticos registrados.')}</p>
      )}
    </section>
  );
}

function MedicationsSection({ patient }: { patient: Patient }) {
  const t = useT();
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label={t("Medicamentos")}
    >
      <SectionHeader
        title={t("Medicamentos")}
        description={`${patient.medications.length} ${t("prescritos")}`}
        icon={ClipboardPenLine}
        variant="primary"
      />
      {patient.medications.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {patient.medications.map((medication) => (
            <li
              key={medication.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{medication.name}</p>
                {medication.drugClass && (
                  <p className="truncate text-xs text-muted-foreground">
                    {medication.drugClass}
                  </p>
                )}
              </div>
              {medication.frequency && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {medication.frequency}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('Sin medicamentos registrados.')}</p>
      )}
    </section>
  );
}

function AllergiesSection({ patient }: { patient: Patient }) {
  const t = useT();
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label={t("Alergias")}
    >
      <SectionHeader
        title={t("Alergias")}
        description={`${patient.allergies.length} ${t("registradas")}`}
        icon={HeartPulse}
        variant="primary"
      />
      {patient.allergies.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {patient.allergies.map((allergy) => (
            <li
              key={allergy.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
            >
              <span className="font-medium">{allergy.allergen}</span>
              {allergy.notes && (
                <span className="truncate text-xs text-muted-foreground">
                  {allergy.notes}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('Sin alergias registradas.')}</p>
      )}
    </section>
  );
}

function VitalSignsSection({ patient }: { patient: Patient }) {
  const t = useT();
  const latest = patient.vitalSigns[0];
  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label={t("Signos vitales")}
    >
      <SectionHeader
        title={t("Signos vitales")}
        description={latest ? `${t("Última medición")} · ${formatDate(latest.measuredAt)}` : t("Sin mediciones")}
        icon={HeartPulse}
        variant="primary"
      />
      {latest ? (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <VitalStat
            label={t("Presión")}
            value={latest.systolic ? `${latest.systolic}/${latest.diastolic ?? "—"} mmHg` : "—"}
          />
          <VitalStat label={t("Frecuencia cardíaca")} value={latest.heartRate ? `${latest.heartRate} lpm` : "—"} />
          <VitalStat label={t("Temperatura")} value={latest.temperatureC ? `${latest.temperatureC} °C` : "—"} />
          <VitalStat label={t("Saturación O₂")} value={latest.o2Saturation ? `${latest.o2Saturation} %` : "—"} />
          <VitalStat label={t("Estatura")} value={latest.heightCm ? `${latest.heightCm} cm` : "—"} />
          <VitalStat label={t("Peso")} value={latest.weightKg ? `${latest.weightKg} kg` : "—"} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('Sin mediciones registradas.')}</p>
      )}
    </section>
  );
}

function VitalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Summary({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-3 truncate text-xl font-bold tracking-tight">{value}</p>
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
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
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