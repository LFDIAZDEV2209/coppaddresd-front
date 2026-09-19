"use client";

import {
  AlertTriangle,
  CalendarDays,
  MessageSquareText,
  Pill,
  ShieldAlert,
  User,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "@/features/patients/types";
import { formatDateTime } from "../../utils/format";
import type { PreVisitIntakeDto } from "../../types";

/**
 * Resumen clínico del paciente durante la teleconsulta: datos demográficos,
 * alergias registradas, medicación actual y pre-consulta reportada por el
 * paciente (todo solo lectura durante la consulta). La edad se calcula en la
 * carga (fuera del render) y llega como prop.
 */
export function PatientContextCard({
  patient,
  age,
  intake = null,
  intakeLoading = false,
  intakeError = false,
}: {
  patient: Patient;
  age: number | null;
  /** Pre-consulta del paciente (null cuando aún no la completó). */
  intake?: PreVisitIntakeDto | null;
  intakeLoading?: boolean;
  intakeError?: boolean;
}) {
  const t = useT();
  const fullName = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const allergies = patient.allergies ?? [];
  const medications = patient.medications ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {initials ? (
            <span className="text-[13px] font-bold text-primary">
              {initials}
            </span>
          ) : (
            <User className="size-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">
            {fullName}
          </p>
          <p className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            {patient.medicalRecordNumber && (
              <span className="font-mono text-primary/80">
                {patient.medicalRecordNumber}
              </span>
            )}
            {age !== null && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {age} {t("años")}
              </span>
            )}
            {patient.gender && <span>{t(patient.gender)}</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-destructive">
              {t("Alergias registradas")}
            </p>
            {allergies.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                {t("Sin alergias registradas")}
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                  >
                    <AlertTriangle className="size-3" />
                    {a.allergen}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {medications.length > 0 && (
          <div className="flex items-start gap-2">
            <Pill className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-primary">
                {t("Medicación actual")}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {medications.slice(0, 6).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {m.name}
                  </span>
                ))}
                {medications.length > 6 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    +{medications.length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-border/70 pt-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary">
          <MessageSquareText className="size-3.5" />
          {t("Reportado por el paciente")}
        </p>
        {intakeLoading ? (
          <div className="mt-2 flex flex-col gap-1.5" aria-busy="true">
            <Skeleton className="h-3.5 w-3/4 rounded-full" />
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
          </div>
        ) : intakeError ? (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {t("No se pudo cargar la pre-consulta.")}
          </p>
        ) : !intake ? (
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {t("El paciente no completó la pre-consulta")}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <IntakeRow label={t("Motivo de la consulta")} value={intake.reason} />
            <IntakeRow label={t("Síntomas")} value={intake.symptoms} />
            <IntakeRow label={t("Alergias")} value={intake.allergies} />
            <IntakeRow label={t("Medicación")} value={intake.medications} />
            {intake.updatedAt && (
              <p className="text-[10.5px] text-muted-foreground">
                {t("Actualizado el {date}", {
                  date: formatDateTime(intake.updatedAt),
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IntakeRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const t = useT();
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value && value.trim() ? (
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-snug text-foreground">
          {value}
        </p>
      ) : (
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("No indicado")}
        </p>
      )}
    </div>
  );
}
