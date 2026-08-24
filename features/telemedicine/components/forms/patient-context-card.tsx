"use client";

import {
  AlertTriangle,
  CalendarDays,
  Pill,
  ShieldAlert,
  User,
} from "lucide-react";
import type { Patient } from "@/features/patients/types";

/**
 * Resumen clínico del paciente durante la teleconsulta: datos demográficos,
 * alergias registradas y medicación actual (solo lectura durante la consulta).
 * La edad se calcula en la carga (fuera del render) y llega como prop.
 */
export function PatientContextCard({
  patient,
  age,
}: {
  patient: Patient;
  age: number | null;
}) {
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-500/20">
          {initials ? (
            <span className="text-[13px] font-bold text-teal-200">
              {initials}
            </span>
          ) : (
            <User className="size-5 text-teal-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-white">
            {fullName}
          </p>
          <p className="flex items-center gap-2 text-[11.5px] text-slate-400">
            {patient.medicalRecordNumber && (
              <span className="font-mono text-teal-300/80">
                {patient.medicalRecordNumber}
              </span>
            )}
            {age !== null && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {age} años
              </span>
            )}
            {patient.gender && <span>{patient.gender}</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-200/80">
              Alergias registradas
            </p>
            {allergies.length === 0 ? (
              <p className="text-[12px] text-slate-500">
                Sin alergias registradas
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200"
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
            <Pill className="mt-0.5 size-3.5 shrink-0 text-teal-300" />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-teal-200/80">
                Medicación actual
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {medications.slice(0, 6).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {m.name}
                  </span>
                ))}
                {medications.length > 6 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                    +{medications.length - 6}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
