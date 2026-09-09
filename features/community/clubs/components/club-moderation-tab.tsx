"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Check, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/providers/i18n-provider";
import type { ModerationLogEntry, ModerationReport } from "../types";
import {
  fetchClubReports,
  fetchModerationLog,
  resolveReport,
} from "../mock/clubs-api";
import { formatRelative, initials } from "./clubs-helpers";

export function ClubModerationTab({ clubId }: { clubId: string }) {
  const t = useT();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [log, setLog] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [reportsData, logData] = await Promise.all([
      fetchClubReports(clubId),
      fetchModerationLog(clubId),
    ]);
    setReports(reportsData);
    setLog(logData);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const resolve = async (
    report: ModerationReport,
    action: "RESUELTO" | "IGNORADO",
  ) => {
    await resolveReport(report.id, action, clubId);
    await load();
  };

  return (
    <Tabs defaultValue="reports">
      <TabsList>
        <TabsTrigger value="reports">{t("Reportes pendientes")}</TabsTrigger>
        <TabsTrigger value="log">{t("Historial de moderación")}</TabsTrigger>
      </TabsList>

      <TabsContent value="reports">
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("Cargando reportes…")}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ShieldAlert className="size-8 text-muted-foreground/50" />
              <p className="text-sm">{t("No hay reportes pendientes")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-xs font-bold text-destructive">
                        {initials(report.reportedBy.displayName)}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold">
                          {report.reportedBy.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            report.targetType === "POST"
                              ? "Publicación"
                              : "Comentario",
                          )}{" "}
                          · {formatRelative(report.createdAt)}
                        </span>
                      </div>
                    </div>
                    <StatusBadge
                      status={t(report.reason)}
                      color={{
                        bg: "var(--destructive-soft)",
                        text: "var(--destructive)",
                        dot: "var(--destructive)",
                      }}
                    />
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs italic text-muted-foreground">
                      “{report.targetPreview}”
                    </p>
                    {report.details && (
                      <p className="mt-1 text-xs">{report.details}</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(report, "IGNORADO")}
                    >
                      <X data-icon="inline-start" />
                      {t("Ignorar")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolve(report, "RESUELTO")}
                    >
                      <Check data-icon="inline-start" />
                      {t("Eliminar y resolver")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="log">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Historial")}
            description={`${log.length} ${t("acciones")}`}
            icon={History}
            variant="primary"
          />
          {log.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <History className="size-8 text-muted-foreground/50" />
              <p className="text-sm">
                {t("Aún no hay acciones de moderación")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {log.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {t(entry.action)}
                    </span>
                    {entry.target && (
                      <span className="text-xs text-muted-foreground">
                        → {entry.target.displayName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor.displayName} ·{" "}
                    {formatRelative(entry.createdAt)} · {entry.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
