"use client";

import { useMemo, useState } from "react";
import {
  Trophy,
  Award,
  Send,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
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
import { AwardDialog } from "./award-dialog";
import { XpLineChart } from "./charts";
import { CommunityPagination } from "./community-pagination";

const SCOPE_LABELS: Record<string, string> = {
  TODOS: "Todos",
  INACTIVOS: "Inactivos",
  ACTIVOS7: "Activos 7d",
};

const SCOPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  TODOS: { bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" },
  INACTIVOS: { bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" },
  ACTIVOS7: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
};

export function RewardsPage() {
  const t = useT();
  const { recognitions, analytics, messageReach } = useErp();

  // Paginación de reconocimientos individuales (3 por defecto).
  const [recPage, setRecPage] = useState(1);
  const [recPageSize, setRecPageSize] = useState(3);
  const paginatedRecognitions = useMemo(
    () => recognitions.slice((recPage - 1) * recPageSize, recPage * recPageSize),
    [recognitions, recPage, recPageSize],
  );

  const xpData = (analytics?.xpDeliveredSeries ?? []).map((d) => ({
    label: d.label,
    rachas: d.rachas,
    posts: d.posts,
    erpAdmin: d.erp,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Reconocimientos")}
        description={t("Gestión de XP, cofres y mensajes desde el ERP")}
        icon={Trophy}
        actions={<AwardDialog />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* Individual recognitions */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader
            title={t("Otorgar reconocimiento individual")}
            icon={Award}
            variant="primary"
            actions={<AwardDialog />}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead>{t("Tipo")}</TableHead>
                <TableHead className="w-[72px] text-right">XP</TableHead>
                <TableHead className="hidden md:table-cell w-[88px]">{t("Estado")}</TableHead>
                <TableHead className="hidden md:table-cell w-[96px]">{t("Fecha")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recognitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {t("Sin reconocimientos todavía")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecognitions.map((r) => (
                <TableRow key={r.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="py-2 max-w-[120px] truncate text-xs font-semibold">{r.member}</TableCell>
                  <TableCell className="py-2">
                    <StatusBadge
                      status={r.typeLabel}
                      color={{ bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" }}
                    />
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <span className="inline-flex items-center rounded-lg bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-[var(--warning-foreground)]">
                      +{r.xp}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <StatusBadge
                      status={t(r.status)}
                      color={
                        r.status === "Enviado"
                          ? { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }
                          : { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning)" }
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2 text-xs text-muted-foreground">
                    {r.date}
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
          {recognitions.length > 0 && (
            <CommunityPagination
              page={recPage}
              pageSize={recPageSize}
              total={recognitions.length}
              onPageChange={setRecPage}
              onPageSizeChange={(s) => { setRecPageSize(s); setRecPage(1); }}
            />
          )}
        </div>

        {/* Mass messages */}
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader
            title={t("Mensajes masivos enviados")}
            icon={Send}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Destinatario")}</TableHead>
                <TableHead className="hidden md:table-cell w-[80px] text-right">{t("Enviado a")}</TableHead>
                <TableHead className="w-[110px] text-right">{t("Abiertos")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messageReach.map((mr) => {
                const scopeLabel = SCOPE_LABELS[mr.scope] ?? mr.scope;
                const scopeColor = SCOPE_COLORS[mr.scope] ?? SCOPE_COLORS.TODOS;
                const pct = mr.total === 0 ? 0 : Math.round((mr.reached / mr.total) * 100);
                return (
                  <TableRow key={mr.scope} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-2">
                      <StatusBadge
                        status={t(scopeLabel)}
                        color={scopeColor}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2 text-right text-xs">{mr.total}</TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold">{mr.reached} ({pct}%)</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* XP chart — más alto */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("XP entregados desde el ERP este mes")}
          icon={TrendingUp}
          variant="primary"
        />
        <div className="p-4">
          <XpLineChart
            height="h-80"
            data={xpData}
            lines={[
              { key: "rachas", name: t("XP por rachas"), color: "var(--warning)" },
              { key: "posts", name: t("XP por posts"), color: "var(--primary)" },
              { key: "erpAdmin", name: t("XP por ERP"), color: "var(--success)" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
