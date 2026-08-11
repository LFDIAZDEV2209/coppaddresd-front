export type AgentType = "Asistente" | "Analítico" | "Automatización";

export type AgentStatus = "Activo" | "Inactivo" | "Borrador";

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  usage: number;
  conversations: number;
  iconKey: string;
}
