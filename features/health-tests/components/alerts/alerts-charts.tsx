"use client";

import { useMemo } from "react";
import { BarChart3, BellRing, PieChart, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/providers/i18n-provider";
import { ChartCard, ChartCardSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState } from "../shared/module-states";
import { severityHex } from "../shared/colors";
import { useNotificationCharts } from "../../hooks/use-notifications";

/**
 * Gráficos de alertas y notificaciones (SPEC A13): severidad, estado,
 * indicadores, evolución temporal y canales de notificación. Los datos provienen
 * de la pre-agregación del backend (`/notifications/charts`).
 */

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  moderate: "Media",
  low: "Baja",
  informativa: "Informativa",
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  reviewing: "En revisión",
  resolved: "Atendida",
  closed: "Cerrada",
  activa: "Activa",
  "en-revision": "En revisión",
  atendida: "Atendida",
  cerrada: "Cerrada",
};

const CHANNEL_LABELS: Record<string, string> = {
  community: "Comunidad",
  sms: "SMS",
};

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  sent: "Enviada",
  queued: "En cola",
  failed: "Fallida",
  skipped: "Omitida",
};

const STATUS_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#94a3b8"];
const CHANNEL_COLORS = ["#7c3aed", "#0ea5e9"];
const FALLBACK_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#7c3aed"];

function toData(record: Record<string, number> | undefined, labels: Record<string, string>) {
  return Object.entries(record ?? {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? labels[key.toLowerCase()] ?? key,
      value,
    }));
}

/** Color de la porción según la severidad (o paleta por defecto). */
function severityColor(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized in SEVERITY_LABELS) {
    const spanish = SEVERITY_LABELS[normalized];
    const hex = severityHex(
      spanish === "Crítica"
        ? "critica"
        : spanish === "Alta"
          ? "alta"
          : spanish === "Media"
            ? "media"
            : spanish === "Informativa"
              ? "informativa"
              : "baja",
    );
    if (hex) return hex;
  }
  return FALLBACK_COLORS[0];
}

export function AlertsCharts({ days = 30 }: { days?: number }) {
  const t = useT();
  const { data, loading, error, reload } = useNotificationCharts(days);

  const severity = useMemo(
    () => toData(data?.alertsBySeverity, SEVERITY_LABELS),
    [data],
  );
  const statuses = useMemo(() => toData(data?.alertsByStatus, STATUS_LABELS), [data]);
  const indicators = useMemo(
    () =>
      toData(data?.alertsByIndicator, {})
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [data],
  );
  const alertsByDay = useMemo(
    () =>
      (data?.alertsByDay ?? []).map((point) => ({
        label: point.label,
        value: point.value,
      })),
    [data],
  );
  const channels = useMemo(
    () => toData(data?.notificationsByChannel, CHANNEL_LABELS),
    [data],
  );
  const notificationStatuses = useMemo(
    () => toData(data?.notificationsByStatus, NOTIFICATION_STATUS_LABELS),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return <ModuleErrorState message={error} onRetry={reload} />;
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title={t("Alertas por severidad")}
        description={t("Distribución de alertas según el nivel de riesgo")}
        icon={PieChart}
      >
        {severity.length === 0 ? (
          <EmptyChart message={t("Sin alertas en el periodo")} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <RechartsPieChart>
              <Pie
                data={severity}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {severity.map((entry) => (
                  <Cell key={entry.key} fill={severityColor(entry.key)} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
        <ChartLegend
          items={severity.map((entry) => ({
            label: entry.label,
            value: entry.value,
            color: severityColor(entry.key),
          }))}
        />
      </ChartCard>

      <ChartCard
        title={t("Alertas por estado")}
        description={t("Situación del flujo de gestión de alertas")}
        icon={BellRing}
      >
        {statuses.length === 0 ? (
          <EmptyChart message={t("Sin alertas en el periodo")} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <RechartsPieChart>
              <Pie
                data={statuses}
                dataKey="value"
                nameKey="label"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {statuses.map((entry, index) => (
                  <Cell
                    key={entry.key}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
        <ChartLegend
          items={statuses.map((entry, index) => ({
            label: entry.label,
            value: entry.value,
            color: STATUS_COLORS[index % STATUS_COLORS.length],
          }))}
        />
      </ChartCard>

      <ChartCard
        title={t("Indicadores con más alertas")}
        description={t("Qué hallazgos están generando más alertas")}
        icon={BarChart3}
      >
        {indicators.length === 0 ? (
          <EmptyChart message={t("Sin alertas en el periodo")} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={indicators} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title={t("Evolución de alertas y notificaciones")}
        description={t("Alertas generadas y mensajes enviados en el periodo")}
        icon={TrendingUp}
      >
        {alertsByDay.length === 0 && channels.length === 0 ? (
          <EmptyChart message={t("Sin actividad en el periodo")} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={alertsByDay} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} tickLine={false} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                name={t("Alertas")}
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {channels.length > 0 && (
          <ChartLegend
            items={[
              ...channels.map((entry, index) => ({
                label: entry.label,
                value: entry.value,
                color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
              })),
              ...notificationStatuses.map((entry, index) => ({
                label: entry.label,
                value: entry.value,
                color: FALLBACK_COLORS[(index + 2) % FALLBACK_COLORS.length],
              })),
            ]}
          />
        )}
      </ChartCard>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground"
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
          <span className="font-semibold text-foreground">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11.5px] shadow-sm">
      <span className="font-semibold text-foreground">{item.name}</span>
      <span className="ml-2 text-muted-foreground">{item.value}</span>
    </div>
  );
}
