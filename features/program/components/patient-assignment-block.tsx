"use client";

import { useCallback } from "react";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { findPatientAssignment } from "../services/program-assignments-service";
import { useAssignmentResource } from "../hooks/use-assignment-resource";
import { AssignmentError, AssignmentLink, AssignmentSkeleton, AssignmentStatus } from "./assignment-shared";

export function PatientAssignmentBlock({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { can } = useAppContext();
  if (!can("Program.Enroll")) return null;
  return <PatientAssignmentContent key={patientId} patientId={patientId} patientName={patientName} />;
}

function PatientAssignmentContent({ patientId, patientName }: { patientId: string; patientName: string }) {
  const t = useT();
  const load = useCallback((signal: AbortSignal) => findPatientAssignment(patientId, patientName, signal), [patientId, patientName]);
  const { data, loading, error, retry } = useAssignmentResource(load);
  if (loading) return <AssignmentSkeleton />;
  if (error) return <AssignmentError retry={retry} />;
  if (!data) return null;
  return <section aria-labelledby="patient-program-assignment" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"><div><h2 id="patient-program-assignment" className="text-lg font-semibold">{t("Asignación del programa")}</h2><div className="mt-3 flex flex-wrap items-center gap-3"><AssignmentStatus state={data.state} /><p className="text-sm text-muted-foreground">{t("{days} días", { days: String(data.daysWaiting) })}</p></div></div><AssignmentLink id={data.recommendationId} /></section>;
}
