"use client";

import {
  Moon,
  Send,
  Gift,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { inactivityData } from "../mock-data";
import { MemberAvatar } from "./member-avatar";
import { RiskBadge } from "./risk-badge";
import { SimpleBarChart } from "./charts";

export function InactivePage() {
  const t = useT();
  const { inactive, sendMessage, sendBulkInactive, toast } = useErp();
  const chartData = inactivityData.map((d) => ({ label: d.range, value: d.value }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Sin publicar")}
        description={`${inactive.length} ${t("miembros sin actividad reciente")}`}
        icon={Moon}
      />

      {/* Warning banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning text-white">
            <AlertTriangle className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-warning-foreground">
              {t("40% más probabilidad de abandonar si no se reactivan antes de 14 días")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Envía un mensaje masivo o contacta individualmente.")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => sendBulkInactive(t("¡Hola! Nos gustaría saber de ti 💙"))}
        >
          <Send data-icon="inline-start" />
          {t("Mensaje masivo")}
        </Button>
      </div>

      {/* Table + Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:col-span-2">
          <SectionHeader
            title={t("Plan de acción")}
            description={`${inactive.length} ${t("miembros requieren atención")}`}
            icon={Moon}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Diagnóstico")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Ciudad")}</TableHead>
                <TableHead className="text-right">{t("Días sin publicar")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("Último post")}</TableHead>
                <TableHead className="text-right">{t("Racha")}</TableHead>
                <TableHead className="hidden text-right lg:table-cell">{t("Riesgo")}</TableHead>
                <TableHead className="w-24 text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactive.map((m) => {
                const risk = m.risk ?? "Bajo";
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <MemberAvatar member={m} subtitle={m.lastPost} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{m.diagnosis}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{m.region}</TableCell>
                    <TableCell className="text-right text-xs font-semibold text-destructive">
                      {m.daysSincePost} d
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell text-xs text-muted-foreground">
                      {m.lastPost}
                    </TableCell>
                    <TableCell className="text-right text-xs">💤 {m.streak}</TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      <RiskBadge risk={risk} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            sendMessage(m.id, t("¡Extrañamos tus publicaciones!"));
                            toast(t("Mensaje enviado"));
                          }}
                          title={t("Enviar")}
                        >
                          <Send className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => toast(t("Cofre enviado a") + " " + m.firstName)}
                          title={t("Cofre")}
                        >
                          <Gift className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Patrones de inactividad")}
            icon={AlertTriangle}
            variant="primary"
          />
          <div className="p-4">
            <SimpleBarChart data={chartData} color="var(--chart-1)" />
          </div>
        </div>
      </div>
    </div>
  );
}
