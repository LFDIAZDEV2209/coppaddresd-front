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
import { xpDeliveredSeries } from "../mock-data";
import { AwardDialog } from "./award-dialog";
import { XpLineChart } from "./charts";

export function RewardsPage() {
  const t = useT();
  const { recognitions } = useErp();

  const xpData = xpDeliveredSeries.map((d) => ({
    label: d.week,
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
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
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
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-semibold">{r.member}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={r.typeLabel}
                      color={{ bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">
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
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
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
                <TableHead className="hidden md:table-cell">{t("Fecha")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <StatusBadge
                    status={t("Todos")}
                    color={{ bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" }}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">284</TableCell>
                <TableCell className="text-xs font-semibold">218 (77%)</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{t("hoy")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <StatusBadge
                    status={t("Inactivos")}
                    color={{ bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">8</TableCell>
                <TableCell className="text-xs font-semibold">5 (63%)</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{t("ayer")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <StatusBadge
                    status={t("Activos >22d")}
                    color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }}
                  />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">12</TableCell>
                <TableCell className="text-xs font-semibold">11 (92%)</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">23 ago</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* XP chart */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
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
