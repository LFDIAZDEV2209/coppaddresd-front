// --- Program ERP Types ---
// Tipos que reflejan los DTOs del backend (snake_case JSON).

// ===================== Dashboard =====================

export interface ErpDashboardKpis {
  adherence_global_hoy: number;
  xp_semana: number;
  pacientes_racha_gt7: number;
  en_riesgo: number;
  total_active: number;
  // --- Clinical emphasis ---
  bmi_promedio: number | null;
  hba1c_promedio: number | null;
  body_fat_promedio: number | null;
  pacientes_bmi_ge30: number | null;
  pacientes_hba1c_ge7: number | null;
  pacientes_body_fat_alto: number | null;
}

export interface ErpMissionAdherence {
  task_code: string;
  completed: number;
  total: number;
  pct: number;
}

export interface ErpStreakBucket {
  label: string;
  count: number;
}

export interface ErpXpByCategory {
  category: string;
  total: number;
}

export interface ErpDailyAdherence {
  date: string; // DateOnly → ISO string
  pct: number;
}

export interface ErpLeaderboardEntry {
  rank: number;
  patient_id: string;
  patient_name: string;
  enrollment_id: string;
  xp: number;
  adherence: number;
  current_streak: number;
}

export interface ErpPatientTrend {
  patient_id: string;
  patient_name: string;
  enrollment_id: string;
  delta_pct: number;
  current_pct: number;
  previous_pct: number;
}

export interface ProgramErpDashboardDto {
  kpis: ErpDashboardKpis;
  adherencia_por_mision_hoy: ErpMissionAdherence[];
  distribucion_rachas: ErpStreakBucket[];
  xp_por_categoria: ErpXpByCategory[];
  evolucion_30d: ErpDailyAdherence[];
  mejoraron: ErpPatientTrend[];
  empeoraron: ErpPatientTrend[];
  top5: ErpLeaderboardEntry[];
  // --- Optional fields (new in gamificacion-phase) ---
  distribucion_semanas?: { label: string; count: number }[];
  evolucion_xp_30d?: { date: string; value: number }[];
  evolucion_clinica_30d?: {
    date: string;
    bmi_avg: number | null;
    hba1c_avg: number | null;
    body_fat_avg: number | null;
  }[];
}

// ===================== Today =====================

export interface ErpTodayMissionKpi {
  task_code: string;
  completed: number;
  total: number;
  pct: number;
}

export interface ErpTodayFeedEntry {
  id: string;
  patient_id: string;
  patient_name: string;
  task_code: string;
  points_awarded: number;
  completed_at: string; // DateTime ISO
}

export interface ErpCriticalPending {
  patient_id: string;
  patient_name: string;
  enrollment_id: string;
  current_week: number;
  pending_tasks: number;
}

export interface ErpHeatmapCell {
  task_code: string;
  day_index: number; // 1-7
  pct: number;
}

export interface ProgramErpTodayDto {
  mission_kpis: ErpTodayMissionKpi[];
  feed: ErpTodayFeedEntry[];
  pendientes_criticos: ErpCriticalPending[];
  heatmap_semana: ErpHeatmapCell[];
}

// ===================== Adherencia =====================

export interface ErpWeeklyMissionPct {
  week_start: string; // DateOnly → ISO string
  task_code: string;
  pct: number;
}

export interface ErpStreakRankingEntry {
  rank: number;
  patient_id: string;
  patient_name: string;
  enrollment_id: string;
  current_streak: number;
  longest_streak: number;
}

export interface ErpAdherenciaRow {
  patient_id: string;
  patient_name: string;
  enrollment_id: string;
  current_week: number;
  current_streak: number;
  longest_streak: number;
  global_pct: number;
  podcast_pct: number;
  vitals_pct: number;
  nut_pct: number;
  ejercicio_pct: number;
  nutraceutico_pct: number;
  emocional_pct: number;
  xp: number;
  trend: string;
}

