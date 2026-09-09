import type { LucideIcon } from "lucide-react";

export interface KpiData {
  id: string;
  label: string;
  value: string;
  context: string;
  trend: {
    value: string;
    direction: "up" | "down";
  };
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export interface ActivityDataPoint {
  day: string;
  value: number;
}

export interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AgentUsage {
  name: string;
  usage: number;
  max: number;
}

export interface GrowthDataPoint {
  month: string;
  value: number;
}

export interface ActivityEvent {
  id: string;
  user: string;
  initials: string;
  action: string;
  time: string;
}

// --- DTOs reales del backend (GET /api/v1/dashboard/kpis) ---
// Espejo camelCase del JSON del endpoint; el backend agrega los conteos de
// cada módulo (pacientes, tests de salud, inventario, tareas de programa).

export interface DashboardActivityPoint {
  /** Etiqueta corta lista para mostrar, p. ej. "Sep 4". */
  date: string;
  newPatients: number;
  tests: number;
  entries: number;
  exits: number;
  programTasks: number;
}

export interface DashboardKpis {
  totalPatients: number;
  newPatients30d: number;
  healthTests30d: number;
  inventoryEntries30d: number;
  inventoryExits30d: number;
  programTasks30d: number;
  activitySeries30d: DashboardActivityPoint[];
}
