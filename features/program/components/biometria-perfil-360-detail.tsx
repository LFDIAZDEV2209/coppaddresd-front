"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Ruler,
  Weight,
  Droplet,
  ClipboardList,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/layout/section-header";
import { BiometriaFiguraCorporal } from "./biometria-figura-corporal";
import { fetchBiometriaPatient } from "../services/program-biometria-service";
import { CHART_TOOLTIP } from "../services/program-erp-constants";
import type { BiometriaPatientDetail, BiometriaExacta } from "../types/erp";

// --- Component ---

interface BiometriaPerfil360DetailProps {
  patientId: string;
}

export function BiometriaPerfil360Detail({ patientId }: BiometriaPerfil360DetailProps) {
  const [data, setData] = useState<BiometriaPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBiometriaPatient(patientId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar biometría");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return <PerfilSkeleton />;
  if (error) return (
    <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-5 text-center">
      <p className="text-sm font-semibold text-destructive">Error al cargar biometría</p>
      <p className="mt-1 text-xs text-muted-foreground">{error}</p>
    </div>
  );
  if (!data) return null;

  const gender = (data.gender?.toLowerCase() === "female" ? "female" : "male") as "male" | "female";
  const iccAlto = (data.biometria_exacta?.icc ?? 0) > 0.9;
  const exacta = data.biometria_exacta;

  // Evolution chart data
  const evoData = data.historial_semanal.map((w) => ({
    week: w.week_start,
    imc: w.imc,
    grasa: w.grasa,
    glucosa: w.glucosa,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Biometría Corporal"
          description={`Detalle de ${data.name}`}
          icon={Activity}
          variant="secondary"
        />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
          {/* Figura */}
          <div className="flex flex-col items-center gap-3">
            <BiometriaFiguraCorporal
              gender={gender}
              imc={data.imc}
              pctGrasa={exacta?.pct_grasa ?? null}
              iccAlto={iccAlto}
            />
          </div>

          {/* Body zones + chips */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Zonas corporales
            </p>
            <div className="flex flex-wrap gap-2">
              <ZoneChip
                label="IMC"
                value={data.imc?.toFixed(1) ?? "—"}
                category={data.imc_category}
              />
              <ZoneChip
                label="% Grasa"
                value={exacta?.pct_grasa != null ? `${exacta.pct_grasa.toFixed(1)}%` : "—"}
                category={getGrasaCategory(exacta?.pct_grasa ?? null, gender)}
              />
              <ZoneChip
                label="% Magra"
                value={exacta?.pct_magra != null ? `${exacta.pct_magra.toFixed(1)}%` : "—"}
                category={null}
              />
              <ZoneChip
                label="Glucosa"
                value={data.historial_semanal.length > 0 ? (data.historial_semanal[data.historial_semanal.length - 1].glucosa?.toFixed(1) ?? "—") : "—"}
                category={null}
              />
              <ZoneChip
                label="ICC"
                value={exacta?.icc?.toFixed(2) ?? "—"}
                category={iccAlto ? "Alto" : null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Biometría Exacta grid */}
      {exacta && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Mediciones exactas"
            description="Datos antropométricos del paciente"
            icon={Ruler}
            variant="secondary"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ExactaTile icon={Weight} label="Peso" value={exacta.weight != null ? `${exacta.weight} kg` : "—"} />
            <ExactaTile icon={Ruler} label="Talla" value={exacta.height != null ? `${exacta.height} cm` : "—"} />
            <ExactaTile icon={ClipboardList} label="Cintura" value={exacta.waist != null ? `${exacta.waist} cm` : "—"} />
            <ExactaTile icon={ClipboardList} label="Cadera" value={exacta.hip != null ? `${exacta.hip} cm` : "—"} />
            <ExactaTile icon={Ruler} label="Muñeca" value={exacta.wrist != null ? `${exacta.wrist} cm` : "—"} />
            <ExactaTile icon={Activity} label="ICC" value={exacta.icc?.toFixed(2) ?? "—"} />
            <ExactaTile icon={Droplet} label="% Grasa" value={exacta.pct_grasa != null ? `${exacta.pct_grasa.toFixed(1)}%` : "—"} />
            <ExactaTile icon={Activity} label="% Magra" value={exacta.pct_magra != null ? `${exacta.pct_magra.toFixed(1)}%` : "—"} />
          </div>
        </div>
      )}

      {/* Evolution chart: dual axis IMC + Grasa */}
      {evoData.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Evolución semanal"
            description="IMC y % grasa corporal"
            icon={TrendingUp}
            variant="secondary"
          />
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis yAxisId="imc" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis yAxisId="grasa" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value, name) => [Number(value).toFixed(1), name]}
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return isNaN(d.getTime()) ? String(label) : d.toLocaleDateString("es-ES");
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="imc" type="monotone" dataKey="imc" name="IMC" stroke="var(--info)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="grasa" type="monotone" dataKey="grasa" name="% Grasa" stroke="var(--warning)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Glucosa area chart */}
      {evoData.some((w) => w.glucosa != null) && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Evolución glucosa"
            description="Tendencia semanal de glucosa"
            icon={Droplet}
            variant="secondary"
          />
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? v : `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  {...CHART_TOOLTIP}
                  formatter={(value) => [Number(value).toFixed(1), "Glucosa"]}
                  labelFormatter={(label) => {
                    const d = new Date(String(label));
                    return isNaN(d.getTime()) ? String(label) : d.toLocaleDateString("es-ES");
                  }}
                />
                <Line type="monotone" dataKey="glucosa" name="Glucosa" stroke="#0E7490" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Adherence Heatmap 28d */}
      {data.adherence_heatmap.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Heatmap adherencia"
            description="Últimos 28 días (7 × 4)"
            icon={ClipboardList}
            variant="secondary"
          />
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {data.adherence_heatmap.map((cell) => (
              <div
                key={cell.day_index}
                className={`flex size-8 items-center justify-center rounded text-[10px] font-medium ${
                  cell.completed
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground"
                }`}
                title={`Día ${cell.day_index}: ${cell.completed ? "Completado" : "Pendiente"}`}
              >
                {cell.day_index}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial semanal tabla */}
      {data.historial_semanal.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Historial semanal"
            description="Detalle por semana con deltas"
            icon={ClipboardList}
            variant="secondary"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">Semana</th>
                  <th className="pb-2 pr-3 text-right">IMC</th>
                  <th className="pb-2 pr-3 text-right">Δ IMC</th>
                  <th className="pb-2 pr-3 text-right">% Grasa</th>
                  <th className="pb-2 pr-3 text-right">Δ Grasa</th>
                  <th className="pb-2 pr-3 text-right">Glucosa</th>
                  <th className="pb-2 text-right">Δ Glucosa</th>
                </tr>
              </thead>
              <tbody>
                {data.historial_semanal.map((w, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium">{formatWeekStart(w.week_start)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{w.imc?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_imc} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{w.grasa?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_grasa} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{w.glucosa?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 text-right">
                      <DeltaBadge value={w.delta_glucosa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function ZoneChip({ label, value, category }: { label: string; value: string; category: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      {category && (
        <Badge className="bg-info-soft text-info-foreground text-[10px]">
          {category}
        </Badge>
      )}
    </div>
  );
}

function ExactaTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  const positive = value > 0;
  // For IMC/Grasa/Glucosa, negative delta is usually good (improvement)
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${positive ? "text-destructive" : "text-success"}`}>
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? "+" : ""}{value.toFixed(1)}
    </span>
  );
}

function getGrasaCategory(pct: number | null, gender: "male" | "female"): string | null {
  if (pct == null) return null;
  if (gender === "male") {
    if (pct < 20) return "Óptimo";
    if (pct < 25) return "Normal";
    if (pct < 30) return "Alto";
    return "Obesidad";
  }
  if (pct < 25) return "Óptimo";
  if (pct < 32) return "Normal";
  if (pct < 38) return "Alto";
  return "Obesidad";
}

function formatWeekStart(weekStart: string): string {
  const d = new Date(weekStart);
  if (isNaN(d.getTime())) return weekStart;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function PerfilSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
          <Skeleton className="h-[320px] w-[120px] mx-auto rounded-xl" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-32" />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-[280px] w-full rounded" />
      </div>
    </div>
  );
}
