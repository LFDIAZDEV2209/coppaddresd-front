"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Droplets,
  Gauge,
  HeartPulse,
  RefreshCw,
  Thermometer,
  Weight,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatientMeasurements } from "../services/patients-service";
import type { ClinicalMeasurementDto } from "../types";

/** Estilos de la caja de icono por tono semántico (misma paleta que la página). */
const TONES = {
  primary: "bg-primary/20 text-primary ring-1 ring-primary/40",
  info: "bg-info/20 text-info ring-1 ring-info/40",
  success: "bg-success/20 text-success ring-1 ring-success/40",
  warning: "bg-warning/20 text-warning ring-1 ring-warning/40",
  destructive: "bg-destructive/20 text-destructive ring-1 ring-destructive/40",
} as const;

type Tone = keyof typeof TONES;

/** Batches visibles por defecto; el resto queda bajo "Ver historial". */
const VISIBLE_BATCHES = 3;

/** Formato numérico de valores: como mucho 1 decimal (ej: 98.6, 120). */
const valueFormatter = new Intl.NumberFormat("es", {
  maximumFractionDigits: 1,
});

interface MetricVisual {
  icon: LucideIcon;
  tone: Tone;
  /** Key i18n del label; null → fallback con `metricName · metricCode`. */
  labelKey: string | null;
}

/** Mapa de metricCode → presentación (icono, tono, label i18n). */
const METRIC_MAP: Record<string, MetricVisual> = {
  heart_rate: {
    icon: HeartPulse,
    tone: "destructive",
    labelKey: "Frecuencia cardíaca",
  },
  systolic_bp: { icon: Gauge, tone: "primary", labelKey: "Presión sistólica" },
  diastolic_bp: {
    icon: Gauge,
    tone: "primary",
    labelKey: "Presión diastólica",
  },
  o2_saturation: { icon: Wind, tone: "success", labelKey: "Saturación O₂" },
  glucose_fasting: { icon: Droplets, tone: "warning", labelKey: "Glucosa" },
  weight: { icon: Weight, tone: "info", labelKey: "Peso" },
  temperature_c: { icon: Thermometer, tone: "warning", labelKey: "Temperatura" },
};

/** Métrica desconocida: nunca rompe, muestra el código crudo como fallback. */
const FALLBACK_VISUAL: MetricVisual = {
  icon: Activity,
  tone: "primary",
  labelKey: null,
};

/**
 * Mediciones clínicas del paciente persistidas por la app móvil
 * (`app.clinical_measurements`, `Source='mobile'`). Sección autocargada
 * (patrón de PatientProfessionalsSection): el backend devuelve una lista
 * plana y el agrupamiento por batch (check-in) se hace acá con un Map que
 * preserva el orden de la API. La sección legacy de signos vitales no se toca.
 */
export function ClinicalMeasurementsSection({
  patientId,
}: {
  patientId: string;
}) {
  const t = useT();
  const [measurements, setMeasurements] = useState<ClinicalMeasurementDto[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Carga propia: los setState solo ocurren tras el await (nunca síncronos en
  // el efecto). reloadKey fuerza la recarga desde el botón "Reintentar".
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getPatientMeasurements(patientId);
        if (!active) return;
        setMeasurements(data);
        setError(null);
      } catch {
        if (!active) return;
        setError("No pudimos cargar las mediciones");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  // Agrupación por batchId preservando el orden de la API (Map = inserción);
  // batchId null → cada medición es su propia tarjeta (su id como clave).
  const groups = useMemo(() => {
    const map = new Map<string, ClinicalMeasurementDto[]>();
    for (const measurement of measurements) {
      const key = measurement.batchId ?? measurement.id;
      const list = map.get(key);
      if (list) list.push(measurement);
      else map.set(key, [measurement]);
    }
    return [...map.values()];
  }, [measurements]);

  const visibleGroups = expanded ? groups : groups.slice(0, VISIBLE_BATCHES);
  const hiddenCount = groups.length - visibleGroups.length;

  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Mediciones clínicas")}
    >
      <SectionHeader
        title={t("Mediciones clínicas")}
        description={t("{count} mediciones registradas", {
          count: String(measurements.length),
        })}
        icon={HeartPulse}
        variant="primary"
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {loading ? (
          <MeasurementsSkeleton />
        ) : error ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft/40 py-8 text-center"
            role="alert"
          >
            <p className="text-sm font-semibold text-destructive">
              {t("No pudimos cargar las mediciones")}
            </p>
            <Button variant="outline" size="sm" onClick={reload}>
              <RefreshCw data-icon="inline-start" />
              {t("Reintentar")}
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("Sin mediciones registradas.")}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {visibleGroups.map((group) => (
                <MeasurementCard
                  key={group[0].batchId ?? group[0].id}
                  group={group}
                />
              ))}
            </ul>
            {(expanded || hiddenCount > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp data-icon="inline-start" />
                    {t("Ver menos")}
                  </>
                ) : (
                  <>
                    <ChevronDown data-icon="inline-start" />
                    {t("Ver historial")} ({hiddenCount})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Tarjeta de un check-in: fecha + badge de fuente + un chip por métrica. */
function MeasurementCard({ group }: { group: ClinicalMeasurementDto[] }) {
  const t = useT();
  const first = group[0];
  const sourceLabel =
    first.source === "mobile" ? t("App móvil") : first.source;
  return (
    <li className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">
          {formatDateTime(first.observedAt)}
        </p>
        <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-0.5 text-[11px] font-medium text-info">
          {sourceLabel}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {group.map((measurement) => {
          const visual =
            METRIC_MAP[measurement.metricCode] ?? FALLBACK_VISUAL;
          const Icon = visual.icon;
          const label = visual.labelKey
            ? t(visual.labelKey)
            : `${measurement.metricName} · ${measurement.metricCode}`;
          return (
            <li
              key={measurement.id}
              className="flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[visual.tone]}`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] text-muted-foreground">
                  {label}
                </span>
                <span className="block truncate text-sm font-semibold">
                  {valueFormatter.format(measurement.value)}{" "}
                  {measurement.unitSymbol}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** Skeleton con la forma de la sección (encabezado + tarjetas de check-in). */
function MeasurementsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function formatDateTime(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}