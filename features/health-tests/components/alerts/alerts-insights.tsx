"use client";

import { useMemo } from "react";
import { Activity, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useT } from "@/providers/i18n-provider";
import { useNotificationCharts } from "../../hooks/use-notifications";
import { alertStatusTones, severityTones, tones } from "../shared/colors";
import { barStyle, chipStyle, dotStyle } from "../shared/depth";
import { ModuleErrorState } from "../shared/module-states";
import { StatSkeleton } from "../shared/module-chart-card";

// Colores y etiquetas por severidad (claves del backend y variantes en español).
// Rampa Carbon: rojo crítico → naranja alto → amarillo medio → azul bajo.
const SEVERITY_FILL: Record<string, string> = {
  critical: severityTones.critica.solid,
  critica: severityTones.critica.solid,
  high: severityTones.alta.solid,
  alta: severityTones.alta.solid,
  moderate: severityTones.media.solid,
  media: severityTones.media.solid,
  low: severityTones.baja.solid,
  baja: severityTones.baja.solid,
  informativa: severityTones.informativa.solid,
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  critica: "Crítica",
  high: "Alta",
  alta: "Alta",
  moderate: "Media",
  media: "Media",
  low: "Baja",
  baja: "Baja",
  informativa: "Informativa",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  activa: "Activa",
  reviewing: "En revisión",
  "en-revision": "En revisión",
  resolved: "Atendida",
  atendida: "Atendida",
  closed: "Cerrada",
  cerrada: "Cerrada",
};

const FALLBACK = tones.slate.solid;

/** Alias de claves de estado del backend a las del módulo. */
const STATUS_ALIASES: Record<string, string> = {
  active: "activa",
  reviewing: "en-revision",
  resolved: "atendida",
  closed: "cerrada",
};

function statusTone(key: string) {
  return alertStatusTones[STATUS_ALIASES[key] ?? key] ?? tones.slate;
}

function toPoints(
  record: Record<string, number> | undefined,
  labels: Record<string, string>
) {
  return Object.entries(record ?? {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({ key, label: labels[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Riel lateral del cockpit de alertas: resume el pulso de riesgo sin competir
 * con la tabla. Versiones compactas de severidad, indicadores y tendencia.
 */
export function AlertsInsightsRail({ days = 30 }: { days?: number }) {
  const t = useT();
  const { data, loading, error, reload } = useNotificationCharts(days);

  const severities = useMemo(
    () => toPoints(data?.alertsBySeverity, SEVERITY_LABEL),
    [data?.alertsBySeverity]
  );
  const statuses = useMemo(
    () => toPoints(data?.alertsByStatus, STATUS_LABEL),
    [data?.alertsByStatus]
  );
  const indicators = useMemo(
    () =>
      Object.entries(data?.alertsByIndicator ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, value]) => ({ label, value })),
    [data?.alertsByIndicator]
  );
  const trend = useMemo(
    () =>
      (data?.alertsByDay ?? []).map((point) => ({
        label: point.label,
        value: point.value,
      })),
    [data?.alertsByDay]
  );

  const severityTotal = severities.reduce((acc, item) => acc + item.value, 0);
  const indicatorMax = indicators[0]?.value ?? 1;

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <StatSkeleton count={2} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <section className="relative flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <header className="flex items-center gap-2 px-4 py-3">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={chipStyle(tones.sky, 28)}
          aria-hidden
        >
          <Activity className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">{t("Pulso de riesgo")}</h2>
      </header>

      <div className="flex flex-col gap-2 px-4 py-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          {t("Alertas por severidad")}
        </h3>

        {severities.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("Sin alertas en el periodo")}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
              <div className="relative">
                <ResponsiveContainer width="100%" height={112}>
                  <PieChart>
                    <Pie
                      data={severities}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={1}
                    >
                      {severities.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={SEVERITY_FILL[entry.key] ?? FALLBACK}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<MiniTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold tabular-nums">
                    {severityTotal}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {t("Alertas")}
                  </span>
                </div>
              </div>

              <ul className="flex min-w-0 flex-col gap-1.5">
                {severities.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: SEVERITY_FILL[entry.key] ?? FALLBACK,
                        }}
                        aria-hidden
                      />
                      <span className="truncate">{t(entry.label)}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {entry.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          {t("Indicadores con más alertas")}
        </h3>

        {indicators.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("Sin actividad en el periodo")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {indicators.map((item) => (
              <li key={item.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {item.value}
                  </span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={barStyle(
                      tones.sky,
                      Math.max(6, (item.value / indicatorMax) * 100),
                    )}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="size-3.5" />
          {t("Tendencia (30 días)")}
        </h3>

        {trend.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("Sin actividad en el periodo")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={76}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="ht-trend-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={tones.emerald.solid} />
                  <stop offset="55%" stopColor={tones.sky.solid} />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
                <linearGradient id="ht-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={tones.sky.solid}
                    stopOpacity={0.32}
                  />
                  <stop
                    offset="100%"
                    stopColor={tones.sky.solid}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="url(#ht-trend-line)"
                strokeWidth={2}
                fill="url(#ht-trend-fill)"
                dot={false}
              />
              <Tooltip content={<MiniTooltip />} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        <h3 className="text-xs font-medium text-muted-foreground">
          {t("Alertas por estado")}
        </h3>

        {statuses.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("Sin alertas en el periodo")}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {statuses.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                style={{
                  backgroundColor: statusTone(entry.key).soft,
                  borderColor: statusTone(entry.key).solid,
                  color: statusTone(entry.key).softText,
                }}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={dotStyle(statusTone(entry.key))}
                  aria-hidden
                />
                <span>{t(entry.label)}</span>
                <span className="font-semibold tabular-nums">
                  {entry.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  payload?: { label?: string };
}

function MiniTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11.5px] shadow-sm">
      <span className="font-medium">{item.payload?.label ?? item.name}</span>
      <span className="ml-2 font-semibold tabular-nums">{item.value}</span>
    </div>
  );
}
