import { chartColor } from "@/lib/ui/rainbow";
// --- Chart Tooltip Config ---
export const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
} as const;

// --- Mission Constants ---
// Colores y etiquetas de las 6 misiones del programa, usados en charts y chips.

export const MISSION_COLORS: Record<string, string> = {
  podcast: chartColor("violet"),
  vitals: chartColor("rose"),
  nut: chartColor("green"),
  ejercicio: chartColor("sky"),
  nutraceutico: chartColor("orange"),
  emocional: chartColor("amber"),
};

// --- Clinical Metric Colors ---
export const CLINICAL_COLORS = {
  bmi: chartColor("green"),
  hba1c: chartColor("rose"),
  body_fat: chartColor("orange"),
  glucose: chartColor("teal"),
} as const;

export const MISSION_LABELS: Record<string, string> = {
  podcast: "Podcast",
  vitals: "Vitales",
  nut: "Nutrición",
  ejercicio: "Ejercicio",
  nutraceutico: "Nutracéutico",
  emocional: "Mental",
};

/** Orden canónico de las misiones para charts. */
export const MISSION_ORDER = [
  "podcast",
  "vitals",
  "nut",
  "ejercicio",
  "nutraceutico",
  "emocional",
] as const;

// --- XP Category Constants ---
// El backend expone el enum XpReason como `category` (TaskCompletion, STREAK_7, …).
// Estos mapas traducen a etiquetas en español y colores por familia.

export const XP_CATEGORY_LABELS: Record<string, string> = {
  TaskCompletion: "Misiones",
  DailyBonus: "Bonus diario",
  AdaptationCorrection: "Ajuste de adaptación",
  CLINICAL_IMPROVE: "Clínico · Mejora",
  CLINICAL_SIGNIFICANT: "Clínico · Significativo",
  CLINICAL_STABLE: "Clínico · Estable",
  CLINICAL_WEEKLY_ALL_UP: "Clínico · Semana completa",
  STREAK_7: "Cofre 7 días",
  STREAK_11: "Cofre 11 días",
  STREAK_22: "Cofre 22 días",
  STREAK_50: "Cofre 50 días",
  NUTRITION_MEAL_COMPLETE: "Nutrición · Comidas",
  NUTRITION_HYDRATION: "Nutrición · Hidratación",
  NUTRITION_WEEK_85: "Nutrición · Semana 85%",
  NUTRITION_RECOVERY: "Nutrición · Recuperación",
  NB_STREAK_7: "Racha NB 7 días",
  NB_STREAK_14: "Racha NB 14 días",
  NB_STREAK_30: "Racha NB 30 días",
  NB_STREAK_60: "Racha NB 60 días",
  NB_STREAK_90: "Racha NB 90 días",
  WEAKNESS_ASSESS: "Evaluación de debilidad",
  INTERV_ACCEPT: "Intervención aceptada",
  TELE_SCHEDULE: "Teleconsulta agendada",
  TELE_ATTEND: "Teleconsulta asistida",
  TELE_COMPLY: "Teleconsulta cumplida",
  INTERV_COMPLETE: "Intervención completada",
  RECOVERY_MISSION: "Misión de recuperación",
};

/** Paleta por familia de origen del XP (misión/bonus/cofres/clínico/…). */
export const XP_CATEGORY_COLORS: Record<string, string> = {
  TaskCompletion: chartColor("violet"),
  DailyBonus: chartColor("green"),
  AdaptationCorrection: chartColor("slate"),
  CLINICAL_IMPROVE: chartColor("rose"),
  CLINICAL_SIGNIFICANT: chartColor("rose"),
  CLINICAL_STABLE: chartColor("rose"),
  CLINICAL_WEEKLY_ALL_UP: chartColor("rose"),
  STREAK_7: chartColor("amber"),
  STREAK_11: chartColor("amber"),
  STREAK_22: chartColor("amber"),
  STREAK_50: chartColor("amber"),
  NUTRITION_MEAL_COMPLETE: chartColor("green"),
  NUTRITION_HYDRATION: chartColor("green"),
  NUTRITION_WEEK_85: chartColor("green"),
  NUTRITION_RECOVERY: chartColor("green"),
  NB_STREAK_7: chartColor("orange"),
  NB_STREAK_14: chartColor("orange"),
  NB_STREAK_30: chartColor("orange"),
  NB_STREAK_60: chartColor("orange"),
  NB_STREAK_90: chartColor("orange"),
  WEAKNESS_ASSESS: chartColor("sky"),
  INTERV_ACCEPT: chartColor("sky"),
  TELE_SCHEDULE: chartColor("teal"),
  TELE_ATTEND: chartColor("teal"),
  TELE_COMPLY: chartColor("teal"),
  INTERV_COMPLETE: chartColor("teal"),
  RECOVERY_MISSION: chartColor("sky"),
};

/** Etiqueta amigable para una categoría XP (fallback: código crudo). */
export function xpCategoryLabel(category: string): string {
  return XP_CATEGORY_LABELS[category] ?? category;
}

/** Color de la familia XP (fallback: gris neutro del sistema). */
export function xpCategoryColor(category: string): string {
  return XP_CATEGORY_COLORS[category] ?? chartColor("slate");
}

/** Clase CSS de chip según porcentaje de adherencia (ANTARES mission tiers). */
export function adherenceChipClass(pct: number): string {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold";
  if (pct >= 80)
    return `${base} bg-success-soft text-success-soft-foreground border-success/20`;
  if (pct >= 65)
    return `${base} bg-warning-soft text-warning-soft-foreground border-warning/20`;
  if (pct >= 50)
    return `${base} bg-warning-soft/60 text-warning-soft-foreground border-warning/20`;
  return `${base} bg-destructive-soft text-destructive-soft-foreground border-destructive/20`;
}

/** Iniciales a partir de nombre completo. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Parsea una fecha "YYYY-MM-DD" del backend como fecha LOCAL.
 * `new Date("2026-09-10")` se interpreta como medianoche UTC y en
 * America/Bogota (UTC-5) muestra el día anterior — por eso el heatmap
 * "no mostraba hoy". Usar este helper para etiquetas de día.
 */
export function parseLocalDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(isoDate.trim());
  if (!m) {
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Hoy en hora local como "YYYY-MM-DD" (misma base que el backend). */
export function todayLocalKey(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

/** Tiempo relativo en español (hace X min, hace X h). */
export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
