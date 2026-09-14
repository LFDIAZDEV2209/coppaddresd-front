"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DotItemDotProps } from "recharts";
import { useT } from "@/providers/i18n-provider";
import { ChartTabs, usePersistedTab } from "./chart-tabs";
import { ClinicalEvolutionCard } from "./program-patient-overview-page";
import { formatControlDate } from "./controles-timeline";
import {
  CHART_TOOLTIP,
  CLINICAL_COLORS,
} from "../services/program-erp-constants";
import type { ClinicalMeasurementDto } from "@/features/patients/types";
import type {
  PatientControlMilestoneDto,
  PatientOverviewClinicalMetricsDto,
} from "../types/erp";

/** Color por métrica: reusa la paleta clínica; fallback al primary del tema. */
const METRIC_COLORS: Record<string, string> = {
  bmi: CLINICAL_COLORS.bmi,
  hba1c: CLINICAL_COLORS.hba1c,
  body_fat: CLINICAL_COLORS.body_fat,
  glucose: CLINICAL_COLORS.glucose,
  glucose_fasting: CLINICAL_COLORS.glucose,
};

/**
 * Punto de la serie: los valores cuyo `batchId` coincide con el
 * `exam_batch_id` de un documento de control (origen laboratorio) se dibujan
 * más grandes y en color de alerta, para distinguirlos de las mediciones de
 * la app móvil.
 */
function renderMeasurementDot(color: string) {
  return function MeasurementDot(props: DotItemDotProps) {
    const { cx, cy, payload } = props;
    const isLab = Boolean(payload?.isLab);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isLab ? 5 : 3}
        fill={isLab ? "var(--warning)" : color}
        stroke={isLab ? "var(--card)" : "none"}
        strokeWidth={isLab ? 2 : 0}
      />
    );
  };
}

interface ControlesMeasurementsChartsProps {
  measurements: ClinicalMeasurementDto[];
  milestones: PatientControlMilestoneDto[];
  /** Serie clínica 12 semanas ya cargada por el Perfil 360 (opcional). */
  clinicalMetrics?: PatientOverviewClinicalMetricsDto | null;
}

/** Serie clínica por métrica + resaltado de mediciones de laboratorio. */
export function ControlesMeasurementsCharts({
  measurements,
  milestones,
  clinicalMetrics = null,
}: ControlesMeasurementsChartsProps) {
  const t = useT();

  // Tabs = métricas presentes en las mediciones, en orden de aparición.
  const metricTabs = useMemo(() => {
    const map = new Map<string, string>();
    for (const measurement of measurements) {
      if (!map.has(measurement.metricCode)) {
        map.set(measurement.metricCode, measurement.metricName);
      }
    }
    return [...map.entries()].map(([code, name]) => ({
      key: code,
      label: name,
    }));
  }, [measurements]);

  const [storedTab, setTab] = usePersistedTab("controles-mediciones", "");
  const selected = metricTabs.some((tab) => tab.key === storedTab)
    ? storedTab
    : (metricTabs[0]?.key ?? "");
  const selectedLabel =
    metricTabs.find((tab) => tab.key === selected)?.label ?? selected;

  // Batches de laboratorio referenciados por los documentos de los controles.
  const labBatchIds = useMemo(() => {
    const ids = new Set<string>();
    for (const milestone of milestones) {
      if (milestone.document?.exam_batch_id) {
        ids.add(milestone.document.exam_batch_id);
      }
    }
    return ids;
  }, [milestones]);

  const chartData = useMemo(() => {
    return measurements
      .filter((measurement) => measurement.metricCode === selected)
      .slice()
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
      .map((measurement) => ({
        date: formatControlDate(measurement.observedAt),
        value: measurement.value,
        isLab: measurement.batchId !== null && labBatchIds.has(measurement.batchId),
      }));
  }, [measurements, selected, labBatchIds]);

  const color = METRIC_COLORS[selected] ?? "var(--primary)";

  return (
    <div className="flex flex-col gap-4">
      <ClinicalEvolutionCard metrics={clinicalMetrics} />

      <ChartTabs
        tabs={metricTabs}
        value={selected}
        onChange={setTab}
        title={t("Mediciones del paciente")}
        description={t(
          "Serie clínica por métrica; los puntos resaltados provienen de exámenes de laboratorio",
        )}
        icon={Activity}
      >
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("Sin mediciones registradas para este paciente.")}
          </p>
        ) : (
          <>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={38}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP}
                    formatter={(value) => [
                      Number(value).toFixed(1),
                      selectedLabel,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={selectedLabel}
                    stroke={color}
                    strokeWidth={2}
                    connectNulls
                    dot={renderMeasurementDot(color)}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-full border-2 border-card bg-warning"
              />
              {t("Puntos resaltados: mediciones de exámenes de laboratorio")}
            </p>
          </>
        )}
      </ChartTabs>
    </div>
  );
}
