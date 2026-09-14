"use client";

import { History } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/providers/i18n-provider";
import { ControlDocumentLink } from "./control-document-link";
import {
  ControlStatusChip,
  formatControlDateTime,
} from "./controles-timeline";
import type { PatientControlsDto } from "../types/erp";

/** Historial: solo hitos con control real (o ya resueltos), más recientes primero. */
export function ControlesHistory({
  controls,
}: {
  controls: PatientControlsDto;
}) {
  const t = useT();

  const rows = controls.milestones
    .filter(
      (milestone) => milestone.control_id !== null || milestone.status !== "pending",
    )
    .slice()
    .sort((a, b) => b.milestone_day - a.milestone_day);

  const reasonLabel = (reason: string | null): string => {
    if (!reason) return "—";
    if (reason === "declined") return t("Rechazó el control");
    if (reason === "no_upload_timeout") return t("Sin examen dentro del plazo");
    // Motivo nuevo del backend aún no mapeado: fallback traducido genérico.
    return t("Motivo no especificado");
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Historial de controles")}
        description={t("Detalle de cada control enviado")}
        icon={History}
        variant="secondary"
      />

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {t("Sin controles registrados.")}
        </p>
      ) : (
        <div className="overflow-x-auto p-2 sm:p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Hito")}</TableHead>
                <TableHead>{t("Estado")}</TableHead>
                <TableHead>{t("Fechas")}</TableHead>
                <TableHead>{t("Documento")}</TableHead>
                <TableHead>{t("Motivo de cierre")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((milestone) => {
                const hasDates =
                  milestone.sent_at ||
                  milestone.responded_at ||
                  milestone.followup_sent_at ||
                  milestone.completed_at;
                return (
                  <TableRow key={milestone.milestone_day}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {t("Día {day}", { day: String(milestone.milestone_day) })}
                    </TableCell>
                    <TableCell>
                      <ControlStatusChip
                        status={milestone.status}
                        closedReason={milestone.closed_reason}
                      />
                    </TableCell>
                    <TableCell>
                      {hasDates ? (
                        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                          {milestone.sent_at && (
                            <span>
                              {t("Enviado")}: {formatControlDateTime(milestone.sent_at)}
                            </span>
                          )}
                          {milestone.responded_at && (
                            <span>
                              {t("Respondido")}:{" "}
                              {formatControlDateTime(milestone.responded_at)}
                            </span>
                          )}
                          {milestone.followup_sent_at && (
                            <span>
                              {t("Follow-up enviado")}:{" "}
                              {formatControlDateTime(milestone.followup_sent_at)}
                            </span>
                          )}
                          {milestone.completed_at && (
                            <span>
                              {t("Completado")}:{" "}
                              {formatControlDateTime(milestone.completed_at)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ControlDocumentLink doc={milestone.document} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {reasonLabel(milestone.closed_reason)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
