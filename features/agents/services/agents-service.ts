import type { Agent } from "../types";

export interface PaginatedAgentsResult {
  data: Agent[];
  total: number;
}

const mockAgents: Agent[] = [
  { id: "a1", name: "Asistente de Nutrición", description: "Guía nutricional personalizada para pacientes", type: "Asistente", status: "Activo", usage: 87, conversations: 1240, icon: "🥗", iconColor: "#047857", iconBg: "#E6F7EF" },
  { id: "a2", name: "Asistente de Bienestar", description: "Seguimiento emocional y bienestar mental", type: "Asistente", status: "Activo", usage: 74, conversations: 980, icon: "🧘", iconColor: "#155E75", iconBg: "#E6F7FB" },
  { id: "a3", name: "Asistente General", description: "Consultas generales y orientación clínica", type: "Asistente", status: "Activo", usage: 60, conversations: 750, icon: "💬", iconColor: "#155E75", iconBg: "#E5F0FA" },
  { id: "a4", name: "Asistente de Citas", description: "Gestión y recordatorio de citas médicas", type: "Automatización", status: "Activo", usage: 45, conversations: 620, icon: "📅", iconColor: "#B45309", iconBg: "#FDF2E3" },
  { id: "a5", name: "Asistente de Laboratorio", description: "Interpretación de resultados de laboratorio", type: "Analítico", status: "Inactivo", usage: 32, conversations: 340, icon: "🔬", iconColor: "#155E75", iconBg: "#E6F7FB" },
  { id: "a6", name: "Agente de Seguimiento", description: "Seguimiento post-consulta automatizado", type: "Automatización", status: "Borrador", usage: 15, conversations: 80, icon: "📋", iconColor: "#047857", iconBg: "#E6F7EF" },
];

export async function fetchAgents(): Promise<PaginatedAgentsResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { data: mockAgents, total: mockAgents.length };
}
