"use client";

import {
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  Send,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/feedback/stat-card";
import { useT } from "@/providers/i18n-provider";
import type { PatientControlAdherenceDto } from "../types/erp";

/** KPIs de adherencia a controles: cumplidos, no cumplidos, pendientes, etc. */
export function ControlesAdherenceKpis({
  adherence,
}: {
  adherence: PatientControlAdherenceDto;
}) {
  const t = useT();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label={t("Cumplidos")}
        value={String(adherence.completed)}
        icon={CheckCircle2}
        variant="success"
      />
      <StatCard
        label={t("No cumplidos")}
        value={String(adherence.missed)}
        context={`${t("Cerrados sin examen")}: ${adherence.closed_without_exam}`}
        icon={XCircle}
        variant="destructive"
      />
      <StatCard
        label={t("Pendientes")}
        value={String(adherence.pending)}
        icon={Clock3}
        variant="warning"
      />
      <StatCard
        label={t("Respondidos")}
        value={String(adherence.responded)}
        icon={MessageSquareText}
        variant="info"
      />
      <StatCard
        label={t("Follow-ups enviados")}
        value={String(adherence.followups_sent)}
        icon={Send}
        variant="primary"
      />
      <StatCard
        label={t("Mensajes enviados")}
        value={String(adherence.messages_sent)}
        icon={Mail}
        variant="navy"
      />
    </div>
  );
}
