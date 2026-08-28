"use client";

import { useState } from "react";
import {
  Moon,
  Send,
  Gift,
  AlertTriangle,
  Clock,
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
import { MemberAvatar } from "./member-avatar";
import { RiskBadge } from "./risk-badge";
import { SimpleBarChart } from "./charts";
import { CommunityPagination } from "./community-pagination";

export function InactivePage() {
  const t = useT();
  const { inactive, sendMessage, sendBulkInactive, awardXp, toast, analytics, analyticsLoading } = useErp();
  const chartData = (analytics?.inactivityDistribution ?? []).map((d) => ({ label: d.range, value: d.value }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const paginatedInactive = inactive.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Sin publicar")}
        description={`${inactive.length} ${t("miembros sin actividad reciente")}`}
        icon={Moon}
      />

      {/* Warning banner — compact, fits in one row on desktop */}
      {inactive.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning text-white">
              <AlertTriangle className="size-4" />
            </span>
            <div className="flex flex-col gap-0 min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-warning-foreground">
                {t("40% más probabilidad de abandonar si no se reactivan antes de 14 días")}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {t("Envía un mensaje masivo o contacta individualmente.")}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 self-start sm:self-center"
            onClick={() => sendBulkInactive(t("¡Hola! Nos gustaría saber de ti 💙"))}
          >
            <Send data-icon="inline-start" />
            {t("Mensaje masivo")}
          </Button>
        </div>
      )}

      {/* Table + Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5 lg:col-span-2">
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
                <TableHead className="w-[88px] text-right">{t("Días sin publicar")}</TableHead>
                <TableHead className="hidden sm:table-cell w-[64px] text-right">{t("Racha")}</TableHead>
                <TableHead className="w-[88px] text-right">{t("Riesgo")}</TableHead>
                <TableHead className="w-[88px] text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInactive.map((m) => {
                const risk = m.risk ?? "Bajo";
                return (
                  <TableRow key={m.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-2">
                      <MemberAvatar member={m} subtitle={`${m.region} · ${m.diagnosis} · ${m.lastPost}`} />
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold text-destructive whitespace-nowrap">
                      {m.daysSincePost} d
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2 text-right text-xs whitespace-nowrap">💤 {m.streak}</TableCell>
                    <TableCell className="py-2 text-right">
                      <RiskBadge risk={risk} />
                    </TableCell>
                    <TableCell className="py-2">
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
                          onClick={() =>
                            awardXp({
                              memberId: m.id,
                              typeLabel: "Cofre especial",
                              xp: 150,
                              message: "",
                              publishInFeed: false,
                            })
                          }
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
          {inactive.length > 0 && (
            <CommunityPagination
              page={page}
              pageSize={pageSize}
              total={inactive.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Patrones de inactividad")}
              icon={AlertTriangle}
              variant="primary"
            />
            <div className="p-4">
              <SimpleBarChart data={chartData} color="var(--chart-1)" height="h-72" />
            </div>
          </div>
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
            <SectionHeader
              title={t("Riesgo por días")}
              icon={Clock}
              variant="primary"
            />
            <div className="p-4">
              <SimpleBarChart data={chartData} color="var(--destructive)" height="h-56" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
