import type { Agent } from "../types";
import {
  Salad,
  HeartPulse,
  MessageCircle,
  CalendarDays,
  Microscope,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface PaginatedAgentsResult {
  data: Agent[];
  total: number;
}

interface AgentIcon {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const agentIcons: Record<string, AgentIcon> = {
  "Asistente de Nutrición": { icon: Salad, color: "#10B981", bg: "#E6F7EF" },
  "Asistente de Bienestar": { icon: HeartPulse, color: "#EF4444", bg: "#FCEBEC" },
  "Asistente General": { icon: MessageCircle, color: "#3B82F6", bg: "#E5F0FA" },
  "Asistente de Citas": { icon: CalendarDays, color: "#F59E0B", bg: "#FDF2E3" },
  "Asistente de Laboratorio": { icon: Microscope, color: "#8B5CF6", bg: "#F1EBF9" },
  "Agente de Seguimiento": { icon: ClipboardList, color: "#0EA5E9", bg: "#E6F7FB" },
};

const mockAgents: Agent[] = [
  { id: "a1", name: "Asistente de Nutrición", description: "Guía nutricional personalizada para pacientes", type: "Asistente", status: "Activo", usage: 87, conversations: 1240, iconKey: "Asistente de Nutrición" },
  { id: "a2", name: "Asistente de Bienestar", description: "Seguimiento emocional y bienestar mental", type: "Asistente", status: "Activo", usage: 74, conversations: 980, iconKey: "Asistente de Bienestar" },
  { id: "a3", name: "Asistente General", description: "Consultas generales y orientación clínica", type: "Asistente", status: "Activo", usage: 60, conversations: 750, iconKey: "Asistente General" },
  { id: "a4", name: "Asistente de Citas", description: "Gestión y recordatorio de citas médicas", type: "Automatización", status: "Activo", usage: 45, conversations: 620, iconKey: "Asistente de Citas" },
  { id: "a5", name: "Asistente de Laboratorio", description: "Interpretación de resultados de laboratorio", type: "Analítico", status: "Inactivo", usage: 32, conversations: 340, iconKey: "Asistente de Laboratorio" },
  { id: "a6", name: "Agente de Seguimiento", description: "Seguimiento post-consulta automatizado", type: "Automatización", status: "Borrador", usage: 15, conversations: 80, iconKey: "Agente de Seguimiento" },
];

export async function fetchAgents(): Promise<PaginatedAgentsResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { data: mockAgents, total: mockAgents.length };
}

export function getAgentIcon(name: string): AgentIcon {
  return agentIcons[name] ?? { icon: MessageCircle, color: "#3B82F6", bg: "#E5F0FA" };
}
