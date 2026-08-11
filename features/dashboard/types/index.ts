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
