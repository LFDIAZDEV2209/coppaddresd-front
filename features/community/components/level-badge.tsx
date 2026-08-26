import { StatusBadge } from "@/components/feedback/status-badge";
import { LEVEL_ICON } from "../mock-data";
import type { MemberLevel } from "../types";

const COLORS: Record<MemberLevel, { bg: string; text: string; dot: string }> = {
  Bienestar: { bg: "var(--info-soft)", text: "var(--info-foreground)", dot: "var(--info-foreground)" },
  Disciplinado: { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning)" },
  Constante: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
  Iniciado: { bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" },
  Explorador: { bg: "var(--muted)", text: "var(--muted-foreground)", dot: "var(--muted-foreground)" },
};

export function LevelBadge({ level }: { level: MemberLevel }) {
  const color = COLORS[level];
  return (
    <StatusBadge
      status={`${LEVEL_ICON[level]} ${level}`}
      color={color}
    />
  );
}
