import { StatusBadge } from "@/components/feedback/status-badge";
import { RISK_ICON } from "../mock-data";
import type { RiskLevel } from "../types";

const COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Alto: { bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" },
  Medio: { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning)" },
  Bajo: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
};

const FALLBACK = COLORS.Bajo;

export function RiskBadge({ risk }: { risk?: RiskLevel | string }) {
  const color = COLORS[risk ?? ""] ?? FALLBACK;
  const icon = RISK_ICON[risk ?? ""] ?? "🟡";
  return <StatusBadge status={`${icon} ${risk ?? "Bajo"}`} color={color} />;
}
