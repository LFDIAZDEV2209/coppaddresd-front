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
  podcast: "#7C3AED",
  vitals: "#E24B4A",
  nut: "#1D9E75",
  ejercicio: "#1B6CA8",
  nutraceutico: "#E87B2B",
  emocional: "#D4AF37",
};

// --- Clinical Metric Colors ---
export const CLINICAL_COLORS = {
  bmi: "#1D9E75",
  hba1c: "#E24B4A",
  body_fat: "#E87B2B",
  glucose: "#0E7490",
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
  TaskCompletion: "#7C3AED",
  DailyBonus: "#10B981",
  AdaptationCorrection: "#64748B",
  CLINICAL_IMPROVE: "#E24B4A",
  CLINICAL_SIGNIFICANT: "#DC2626",
  CLINICAL_STABLE: "#F87171",
  CLINICAL_WEEKLY_ALL_UP: "#B91C1C",
  STREAK_7: "#D4AF37",
  STREAK_11: "#C9A227",
  STREAK_22: "#B8901F",
  STREAK_50: "#9A751A",
  NUTRITION_MEAL_COMPLETE: "#1D9E75",
  NUTRITION_HYDRATION: "#34C99B",
  NUTRITION_WEEK_85: "#14855F",
  NUTRITION_RECOVERY: "#0E6B4E",
  NB_STREAK_7: "#E87B2B",
  NB_STREAK_14: "#D96D1F",
  NB_STREAK_30: "#C55F17",
  NB_STREAK_60: "#A94F10",
  NB_STREAK_90: "#8C410B",
  WEAKNESS_ASSESS: "#1B6CA8",
  INTERV_ACCEPT: "#175786",
  TELE_SCHEDULE: "#0E7490",
  TELE_ATTEND: "#0C637D",
  TELE_COMPLY: "#0A5269",
  INTERV_COMPLETE: "#134556",
  RECOVERY_MISSION: "#123B63",
};

/** Etiqueta amigable para una categoría XP (fallback: código crudo). */
export function xpCategoryLabel(category: string): string {
  return XP_CATEGORY_LABELS[category] ?? category;
}

/** Color de la familia XP (fallback: gris neutro del sistema). */
export function xpCategoryColor(category: string): string {
  return XP_CATEGORY_COLORS[category] ?? "#6B7280";
}

/** Clase CSS de chip según porcentaje de adherencia (ANTARES mission tiers). */
export function adherenceChipClass(pct: number): string {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold";
  if (pct >= 80)
    return `${base} bg-success-soft text-success-foreground border-success/20`;
  if (pct >= 65)
    return `${base} bg-warning-soft text-warning border-warning/20`;
  if (pct >= 50)
    return `${base} bg-warning-soft/60 text-warning/80 border-warning/20`;
  return `${base} bg-destructive-soft text-destructive border-destructive/20`;
}

/** Iniciales a partir de nombre completo. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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
