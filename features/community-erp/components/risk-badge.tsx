import { StatusBadge } from "@/components/feedback/status-badge";
import { RISK_ICON } from "../mock-data";
import type { RiskLevel } from "../types";

const COLORS: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  Alto: { bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" },
  Medio: { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning)" },
  Bajo: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <StatusBadge status={`${RISK_ICON[risk]} ${risk}`} color={COLORS[risk]} />;
}
