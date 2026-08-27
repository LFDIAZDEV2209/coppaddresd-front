"use client";

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Individual recognitions */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
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
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="hidden md:table-cell">{t("Estado")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Fecha")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recognitions.map((r) => (
                <TableRow key={r.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="text-xs font-semibold">{r.member}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={r.typeLabel}
                      color={{ bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-[#B8860B] to-[#D9A929] px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                      +{r.xp}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge
                      status={t(r.status)}
                      color={
                        r.status === "Enviado"
                          ? { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }
                          : { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning)" }
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {r.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mass messages */}
        <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Mensajes masivos enviados")}
            icon={Send}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Destinatario")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Enviado a")}</TableHead>
                <TableHead>{t("Abiertos")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messageReach.map((mr) => {
                const scopeLabel = SCOPE_LABELS[mr.scope] ?? mr.scope;
                const scopeColor = SCOPE_COLORS[mr.scope] ?? SCOPE_COLORS.TODOS;
                const pct = mr.total === 0 ? 0 : Math.round((mr.reached / mr.total) * 100);
                return (
                  <TableRow key={mr.scope} className="transition-colors hover:bg-muted/50">
                    <TableCell>
                      <StatusBadge
                        status={t(scopeLabel)}
                        color={scopeColor}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{mr.total}</TableCell>
                    <TableCell className="text-xs font-semibold">{mr.reached} ({pct}%)</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* XP chart */}
      <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("XP entregados desde el ERP este mes")}
          icon={TrendingUp}
          variant="primary"
        />
        <div className="p-4">
          <XpLineChart
            data={xpData}
            lines={[
              { key: "rachas", name: t("XP por rachas"), color: "#B8860B" },
              { key: "posts", name: t("XP por posts"), color: "var(--primary)" },
              { key: "erpAdmin", name: t("XP por ERP"), color: "var(--success)" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
