"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { ClinicalBaseline, ClinicalMetric } from "../../../types";

type FavorableDirection = "Higher" | "Lower";

/**
 * Fallback estático de métricas clínicas, usado SOLO cuando el endpoint de
 * catálogo (GET /catalogs/clinical-metrics) falla o devuelve vacío. Los ids
 * derivados del código NO son válidos para el backend (POST /baselines valida
 * contra filas reales); por eso el flujo normal siempre usa el catálogo real.
 */
const BASELINE_METRIC_SEEDS: Array<{
  code: string;
  name: string;
  unitCode: string;
  unitSymbol: string;
  defaultDirection: FavorableDirection;
}> = [
  {
    code: "weight",
    name: "Peso",
    unitCode: "kg",
    unitSymbol: "kg",
    defaultDirection: "Lower",
  },
  {
    code: "bmi",
    name: "IMC",
    unitCode: "kg_m2",
    unitSymbol: "kg/m²",
    defaultDirection: "Lower",
  },
  {
    code: "glucose_fasting",
    name: "Glucosa",
    unitCode: "mg_dl",
    unitSymbol: "mg/dL",
    defaultDirection: "Lower",
  },
  {
    code: "systolic_bp",
    name: "Presión Sistólica",
    unitCode: "mmhg",
    unitSymbol: "mmHg",
    defaultDirection: "Lower",
  },
  {
    code: "diastolic_bp",
    name: "Presión Diastólica",
    unitCode: "mmhg",
    unitSymbol: "mmHg",
    defaultDirection: "Lower",
  },
];

/** Genera un UUID determinista (forma v5) a partir de un seed textual. */
function deterministicUuid(seed: string): string {
  let a = 0x9e3779b9;
  let b = 0x85ebca6b;
  let c = 0xc2b2ae35;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    a = Math.imul(a ^ ch, 0x01000193) >>> 0;
    b = Math.imul(b ^ ch, 0x85ebca6b) >>> 0;
    c = Math.imul(c ^ ch, 0x27d4eb2f) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const raw = (hex(a) + hex(b) + hex(c) + hex(a ^ b ^ c)).split("");
  // Fija versión 5 (name-based) y variante RFC 4122.
  raw[12] = "5";
  raw[16] = "8";
  const uuid = raw.join("");
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}

/** Catálogo estático de respaldo (ids derivados, NO válidos para el backend). */
const FALLBACK_CLINICAL_METRICS: ClinicalMetric[] = BASELINE_METRIC_SEEDS.map((m) => ({
  id: deterministicUuid(`metric:${m.code}`),
  code: m.code,
  name: m.name,
  defaultUnitId: deterministicUuid(`unit:${m.unitCode}`),
  defaultUnitSymbol: m.unitSymbol,
}));

/** Dirección favorable por defecto de una métrica (por código, del seed). */
function defaultDirectionFor(code: string): FavorableDirection {
  return (
    BASELINE_METRIC_SEEDS.find((s) => s.code === code)?.defaultDirection ?? "Lower"
  );
}

/**
 * Payload de creación. El backend deriva el paciente de la inscripción
 * (anti-IDOR): el body NO incluye patientId (CreateBaselineRequest del API).
 */
interface CreateBaselinePayload {
  metricId: string;
  value: number;
  unitId: string;
  favorableDirection: FavorableDirection;
  measuredAt: string;
  targetValue: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  onCreated: () => void;
}

/** Fecha local de hoy en formato YYYY-MM-DD (DateOnly del backend). */
function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/**
 * Diálogo "Nueva línea base" (TASK-16): métrica (catálogo estático), valor,
 * unidad automática según métrica, fecha de medición, dirección favorable y
 * valor objetivo opcional. POST a /enrollments/{id}/baselines.
 */