export interface PaginatedErpAdherenciaTabla {
  data: ErpAdherenciaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProgramErpAdherenciaDto {
  tendencia_8_semanas: ErpWeeklyMissionPct[];
  ranking_rachas: ErpStreakRankingEntry[];
  tabla: PaginatedErpAdherenciaTabla;
}

// ===================== Cofres =====================

export interface ErpMilestoneCounts {
  streak_7: number;
  streak_11: number;
  streak_22: number;
  streak_50: number;
  nb_streak_7: number;
  nb_streak_11: number;
  nb_streak_22: number;
  nb_streak_50: number;
}

export interface ErpCofresHitos {
  streak_7: boolean;
  streak_11: boolean;
  streak_22: boolean;
  streak_50: boolean;
}

export interface ErpCofresPatientRow {
  patient_id: string;
  patient_name: string;
  current_streak: number;
  total_xp: number;
  level: string;
  next_milestone_days: number;
  hitos: ErpCofresHitos;
  pending_clinical_count: number;
  nb_current_streak: number;
}

export interface ProgramErpCofresDto {
  xp_por_categoria: ErpXpByCategory[];
  milestones: ErpMilestoneCounts;
  tabla: ErpCofresPatientRow[];
  // --- Optional fields ---
  proximos_a_desbloquear?: number;
}

// ===================== Biometría =====================

export interface BiometriaImcBucket {
  label: string;
  count: number;
}

export interface BiometriaGrBodyFatBucket {
  label: string;
  count: number;
}

export interface BiometriaGrasaDistribution {
  male: BiometriaGrBodyFatBucket[];
  female: BiometriaGrBodyFatBucket[];
}

export interface BiometriaGlucosaBucket {
  label: string;
  count: number;
}

export interface BiometriaWeeklyPoint {
  week_start: string; // DateOnly → ISO string
  avg_imc: number | null;
  avg_grasa: number | null;
  avg_glucosa: number | null;
}

export interface BiometriaCityPoint {
  city_id: string | null;
  name: string;
  state_abbr: string | null;
  count: number;
  avg_imc: number | null;
  map_x: number | null;
  map_y: number | null;
}

export interface BiometriaAlert {
  patient_id: string;
  name: string;
  reason: string;
  imc: number | null;
  glucosa: number | null;
  icc: number | null;
}

export interface BiometriaCommunityDto {
  avg_imc: number | null;
  avg_grasa: number | null;
  avg_glucosa: number | null;
  improving_count: number;
  imc_distribution: BiometriaImcBucket[];
  grasa_distribution: BiometriaGrasaDistribution;
  glucosa_distribution: BiometriaGlucosaBucket[];
  evolution_weekly: BiometriaWeeklyPoint[];
  cities: BiometriaCityPoint[];
  alerts: BiometriaAlert[];
}

// --- Biometría Patient List ---

export interface BiometriaPatientListItem {
  patient_id: string;
  name: string;
  gender: string | null;
  age: number | null;
  city: string | null;
  weight: number | null;
  height: number | null;
  imc: number | null;
  imc_category: string | null;
  waist: number | null;
  hip: number | null;
  icc: number | null;
  pct_grasa: number | null;
  pct_grasa_category: string | null;
  glucosa: number | null;
  glucosa_category: string | null;
  week_number: number | null;
  streak: number;
  trend: string | null;
}

export interface BiometriaWeeklyBiometria {
  week_start: string;
  imc: number | null;
  grasa: number | null;
  glucosa: number | null;
  weight: number | null;
  height: number | null;
  waist: number | null;
  hip: number | null;
  icc: number | null;
  delta_imc: number | null;
  delta_grasa: number | null;
  delta_glucosa: number | null;
}

export interface BiometriaHeatmapDay {
  day_index: number;
  completed: boolean;
  date: string;
}

export interface BiometriaExacta {
  weight: number | null;
  height: number | null;
  waist: number | null;
  hip: number | null;
  wrist: number | null;
  icc: number | null;
  pct_grasa: number | null;
  pct_magra: number | null;
}

export interface BiometriaPatientDetail {
  patient_id: string;
  name: string;
  gender: string | null;
  age: number | null;
  imc: number | null;
  imc_category: string | null;
  trend: string | null;
  historial_semanal: BiometriaWeeklyBiometria[];
  adherence_heatmap: BiometriaHeatmapDay[];
  biometria_exacta: BiometriaExacta | null;
}

export interface PaginatedBiometriaPatients {
  data: BiometriaPatientListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===================== Patient Overview (360) =====================

export interface PatientOverviewEnrollment {
  enrollment_id: string;
  template_id: string;
  template_name: string | null;
  status: string;
  timezone: string;
  started_at: string;
  current_week: number;
  total_weeks: number;
}

export interface PatientOverviewStreak {
  current_streak: number;
  longest_streak: number;
  freezes_remaining: number;
  nb_current_streak: number;
  nb_longest_streak: number;
}

export interface PatientOverviewXp {
  balance: number;
  level: string;
  next_level_at: number | null;
}

export interface PatientOverviewTaskHoy {
  task_code: string;
  completed: boolean;
  points: number;
}

export interface PatientOverviewMissionAdherence {
  task_code: string;
  pct: number;
}

export interface PatientOverviewWeeklyEvo {
  week_start: string;
  pct: number;
  xp: number;
}

export interface PatientOverviewHealthScore {
  score: number;
  score_adherence: number;
  score_clinical: number;
  score_nutrition: number;
  score_psychology: number;
  score_exercise: number;
  trend: string;
}

export interface PatientOverviewTransformationDetail {
  baseline: number;
  current: number;
  unit: string;
  delta: number;
  delta_pct: number;
  favorable: boolean;
  score: number;
}

export interface PatientOverviewTransformationScore {
  score: number;
  week_number: number;
  overall_trend: string;
  previous?: number | null;
  detail?: Record<string, PatientOverviewTransformationDetail>;
}

export interface PatientOverviewScores {
  health: PatientOverviewHealthScore | null;
  transformation: PatientOverviewTransformationScore | null;
}

export interface ErpWeaknessSummary {
  id: string;
  code: string;
  title: string;
  severity: string;
  status: string;
  detected_at: string;
}

export interface ErpInterventionSummary {
  id: string;
  type: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
}

export interface ErpClinicalReviewSummary {
  id: string;
  rule_code: string;
  metric_id: string;
  delta_pct: number | null;
  created_at: string;
}

export interface ErpDailyCheckinSummary {
  local_date: string;
  total_points: number;
  bonus_awarded: number;
  is_perfect_day: boolean;
  mood_score: number | null;
}

export interface PatientOverviewClinicalMetricSnapshot {
  latest_value: number | null;
  unit: string | null;
  observed_at: string | null; // DateTime ISO
  baseline_value: number | null;
  delta_pct: number | null;
  series_12w: { date: string; value: number }[];
}

export interface PatientOverviewClinicalMetricsDto {
  bmi: PatientOverviewClinicalMetricSnapshot | null;
  hba1c: PatientOverviewClinicalMetricSnapshot | null;
  body_fat: PatientOverviewClinicalMetricSnapshot | null;
  glucose: PatientOverviewClinicalMetricSnapshot | null;
}

export interface PatientOverviewDto {
  patient_name: string | null;
  enrollment: PatientOverviewEnrollment | null;
  streak: PatientOverviewStreak | null;
  xp: PatientOverviewXp | null;
  tareas_hoy: PatientOverviewTaskHoy[];
  adherencia_semana: PatientOverviewMissionAdherence[];
  evolucion_12_semanas: PatientOverviewWeeklyEvo[];
  scores: PatientOverviewScores | null;
  mediciones_clinicas: PatientOverviewClinicalMetricsDto | null;
  weaknesses: ErpWeaknessSummary[];
  interventions: ErpInterventionSummary[];
  pending_adaptations: number;
  clinical_reviews: ErpClinicalReviewSummary[];
  daily_checkins: ErpDailyCheckinSummary[];
}
