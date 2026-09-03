"use client";

import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { Flame, RefreshCw, Snowflake, TrendingUp, Trophy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchEnrollmentSnapshot } from "../../../services/program-enrollments-service";
import type { ProgramEnrollment, ProgramSnapshot } from "../../../types";

// Umbrales de XP por nivel (espejo de XpLevels.cs del backend).
const LEVEL_THRESHOLDS = [
  { name: "Explorador", min: 0, max: 499 },
  { name: "Iniciado", min: 500, max: 1499 },
  { name: "Constante", min: 1500, max: 2999 },
  { name: "Disciplinado", min: 3000, max: 4999 },
  { name: "Transformación", min: 5000, max: 7999 },
  { name: "Bienestar", min: 8000, max: 11999 },
  { name: "Maestro", min: 12000, max: 99999 },
];

type CardColor = "amber" | "orange" | "blue";

const ICON_COLORS: Record<CardColor, string> = {
  amber: "text-amber-500",
  orange: "text-orange-500",
  blue: "text-blue-500",
};

interface Props {
  enrollment: ProgramEnrollment;
}

/**
 * Pestaña Resumen (TASK-11): snapshot de gamificación de la inscripción —
 * XP/nivel, racha, congelamientos, hitos de racha y resumen del día.
 * Consume GET /enrollments/{id}/snapshot vía el service del feature.
 */
export function EnrollmentSummaryTab({ enrollment }: Props) {
  const [snapshot, setSnapshot] = useState<ProgramSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchEnrollmentSnapshot(enrollment.id)
      .then(setSnapshot)
      .catch(() => {
        setSnapshot(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Diferido un tick: evita setState síncrono dentro del efecto (regla
    // react-hooks/set-state-in-effect); load() marca loading=true al arrancar.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollment.id]);

  if (loading) return <SummarySkeleton />;

  if (error || !snapshot) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No se pudo cargar el snapshot del paciente.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  const { xp, streak } = snapshot;
  const level = LEVEL_THRESHOLDS.find(
    (l) => xp.balance >= l.min && xp.balance <= l.max,
  );
  const levelPct = level
    ? Math.min(100, Math.round(((xp.balance - level.min) / (level.max - level.min)) * 100))
    : 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* XP & Nivel */}
      <StatCard icon={Trophy} label="Nivel / XP" color="amber">
        <p className="text-2xl font-bold">{xp.balance.toLocaleString()} XP</p>
        <Badge className="mt-1">{xp.level}</Badge>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${levelPct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {xp.nextLevelAt.toLocaleString()} XP para el siguiente nivel
        </p>
      </StatCard>

      {/* Racha */}
      <StatCard icon={Flame} label="Racha" color="orange">
        <p className="text-2xl font-bold">{streak.current} días</p>
        <p className="text-xs text-muted-foreground">
          Máximo histórico: {streak.longest} días
        </p>
        {snapshot.nextMilestoneDays > 0 && (
          <p className="text-xs text-muted-foreground">
            Próximo hito en {snapshot.nextMilestoneDays} días
          </p>
        )}
        {streak.multiplierActive > 1 && (
          <Badge className="mt-2 bg-amber-100 text-amber-800">
            ×{streak.multiplierActive} activo · {streak.multiplierRemainingHours}h
            restantes
          </Badge>
        )}
      </StatCard>

      {/* Congelamientos */}
      <StatCard icon={Snowflake} label="Congelamientos" color="blue">
        <p className="text-2xl font-bold">{streak.freezesRemaining}</p>
        <p className="text-xs text-muted-foreground">de 3 disponibles</p>
      </StatCard>

      {/* Hitos de racha */}
      {snapshot.streakChests && snapshot.streakChests.length > 0 && (
        <div className="col-span-full rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Zap className="size-4 text-amber-500" />
            Hitos de racha
          </h3>
          <div className="flex flex-wrap gap-3">
            {snapshot.streakChests.map((chest) => (
              <div
                key={chest.days}
                className={`flex min-w-[80px] flex-col items-center rounded-xl border p-3 text-center
                  ${
                    chest.granted
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-dashed border-muted-foreground/40 text-muted-foreground"
                  }`}
              >
                <span className="text-lg font-bold">{chest.days}d</span>
                <span className="text-xs">+{chest.xp} XP</span>
                {chest.granted && (
                  <span className="mt-1 text-[10px] font-medium text-amber-600">
                    ✓ Obtenido
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen del día */}
      <div className="col-span-full rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4 text-primary" />
          Hoy ({snapshot.todayLocalDate})
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <span>
            {snapshot.todayPoints} / {snapshot.todayPointsMax} pts
          </span>
          {snapshot.todayBonusAvailable && (
            <Badge className="bg-emerald-100 text-emerald-800">
              Día perfecto disponible
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tarjeta de métrica con icono y color fijos (clases estáticas para Tailwind). */
function StatCard({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: ElementType;
  label: string;
  color: CardColor;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`size-4 ${ICON_COLORS[color]}`} />
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/** Esqueleto de carga de la pestaña Resumen. */
function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}