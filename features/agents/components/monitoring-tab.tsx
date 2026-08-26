"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgentExecutionDetail, AgentExecutionSummary } from "../types";
import { fetchExecution } from "../services/agents-service";
import { formatDate } from "../services/agents-service";
import { useT } from "@/providers/i18n-provider";
import type { MonitoringFilters } from "../hooks/use-agent-monitoring";

interface MonitoringTabProps {
  monitoring: {
    executions: AgentExecutionSummary[];
    total: number;
    loading: boolean;
    error: string | null;
    filters: MonitoringFilters;
    setFilters: (filters: Partial<MonitoringFilters>) => void;
    refetch: () => void;
  };
}

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  completado: "default",
  error: "destructive",
  ejecutando: "secondary",
};

export function MonitoringTab({ monitoring }: MonitoringTabProps) {
  const t = useT();
  const [detail, setDetail] = useState<AgentExecutionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const row = await fetchExecution(id);
      setDetail(row);
    } finally {
      setDetailLoading(false);
    }
  };

  const summary = (total: number, ms: number | null) => {
    const tokensTotal =
      monitoring.executions.reduce((acc, e) => acc + (e.tokensIn ?? 0) + (e.tokensOut ?? 0), 0);
    const errors = monitoring.executions.filter((e) => e.status === "error").length;
    return { total, ms, tokensTotal, errors };
  };

  const s = summary(monitoring.total, null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Activity}
          label={t('Ejecuciones')}
          value={String(s.total)}
          color="#2563EB"
          bg="#E5F0FA"
        />
        <MetricCard
          icon={Clock}
          label={t('Tiempo promedio')}
          value={
            monitoring.executions.length > 0
              ? `${Math.round(
                  monitoring.executions.reduce((acc, e) => acc + (e.latencyMs ?? 0), 0) /
                    monitoring.executions.length,
                ).toLocaleString("es-ES")} ms`
              : "—"
          }
          color="#0EA5E9"
          bg="#E6F7FB"
        />
        <MetricCard
          icon={Star}
          label={t('Tokens (in+out)')}
          value={s.tokensTotal.toLocaleString("es-ES")}
          color="#8B5CF6"
          bg="#F1EBF9"
        />
        <MetricCard
          icon={XCircle}
          label={t('Errores')}
          value={String(s.errors)}
          color={s.errors > 0 ? "#EF4444" : "#10B981"}
          bg={s.errors > 0 ? "#FCEBEC" : "#E6F7EF"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('Filtrar por usuario (ID)')}
          className="h-9 w-[220px]"
          defaultValue={monitoring.filters.userId ?? ""}
          onChange={(event) =>
            monitoring.setFilters({ userId: event.target.value || "" })
          }
        />
        <Select
          value={monitoring.filters.status ?? "all"}
          onValueChange={(value) =>
            monitoring.setFilters({
              status: value === "all" ? "" : (value ?? ""),
            })
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder={t('Estado')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('Todos')}</SelectItem>
            <SelectItem value="completado">{t('Completado')}</SelectItem>
            <SelectItem value="error">{t('Error')}</SelectItem>
            <SelectItem value="ejecutando">{t('Ejecutando')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={monitoring.refetch}
        >
          <RefreshCw data-icon="inline-start" className="size-4" />
          {t('Refrescar')}
        </Button>
        <span className="text-[12px] text-muted-foreground">
          {t('{count} ejecución(es) (últimos 7 días)', { count: String(monitoring.total) })}
        </span>
      </div>

      {monitoring.error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {monitoring.error}
        </p>
      )}

      {monitoring.loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : monitoring.executions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t('Sin ejecuciones')}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('Las conversaciones del agente aparecerán aquí con métricas de uso.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Fecha')}</TableHead>
                <TableHead>{t('Estado')}</TableHead>
                <TableHead>{t('Modelo')}</TableHead>
                <TableHead>{t('Latencia')}</TableHead>
                <TableHead>{t('Tokens')}</TableHead>
                <TableHead>{t('Feedback')}</TableHead>
                <TableHead className="w-16 text-right">{t('Detalle')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitoring.executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    {formatDate(execution.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[execution.status] ?? "secondary"}>
                      {execution.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12.5px]">
                    {execution.model ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12.5px]">
                    {execution.latencyMs !== null ? `${execution.latencyMs.toLocaleString("es-ES")} ms` : "—"}
                  </TableCell>
                  <TableCell className="text-[12.5px]">
                    {execution.tokensIn !== null || execution.tokensOut !== null
                      ? `${(execution.tokensIn ?? 0).toLocaleString("es-ES")} / ${(execution.tokensOut ?? 0).toLocaleString("es-ES")}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {execution.feedbackRating !== null ? (
                      <span className="flex items-center gap-1 text-[12.5px] font-medium text-amber-600">
                        <Star className="size-3.5 fill-current" />
                        {execution.feedbackRating}/5
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openDetail(execution.id)}
                      aria-label={t('Ver detalle de ejecución')}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent className="max-h-[92vh] min-w-[700px] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
            <DialogTitle className="text-base font-semibold">
              {t('Ejecución {id}', { id: detail?.id.slice(0, 8) ?? '' })}
            </DialogTitle>
            <DialogDescription>
              {detail ? formatDate(detail.createdAt) : ""} · {detail?.model ?? t('modelo desconocido')}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="px-6 py-6">
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DetailChip label={t('Estado')} value={detail.status} />
                <DetailChip
                  label={t('Latencia')}
                  value={detail.latencyMs !== null ? `${detail.latencyMs} ms` : "—"}
                />
                <DetailChip
                  label={t('Tokens')}
                  value={`${(detail.tokensIn ?? 0).toLocaleString("es-ES")} → ${(detail.tokensOut ?? 0).toLocaleString("es-ES")}`}
                />
                <DetailChip
                  label={t('Feedback')}
                  value={detail.feedbackRating !== null ? `${detail.feedbackRating}/5` : "—"}
                />
              </div>

              {Boolean(detail.output?.answer) && (
                <Section title={t('Respuesta')}>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                    {String(detail.output?.answer)}
                  </p>
                </Section>
              )}

              {Boolean(detail.output?.rag_sources) && (
                <Section title={t('Fuentes recuperadas (RAG)')}>
                  <pre className="max-h-40 overflow-auto rounded-xl bg-muted p-3 font-mono text-[11.5px]">
                    {JSON.stringify(detail.output?.rag_sources, null, 2)}
                  </pre>
                </Section>
              )}

              {Array.isArray(detail.output?.tools_used) &&
                detail.output.tools_used.length > 0 && (
                  <Section title={t('Tools ejecutadas')}>
                    <div className="flex flex-wrap gap-1.5">
                      {(detail.output.tools_used as string[]).map((tool) => (
                        <Badge key={tool} variant="outline">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

              {detail.experiences.length > 0 && (
                <Section title={t('Experiencias generadas')}>
                  {detail.experiences.map((exp, index) => (
                    <div key={index} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-[12.5px]">
                        <span className="font-semibold">Trigger:</span> {exp.trigger}
                      </p>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">{exp.response}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                        <Badge variant="secondary">{t('recurrencia')} {exp.recurrence}</Badge>
                        {exp.rating !== null && <span>rating {exp.rating}</span>}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {detail.error && (
                <Section title={t('Error')}>
                  <p className="rounded-lg bg-destructive-soft px-3 py-2 text-[12.5px] text-destructive">
                    {detail.error}
                  </p>
                </Section>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
        <Icon className="size-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-[13px] font-medium">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function MonitoringTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export function StatusIcon({ status }: { status: string }) {
  if (status === "completado") return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (status === "error") return <XCircle className="size-4 text-destructive" />;
  return <Clock className="size-4 text-muted-foreground" />;
}
