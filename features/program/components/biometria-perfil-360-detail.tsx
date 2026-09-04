"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Ruler,
  Weight,
  Droplet,
  ClipboardList,
  Target,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/layout/section-header";
import { PagedListFooter } from "./paged-list-footer";
import { BiometriaFiguraCorporal } from "./biometria-figura-corporal";
import { fetchBiometriaPatient } from "../services/program-biometria-service";
import type {
  BiometriaPatientDetail,
  PatientOverviewTaskHoy,
} from "../types/erp";
import {
  MISSION_LABELS,
  MISSION_ORDER,
} from "../services/program-erp-constants";

// --- Shared fetch hook ---

export function useBiometriaPatient(patientId: string) {
  const [data, setData] = useState<BiometriaPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBiometriaPatient(patientId)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Error al cargar biometría",
        );
        setLoading(false);
      });
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch -> state intentional
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
          setError(
            err instanceof Error ? err.message : "Error al cargar biometría",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, fetchData]);

  return { data, loading, error, retry: fetchData };
}

// --- Helpers shared by hero/history ---

function resolveGender(
  rawGender: string | null | undefined,
): "male" | "female" {
  const raw = String(rawGender ?? "")
    .trim()
    .toLowerCase();
  if (raw === "female" || raw === "femenino" || raw === "f" || raw === "mujer")
    return "female";
  return "male";
}

// --- Hero sections: figura + zonas + mediciones exactas ---