export function CreateBaselineDialog({
  open,
  onOpenChange,
  enrollmentId,
  onCreated,
}: Props) {
  const [metricId, setMetricId] = useState("");
  const [value, setValue] = useState("");
  const [favorableDirection, setFavorableDirection] =
    useState<FavorableDirection>("Lower");
  const [measuredAt, setMeasuredAt] = useState(todayLocal());
  const [targetValue, setTargetValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catálogo real de métricas (GET /catalogs/clinical-metrics): ids y unidades
  // de BD válidos para el POST /baselines. La lista estática es solo fallback.
  const [catalogMetrics, setCatalogMetrics] = useState<ClinicalMetric[] | null>(
    null,
  );
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Sin setState síncrono: catalogLoading arranca en true (regla
    // react-hooks/set-state-in-effect) y se apaga en el finally.
    apiFetch<ClinicalMetric[]>(`${env.apiUrl}/api/v1/catalogs/clinical-metrics`)
      .then((data) => {
        // Solo se usa el catálogo real si trae métricas; si no, queda el fallback.
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setCatalogMetrics(data);
        }
      })
      .catch(() => {
        // Fallback silencioso a la lista estática.
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Métricas efectivas: catálogo real si se cargó, si no el fallback estático.
  const metrics = catalogMetrics ?? FALLBACK_CLINICAL_METRICS;

  // Formulario fresco cada vez que se abre el diálogo. Diferido un tick:
  // evita setState síncrono dentro del efecto (regla react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setMetricId("");
      setValue("");
      setFavorableDirection("Lower");
      setMeasuredAt(todayLocal());
      setTargetValue("");
      setError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const selectedMetric = metrics.find((m) => m.id === metricId) ?? null;

  const handleMetricChange = (v: string | null) => {
    const next = v ?? "";
    setMetricId(next);
    const metric = metrics.find((m) => m.id === next);
    setFavorableDirection(metric ? defaultDirectionFor(metric.code) : "Lower");
  };

  const handleSubmit = async () => {
    if (!selectedMetric) {
      setError("Selecciona una métrica.");
      return;
    }
    const numericValue = Number(value);
    if (!value || !Number.isFinite(numericValue) || numericValue <= 0) {
      setError("Ingresa un valor mayor a cero.");
      return;
    }
    if (!measuredAt) {
      setError("Selecciona la fecha de medición.");
      return;
    }
    const target = targetValue.trim() ? Number(targetValue) : null;
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      setError("El valor objetivo debe ser mayor a cero.");
      return;
    }

    const payload: CreateBaselinePayload = {
      metricId: selectedMetric.id,
      value: numericValue,
      unitId: selectedMetric.defaultUnitId,
      favorableDirection,
      measuredAt,
      targetValue: target,
    };

    setSaving(true);
    setError(null);
    try {
      await apiFetch<ClinicalBaseline>(
        `${env.apiUrl}/api/v1/program/enrollments/${enrollmentId}/baselines`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la línea base. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    metricId !== "" && value !== "" && measuredAt !== "" && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva línea base</DialogTitle>
          <DialogDescription>
            Registra una medición clínica de referencia. La unidad se ajusta
            automáticamente según la métrica seleccionada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Métrica */}
          <div className="flex flex-col gap-1.5">
            <Label>Métrica *</Label>
            <Select value={metricId} onValueChange={handleMetricChange}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue
                  placeholder={
                    catalogLoading ? "Cargando catálogo..." : "Seleccionar métrica"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.defaultUnitSymbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {catalogLoading && (
              <p className="text-xs text-muted-foreground">
                Cargando catálogo de métricas...
              </p>
            )}
          </div>

          {/* Valor + unidad automática */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Ej: 78.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 w-full"
              />
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <Label>Unidad</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                {selectedMetric?.defaultUnitSymbol ?? "—"}
              </div>
            </div>
          </div>

          {/* Fecha de medición */}
          <div className="flex flex-col gap-1.5">
            <Label>Fecha de medición *</Label>
            <Input
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="h-9 w-full"
            />
          </div>

          {/* Dirección favorable */}
          <div className="flex flex-col gap-1.5">
            <Label>Dirección favorable</Label>
            <Select
              value={favorableDirection}
              onValueChange={(v) => {
                if (v === "Higher" || v === "Lower") {
                  setFavorableDirection(v);
                }
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lower">↓ Menor es mejor</SelectItem>
                <SelectItem value="Higher">↑ Mayor es mejor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor objetivo (opcional) */}
          <div className="flex flex-col gap-1.5">
            <Label>Valor objetivo (opcional)</Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="Meta del plan"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="h-9 w-full"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Guardando..." : "Guardar línea base"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}