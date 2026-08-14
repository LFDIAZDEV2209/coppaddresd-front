"use client";

import {
  Bot,
  MessageCircle,
  HeartPulse,
  CalendarDays,
  Microscope,
  ClipboardList,
  Stethoscope,
  BrainCircuit,
  ShieldPlus,
  Salad,
  Dumbbell,
  Pill,
  Syringe,
  Activity,
  Sparkles,
  ShieldCheck,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const AGENT_ICONS: AgentIconOption[] = [
  { key: "MessageCircle", label: "Asistente", icon: MessageCircle, color: "#3B82F6", bg: "#E5F0FA" },
  { key: "Bot", label: "Robot", icon: Bot, color: "#7C3AED", bg: "#F1EBF9" },
  { key: "HeartPulse", label: "Salud", icon: HeartPulse, color: "#EF4444", bg: "#FCEBEC" },
  { key: "CalendarDays", label: "Citas", icon: CalendarDays, color: "#F59E0B", bg: "#FDF2E3" },
  { key: "Stethoscope", label: "Médico", icon: Stethoscope, color: "#0D9488", bg: "#E4F5F4" },
  { key: "BrainCircuit", label: "Cerebro", icon: BrainCircuit, color: "#6366F1", bg: "#ECEBFE" },
  { key: "Microscope", label: "Laboratorio", icon: Microscope, color: "#8B5CF6", bg: "#F1EBF9" },
  { key: "Salad", label: "Nutrición", icon: Salad, color: "#10B981", bg: "#E6F7EF" },
  { key: "Dumbbell", label: "Ejercicio", icon: Dumbbell, color: "#F97316", bg: "#FEF0E7" },
  { key: "Pill", label: "Medicamentos", icon: Pill, color: "#06B6D4", bg: "#E4FAFD" },
  { key: "Syringe", label: "Vacunas", icon: Syringe, color: "#EC4899", bg: "#FCE7F3" },
  { key: "ClipboardList", label: "Seguimiento", icon: ClipboardList, color: "#0EA5E9", bg: "#E6F7FB" },
  { key: "Activity", label: "Actividad", icon: Activity, color: "#22C55E", bg: "#E9F9EF" },
  { key: "Sparkles", label: "IA Creativa", icon: Sparkles, color: "#A855F7", bg: "#F7EEFE" },
  { key: "ShieldCheck", label: "Seguridad", icon: ShieldCheck, color: "#64748B", bg: "#EDF1F5" },
  { key: "ShieldPlus", label: "Protección", icon: ShieldPlus, color: "#475569", bg: "#E8ECF1" },
];

export function getAgentIconOption(key: string | null | undefined): AgentIconOption {
  return AGENT_ICONS.find((option) => option.key === key) ?? AGENT_ICONS[0];
}

export function AgentIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {AGENT_ICONS.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.key)}
            aria-label={option.label}
            aria-pressed={selected}
            title={option.label}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-all",
              selected
                ? "border-primary bg-primary-soft ring-2 ring-primary/30"
                : "border-border hover:border-primary/40 hover:bg-muted",
              disabled && "opacity-50",
            )}
          >
            <span
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: option.bg }}
            >
              <option.icon className="size-4.5" style={{ color: option.color }} />
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground">
              {option.label}
            </span>
            {selected && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-2.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