export function BiometriaHeroSections({
  data,
  tareasHoy,
}: {
  data: BiometriaPatientDetail;
  tareasHoy?: PatientOverviewTaskHoy[] | null;
}) {
  const gender = resolveGender(data.gender);
  const iccAlto = (data.biometria_exacta?.icc ?? 0) > 0.9;
  const exacta = data.biometria_exacta;

  return (
    <div className="flex flex-col gap-5">
      {/* Único box: figura + zonas + mediciones exactas */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <SectionHeader
          title="Figura y zonas corporales"
          description="Distribución antropométrica"
          icon={Activity}
          variant="secondary"
        />
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <BiometriaFiguraCorporal
              gender={gender}
              imc={data.imc}
              pctGrasa={exacta?.pct_grasa ?? null}
              iccAlto={iccAlto}
              exacta={exacta}
            />
          </div>
          <div className="flex flex-col gap-5">
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
                  value={
                    exacta?.pct_grasa != null
                      ? `${exacta.pct_grasa.toFixed(1)}%`
                      : "—"
                  }
                  category={getGrasaCategory(exacta?.pct_grasa ?? null, gender)}
                />
                <ZoneChip
                  label="% Magra"
                  value={
                    exacta?.pct_magra != null
                      ? `${exacta.pct_magra.toFixed(1)}%`
                      : "—"
                  }
                  category={null}
                />
                <ZoneChip
                  label="Glucosa"
                  value={
                    data.historial_semanal.length > 0
                      ? (data.historial_semanal[
                          data.historial_semanal.length - 1
                        ].glucosa?.toFixed(1) ?? "—")
                      : "—"
                  }
                  category={
                    data.historial_semanal.length > 0
                      ? getGlucosaCategory(
                          data.historial_semanal[
                            data.historial_semanal.length - 1
                          ].glucosa,
                        )
                      : null
                  }
                />
                <ZoneChip
                  label="ICC"
                  value={exacta?.icc?.toFixed(2) ?? "—"}
                  category={iccAlto ? "Alto" : null}
                />
              </div>
            </div>
            {exacta && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Ruler className="size-3.5" />
                  Mediciones exactas
                  <span className="hidden font-normal normal-case tracking-normal text-[11px] text-muted-foreground/60 sm:inline">
                    — datos antropométricos
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
                  <MetricStripCell
                    icon={Weight}
                    label="Peso"
                    value={exacta.weight != null ? `${exacta.weight} kg` : "—"}
                  />
                  <MetricStripCell
                    icon={Ruler}
                    label="Talla"
                    value={exacta.height != null ? `${exacta.height} cm` : "—"}
                  />
                  <MetricStripCell
                    icon={ClipboardList}
                    label="Cintura"
                    value={exacta.waist != null ? `${exacta.waist} cm` : "—"}
                  />
                  <MetricStripCell
                    icon={ClipboardList}
                    label="Cadera"
                    value={exacta.hip != null ? `${exacta.hip} cm` : "—"}
                  />
                  <MetricStripCell
                    icon={Ruler}
                    label="Muñeca"
                    value={exacta.wrist != null ? `${exacta.wrist} cm` : "—"}
                  />
                  <MetricStripCell
                    icon={Activity}
                    label="ICC"
                    value={exacta.icc?.toFixed(2) ?? "—"}
                  />
                  <MetricStripCell
                    icon={Droplet}
                    label="% Grasa"
                    value={
                      exacta.pct_grasa != null
                        ? `${exacta.pct_grasa.toFixed(1)}%`
                        : "—"
                    }
                  />
                  <MetricStripCell
                    icon={Activity}
                    label="% Magra"
                    value={
                      exacta.pct_magra != null
                        ? `${exacta.pct_magra.toFixed(1)}%`
                        : "—"
                    }
                  />
                </div>
              </div>
            )}
            {tareasHoy !== undefined && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Target className="size-3.5" />
                  Misiones de hoy
                  <span className="hidden font-normal normal-case tracking-normal text-[11px] text-muted-foreground/60 sm:inline">
                    — estado actual
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                  {tareasHoy && tareasHoy.length > 0
                    ? tareasHoy.map((t) => (
                        <div
                          key={t.task_code}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center ${
                            t.completed
                              ? "border-success/20 bg-success-soft"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          <span
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                              t.completed
                                ? "bg-success text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t.completed ? (
                              <CheckCircle2 className="size-5" />
                            ) : (
                              <Lock className="size-4" />
                            )}
                          </span>
                          <span className="text-xs font-medium leading-tight">
                            {MISSION_LABELS[t.task_code] ?? t.task_code}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
                              t.completed
                                ? "bg-success text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t.completed ? `+${t.points} XP` : "Pendiente"}
                          </span>
                        </div>
                      ))
                    : MISSION_ORDER.map((code) => (
                        <div
                          key={code}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive-soft p-3 text-center"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive text-white">
                            <Lock className="size-4" />
                          </span>
                          <span className="text-xs font-medium leading-tight">
                            {MISSION_LABELS[code]}
                          </span>
                          <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                            Sin datos
                          </span>
                        </div>
                      ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- History sections: heatmap 28d + historial semanal ---

export function BiometriaHistorySections({
  data,
}: {
  data: BiometriaPatientDetail;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const historialTotal = data.historial_semanal.length;
  const totalPages = Math.max(1, Math.ceil(historialTotal / pageSize));
  const paginatedHistorial = useMemo(
    () => data.historial_semanal.slice((page - 1) * pageSize, page * pageSize),
    [data.historial_semanal, page, pageSize],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp page, intentional
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on data change
    setPage(1);
  }, [historialTotal]);
  if (
    data.adherence_heatmap.length === 0 &&
    data.historial_semanal.length === 0
  )
    return null;
  const hasHeatmap = data.adherence_heatmap.length > 0;
  const hasHistorial = data.historial_semanal.length > 0;

  // weekday alignment: first date's Mon-based column (0=Mon)
  const firstDate = hasHeatmap
    ? new Date(data.adherence_heatmap[0].date)
    : null;
  const offset =
    firstDate && !isNaN(firstDate.getTime()) ? (firstDate.getDay() + 6) % 7 : 0;

  if (hasHeatmap && hasHistorial) {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card order-1 lg:order-1">
          <div className="p-5 pb-0">
            <SectionHeader
              title="Historial semanal"
              description="Detalle por semana con deltas"
              icon={ClipboardList}
              variant="secondary"
            />
          </div>
          <div className="mt-4 overflow-x-auto px-5">
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
                {paginatedHistorial.map((w, i) => (
                  <tr
                    key={(page - 1) * pageSize + i}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3 font-medium">
                      {formatWeekStart(w.week_start)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.imc?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_imc} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.grasa?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_grasa} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.glucosa?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaBadge value={w.delta_glucosa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PagedListFooter
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[5, 7, 10, 20, 50]}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 order-2 lg:order-2">
          <SectionHeader
            title="Heatmap adherencia"
            description="Últimos 28 días"
            icon={ClipboardList}
            variant="secondary"
          />
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <span
                key={d}
                className="text-center text-[10px] font-semibold text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`ph-${i}`} className="aspect-square" />
            ))}
            {data.adherence_heatmap.map((cell) => {
              const d = new Date(cell.date);
              const label = !isNaN(d.getTime())
                ? d.getDate().toString()
                : String(cell.day_index);
              const title = !isNaN(d.getTime())
                ? `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}: ${cell.completed ? "Completado" : "Pendiente"}`
                : `Día ${cell.day_index}: ${cell.completed ? "Completado" : "Pendiente"}`;
              return (
                <div
                  key={cell.day_index}
                  className={`flex aspect-square items-center justify-center rounded-md border text-[10px] font-medium ${cell.completed ? "border-success/20 bg-success text-white" : "border-border bg-muted text-muted-foreground"}`}
                  title={title}
                >
                  {label}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success" /> Completado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm border border-border bg-muted" />{" "}
              Pendiente
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {hasHeatmap && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title="Heatmap adherencia"
            description="Últimos 28 días"
            icon={ClipboardList}
            variant="secondary"
          />
          <div className="mt-4 max-w-[320px]">
            <div className="grid grid-cols-7 gap-1.5">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <span
                  key={d}
                  className="text-center text-[10px] font-semibold text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`ph2-${i}`} className="aspect-square" />
              ))}
              {data.adherence_heatmap.map((cell) => {
                const d = new Date(cell.date);
                const label = !isNaN(d.getTime())
                  ? d.getDate().toString()
                  : String(cell.day_index);
                const title = !isNaN(d.getTime())
                  ? `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}: ${cell.completed ? "Completado" : "Pendiente"}`
                  : `Día ${cell.day_index}: ${cell.completed ? "Completado" : "Pendiente"}`;
                return (
                  <div
                    key={cell.day_index}
                    className={`flex aspect-square items-center justify-center rounded-md border text-[10px] font-medium ${
                      cell.completed
                        ? "border-success/20 bg-success text-white"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                    title={title}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-success" /> Completado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border border-border bg-muted" />{" "}
                Pendiente
              </span>
            </div>
          </div>
        </div>
      )}
      {hasHistorial && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="p-5 pb-0">
            <SectionHeader
              title="Historial semanal"
              description="Detalle por semana con deltas"
              icon={ClipboardList}
              variant="secondary"
            />
          </div>
          <div className="mt-4 overflow-x-auto px-5">
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
                {paginatedHistorial.map((w, i) => (
                  <tr
                    key={(page - 1) * pageSize + i}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3 font-medium">
                      {formatWeekStart(w.week_start)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.imc?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_imc} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.grasa?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <DeltaBadge value={w.delta_grasa} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {w.glucosa?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaBadge value={w.delta_glucosa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PagedListFooter
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[5, 7, 10, 20, 50]}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}

// --- Composite (keeps old contract, without evolution charts) ---

interface BiometriaPerfil360DetailProps {
  patientId: string;
}

export function BiometriaPerfil360Detail({
  patientId,
}: BiometriaPerfil360DetailProps) {
  const { data, loading, error } = useBiometriaPatient(patientId);

  if (loading) return <PerfilSkeleton />;
  if (error)
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-5 text-center">
        <p className="text-sm font-semibold text-destructive">
          Error al cargar biometría
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">
      <BiometriaHeroSections data={data} />
      <BiometriaHistorySections data={data} />
    </div>
  );
}

// --- Sub-components ---

function categoryTone(category: string): string {
  const c = category.trim().toLowerCase();
  if (c.includes("obesidad") || c === "elevada" || c.includes("elevada"))
    return "bg-destructive-soft text-destructive border-destructive/20";
  if (c === "alto")
    return "bg-destructive-soft text-destructive border-destructive/20";
  if (c.includes("sobrepeso") || c.includes("prediabetes"))
    return "bg-warning-soft text-warning-foreground border-warning/20";
  if (c.includes("óptimo") || c.includes("optimo") || c.includes("normal"))
    return "bg-success-soft text-success-foreground border-success/20";
  if (c === "bajo peso")
    return "bg-info-soft text-info-foreground border-info/20";
  if (c === "prediabetes")
    return "bg-warning-soft text-warning-foreground border-warning/20";
  return "bg-muted text-muted-foreground border-border";
}

function ZoneChip({
  label,
  value,
  category,
}: {
  label: string;
  value: string;
  category: string | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {category && (
        <Badge className={`border text-[10px] ${categoryTone(category)}`}>
          {category}
        </Badge>
      )}
    </div>
  );
}

function getGlucosaCategory(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (value < 100) return "Normal";
  if (value < 126) return "Prediabetes";
  return "Elevada";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reservado para uso futuro
function ExactaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- reservado para uso futuro
function ExactaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 last:border-b-0 sm:border-b sm:even:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function MetricStripCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-card p-3">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold ${positive ? "text-destructive" : "text-success"}`}
    >
      {positive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {positive ? "+" : ""}
      {value.toFixed(1)}
    </span>
  );
}

function getGrasaCategory(
  pct: number | null,
  gender: "male" | "female",
): string | null {
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
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
          <Skeleton className="mx-auto h-[320px] w-[120px] rounded-xl lg:mx-0" />
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`z-${i}`} className="h-8 w-24 rounded-lg" />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-36" />
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-none" />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={`m-${i}`} className="h-24 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="h-[140px] w-full rounded" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="mb-4 h-5 w-36" />
          <Skeleton className="h-[140px] w-full rounded" />
        </div>
      </div>
    </div>
  );
}

export { PerfilSkeleton as BiometriaPerfilSkeleton };
