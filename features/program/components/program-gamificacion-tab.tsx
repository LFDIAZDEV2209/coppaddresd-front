"use client";

import { useMemo } from "react";
import {
  Flame,
  Trophy,
  Snowflake,
  Zap,
  Crown,
  Gift,
  Target,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  Lock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useT } from "@/providers/i18n-provider";
import {
  MISSION_COLORS,
  MISSION_LABELS,
  MISSION_ORDER,
  CHART_TOOLTIP,
  adherenceChipClass,
  parseLocalDate,
  todayLocalKey,
} from "../services/program-erp-constants";
import type { PatientOverviewDto, BiometriaHeatmapDay } from "../types/erp";
import type { ProgramSnapshot } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ProgramGamificacionTabProps {
  overview: PatientOverviewDto | null;
  overviewLoading: boolean;
  snapshot: ProgramSnapshot | null;
  snapshotLoading: boolean;
  snapshotError: string | null;
  onRetrySnapshot: () => void;
  heatmap: BiometriaHeatmapDay[] | null;
  heatmapLoading: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function xpProgress(balance: number, nextAt: number | null): number {
  if (nextAt == null || nextAt <= 0) return 100;
  return Math.min(100, Math.max(0, (balance / nextAt) * 100));
}

function formatXp(n: number): string {
  return n.toLocaleString("es-CO");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function ProgramGamificacionTab({
  overview,
  overviewLoading,
  snapshot,
  snapshotLoading,
  snapshotError,
  onRetrySnapshot,
  heatmap,
  heatmapLoading,
}: ProgramGamificacionTabProps) {
  const t = useT();
  const todayKey = todayLocalKey();

  // Heatmap 28d normalizado: parseo local (new Date("YYYY-MM-DD") es UTC y
  // recorta un día en America/Bogota) + garantiza que hoy esté presente.
  const heatmapCells = useMemo(() => {
    if (!heatmap || heatmap.length === 0) return null;
    const cells = heatmap.map((c) => ({
      ...c,
      local: parseLocalDate(c.date),
    }));
    const lastKey = cells[cells.length - 1].date.slice(0, 10);
    if (lastKey < todayKey) {
      cells.push({
        day_index: cells[cells.length - 1].day_index + 1,
        completed: false,
        date: todayKey,
        local: parseLocalDate(todayKey),
      });
    }
    return cells;
  }, [heatmap, todayKey]);

  // Alineación semanal: columna Lunes-based (0=Lun) de la primera fecha.
  const heatmapOffset = useMemo(() => {
    const first = heatmapCells?.[0]?.local ?? null;
    return first ? (first.getDay() + 6) % 7 : 0;
  }, [heatmapCells]);

  // Check-ins recientes en orden cronológico (máx. 28) para el calendario.
  const recentCheckins = useMemo(() => {
    const list = [...(overview?.daily_checkins ?? [])].sort((a, b) =>
      a.local_date < b.local_date ? -1 : a.local_date > b.local_date ? 1 : 0,
    );
    return list.slice(-28);
  }, [overview]);
  const checkinsOffset = useMemo(() => {
    const first = recentCheckins[0]
      ? parseLocalDate(recentCheckins[0].local_date)
      : null;
    return first ? (first.getDay() + 6) % 7 : 0;
  }, [recentCheckins]);

  if (overviewLoading) {
    return <GamificacionSkeleton />;
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
          <Target className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">{t("Sin datos de gamificación")}</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {t("No se pudo cargar el perfil del paciente.")}
        </p>
      </div>
    );
  }

  const streak = overview.streak;
  // Prefer snapshot streak for multiplier details, fallback to overview
  const snapStreak = snapshot?.streak ?? null;
  const currentStreak = streak?.current_streak ?? snapStreak?.current ?? 0;
  const longestStreak = streak?.longest_streak ?? snapStreak?.longest ?? 0;
  const freezes = streak?.freezes_remaining ?? snapStreak?.freezesRemaining ?? 0;
  const nbCurrent = streak?.nb_current_streak ?? 0;
  const nbLongest = streak?.nb_longest_streak ?? 0;
  const multiplierActive = snapStreak?.multiplierActive ?? 1;
  const multiplierHours = snapStreak?.multiplierRemainingHours ?? 0;

  const hasEnrollment = overview.enrollment != null;

  const balance = overview.xp?.balance ?? snapshot?.xp.balance ?? 0;
  const level = overview.xp?.level ?? snapshot?.xp.level ?? "—";
  const nextLevelAt =
    overview.xp?.next_level_at ?? snapshot?.xp.nextLevelAt ?? null;
  const progress = xpProgress(balance, nextLevelAt);

  // Cofres from snapshot
  const chests = snapshot?.streakChests ?? null;
  const nextMilestoneDays = snapshot?.nextMilestoneDays ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- KPI Row ---------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label={t("Racha actual")}
          value={`${currentStreak} ${currentStreak === 1 ? t("día") : t("días")}`}
          context={
            longestStreak > 0
              ? `${t("Mejor racha")}: ${longestStreak} ${t("días")}`
              : undefined
          }
          icon={Flame}
          variant="warning"
        />
        <StatCard
          label={t("Mejor racha")}
          value={`${longestStreak} ${t("días")}`}
          context={t("Racha más larga registrada")}
          icon={Trophy}
          variant="success"
        />
        <StatCard
          label={t("Congelamientos")}
          value={`${freezes}`}
          context={t("Disponibles para proteger racha")}
          icon={Snowflake}
          variant="info"
        />
        <StatCard
          label={t("Racha NB")}
          value={`${nbCurrent} ${t("días")}`}
          context={`${t("Mejor")}: ${nbLongest} ${t("días")}`}
          icon={Gift}
          variant="primary"
        />
        <StatCard
          label={t("XP total")}
          value={formatXp(balance)}
          context={level !== "—" ? `${t("Nivel")} ${level}` : undefined}
          icon={Zap}
          variant="default"
        />
        <StatCard
          label={t("Nivel")}
          value={level !== "—" ? `${level}` : "—"}
          context={
            nextLevelAt != null
              ? `${formatXp(balance)} / ${formatXp(nextLevelAt)} XP`
              : t("Nivel máximo")
          }
          icon={Crown}
          variant="navy"
        />
      </section>

      {/* Multiplier badge row (if active) */}
      {multiplierActive > 1 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Sparkles className="size-4" />
          </div>
          <span className="font-semibold text-amber-800">
            {t("Multiplicador activo")} ×{multiplierActive}
          </span>
          {multiplierHours > 0 && (
            <span className="text-xs text-amber-700">
              · {t("quedan")} {multiplierHours}h
            </span>
          )}
          <Badge className="ml-auto bg-amber-500 text-white">×{multiplierActive}</Badge>
        </div>
      )}

      {/* Nivel progress */}
      {nextLevelAt != null && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeader
            title={t("Progreso de nivel")}
            description={`${t("Nivel")} ${level} → ${t("siguiente nivel")} · ${formatXp(balance)} / ${formatXp(nextLevelAt)} XP`}
            icon={Crown}
            variant="secondary"
          />
          <div className="mt-4">
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(0)}%</span>
              {nextMilestoneDays != null && (
                <span>
                  {t("Siguiente cofre en")} {nextMilestoneDays} {t("días")}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Adherencia ---------- */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Por misión */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-5 pt-4">
            <SectionHeader
              title={t("Adherencia por misión")}
              description={t("Porcentaje semanal por cada misión")}
              icon={Target}
              variant="secondary"
              className="border-none bg-transparent px-0 py-0"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-5 pt-3">
            {overview.adherencia_semana.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("Sin datos de adherencia.")}
              </p>
            ) : (
              MISSION_ORDER.map((code) => {
                const entry = overview.adherencia_semana.find((a) => a.task_code === code);
                const pct = entry?.pct ?? 0;
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium">
                      {t(MISSION_LABELS[code] ?? code)}
                    </span>
                    <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: MISSION_COLORS[code] ?? "var(--primary)",
                        }}
                      />
                    </div>
                    <span
                      className={adherenceChipClass(pct)}
                      style={{ minWidth: 52, justifyContent: "center" }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })
            )}
            {overview.scores?.health && (
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
                <span className="text-muted-foreground">{t("Índice adherencia")}:</span>
                <span className="font-semibold tabular-nums">
                  {overview.scores.health.score_adherence}/100
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{t("Salud global")}:</span>
                <span className="font-semibold tabular-nums">{overview.scores.health.score}/100</span>
              </div>
            )}
          </div>
        </div>

        {/* Tendencia 12 semanas */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-5 pt-4">
            <SectionHeader
              title={t("Evolución 12 semanas")}
              description={t("Adherencia y XP ganado por semana")}
              icon={TrendingUp}
              variant="secondary"
              className="border-none bg-transparent px-0 py-0"
            />
          </div>
          <div className="h-[280px] p-3 pt-2">
            {overview.evolucion_12_semanas.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("Sin datos de evolución.")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.evolucion_12_semanas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="week_start"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: string) => {
                      const d = parseLocalDate(v);
                      return d
                        ? d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : String(v).slice(5, 10);
                    }}
                  />
                  <YAxis
                    yAxisId="pct"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="xp"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="pct"
                    name={t("Adherencia %")}
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    yAxisId="xp"
                    type="monotone"
                    dataKey="xp"
                    name={t("XP ganado")}
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Cofres + Heatmap ---------- */}
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Cofres de racha (izquierda) */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-5 pt-4">
            <SectionHeader
              title={t("Cofres de racha")}
              description={
                hasEnrollment
                  ? t("Hitos de racha y recompensas por días consecutivos")
                  : t("Sin inscripción activa — los cofres requieren inscripción")
              }
              icon={Gift}
              variant="secondary"
              className="border-none bg-transparent px-0 py-0"
            />
          </div>
          <div className="flex flex-1 flex-col p-5 pt-3">
            {!hasEnrollment ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                  <Gift className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">{t("Sin inscripción activa")}</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {t("Este paciente no tiene inscripción activa al programa.")}
                </p>
              </div>
            ) : snapshotLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : snapshotError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">{snapshotError}</p>
                <Button variant="outline" size="sm" onClick={onRetrySnapshot}>
                  <RefreshCw className="size-3.5" />
                  {t("Reintentar")}
                </Button>
              </div>
            ) : !chests || chests.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">{t("Sin cofres configurados.")}</p>
              </div>
            ) : (
              <>
                <div className="flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-1">
                {chests.map((chest) => {
                  const granted = chest.granted;
                  return (
                    <div
                      key={chest.days}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                        granted ? "border-amber-200 bg-amber-50/60" : "border-border bg-card"
                      }`}
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          granted ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {granted ? (
                          <Gift className="size-5" />
                        ) : (
                          <Lock className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {t("Cofre de {days} días", { days: String(chest.days) })} · +{chest.xp} XP
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {granted && chest.grantedAt
                            ? `${t("Desbloqueado")} · ${new Date(chest.grantedAt).toLocaleDateString("es-CO", { dateStyle: "medium" })}`
                            : t("Bloqueado — continúa tu racha")}
                        </p>
                      </div>
                      <Badge
                        className={
                          granted
                            ? "bg-success-soft text-success-foreground border-success/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {granted ? t("Desbloqueado") : t("Pendiente")}
                      </Badge>
                    </div>
                  );
                })}
                </div>
                {nextMilestoneDays != null && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t("Siguiente hito en")} {nextMilestoneDays} {t("días")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Heatmap adherencia 28 días (derecha) */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-5 pt-4">
          <SectionHeader
            title={t("Heatmap adherencia")}
            description={t("Últimos 28 días")}
            icon={ClipboardList}
            variant="secondary"
            className="border-none bg-transparent px-0 py-0"
          />
        </div>
        <div className="p-5 pt-3">
          {heatmapLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : !heatmapCells ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("Sin datos de adherencia.")}
            </p>
          ) : (
            <>
              <div className="grid max-w-[560px] grid-cols-7 gap-1.5">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <span
                    key={d}
                    className="text-center text-[10px] font-semibold text-muted-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 grid max-w-[560px] grid-cols-7 gap-1.5">
                {Array.from({ length: heatmapOffset }).map((_, i) => (
                  <div key={`ph-${i}`} className="aspect-square" />
                ))}
                {heatmapCells.map((cell) => {
                  const d = cell.local;
                  const isToday = cell.date.slice(0, 10) === todayKey;
                  const label = d ? String(d.getDate()) : String(cell.day_index);
                  const state = cell.completed ? t("Completado") : t("Pendiente");
                  const title = d
                    ? `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}: ${state}${isToday ? ` · ${t("Hoy")}` : ""}`
                    : `Día ${cell.day_index}: ${state}`;
                  return (
                    <div
                      key={cell.day_index}
                      title={title}
                      className={`flex aspect-square items-center justify-center rounded-md border text-[10px] font-medium ${
                        cell.completed
                          ? "border-success/20 bg-success text-white"
                          : "border-border bg-muted text-muted-foreground"
                      } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-success" /> {t("Completado")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm border border-border bg-muted" />{" "}
                  {t("Pendiente")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm border-2 border-primary" /> {t("Hoy")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      </section>

      {/* ---------- Detalle de racha (ancho completo) ---------- */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="px-5 pt-4">
            <SectionHeader
              title={t("Detalle de racha")}
              description={t("Racha actual, mejor racha y estado diario")}
              icon={Flame}
              variant="secondary"
              className="border-none bg-transparent px-0 py-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 pt-3 xl:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Racha actual")}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{currentStreak}</p>
                <p className="text-xs text-muted-foreground">{t("días")}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Racha más larga")}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{longestStreak}</p>
                <p className="text-xs text-muted-foreground">{t("días")}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Racha NB")}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{nbCurrent}</p>
                <p className="text-xs text-muted-foreground">
                  {t("mejor")}: {nbLongest}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Congelamientos")}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1 text-2xl font-bold tabular-nums">
                  <Snowflake className="size-5 text-sky-500" />
                  {freezes}
                </p>
                <p className="text-xs text-muted-foreground">{t("restantes")}</p>
              </div>
            </div>

            {/* Misiones de hoy (compact) */}
            {overview.tareas_hoy.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <p className="text-xs font-semibold">{t("Misiones de hoy")}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {overview.tareas_hoy.map((task) => (
                    <div
                      key={task.task_code}
                      className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card px-1 py-2"
                    >
                      <div
                        className="flex size-7 items-center justify-center rounded-full"
                        style={{
                          background: task.completed
                            ? (MISSION_COLORS[task.task_code] ?? "var(--primary)")
                            : "var(--muted)",
                        }}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="size-3.5 text-white" />
                        ) : (
                          <Lock className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-center text-[10px] font-medium leading-tight">
                        {t(MISSION_LABELS[task.task_code] ?? task.task_code)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            {/* Historial de check-ins — calendario semanal */}
            <div className="min-w-0 rounded-xl border border-border bg-muted/10 p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span className="text-xs font-semibold">{t("Historial de check-ins")}</span>
                <span className="text-xs text-muted-foreground">
                  ({overview.daily_checkins.length} {t("días")})
                </span>
              </div>
              {recentCheckins.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t("Sin check-ins recientes.")}</p>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                      <span
                        key={d}
                        className="text-center text-[9px] font-semibold text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: checkinsOffset }).map((_, i) => (
                      <div key={`ci-${i}`} />
                    ))}
                    {recentCheckins.map((dc) => {
                      const d = parseLocalDate(dc.local_date);
                      const isToday = dc.local_date.slice(0, 10) === todayKey;
                      const dayNum = d ? String(d.getDate()) : "–";
                      const fullDate = d
                        ? d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
                        : dc.local_date.slice(0, 10);
                      const title = `${fullDate} · ${dc.total_points} XP${dc.is_perfect_day ? " · " + t("Día perfecto") : ""}${isToday ? " · " + t("Hoy") : ""}`;
                      return (
                        <div
                          key={dc.local_date}
                          title={title}
                          className={`flex aspect-square flex-col items-center justify-center rounded-lg border leading-none ${
                            dc.is_perfect_day
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : dc.total_points > 0
                                ? "border-success/20 bg-success-soft text-success-foreground"
                                : "border-border bg-muted text-muted-foreground"
                          } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        >
                          <span className="text-[13px] font-bold tabular-nums">{dayNum}</span>
                          <span className="mt-0.5 text-[9px] tabular-nums opacity-80">
                            {dc.total_points}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {overview.daily_checkins.length > 28 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("Mostrando los últimos 28 días")}
                </p>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

function GamificacionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-[420px] rounded-2xl" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}
