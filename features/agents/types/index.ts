export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: "Activo" | "Inactivo" | "Borrador";
  usage: number;
  conversations: number;
  icon: string;
  iconColor: string;
  iconBg: string;
}

export type AgentType = "Asistente" | "Analítico" | "Automatización";
