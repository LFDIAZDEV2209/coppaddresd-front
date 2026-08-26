// Tipos del ERP de comunidad (ANTARES). Datos mock en memoria.
// Convención: comentarios en español, sin valores hardcodeados en componentes.

export type Diagnosis = "DM2" | "Obesidad" | "DM2+HTA" | "Prediabetes";

export type RegionName =
  | "Miami"
  | "NY"
  | "Barranquilla"
  | "Bogotá"
  | "Orlando"
  | "CDMX";

export type MemberLevel =
  | "Bienestar"
  | "Disciplinado"
  | "Constante"
  | "Iniciado"
  | "Explorador";

export type MemberStatus = "Activo" | "Inactivo";

export type RiskLevel = "Alto" | "Medio" | "Bajo";

export interface CommunityMember {
  id: string;
  firstName: string;
  lastName: string;
  diagnosis: Diagnosis;
  region: RegionName;
  week: number; // semana en el programa
  posts: number;
  comments: number;
  reactions: number;
  xp: number;
  streak: number; // racha en días
  level: MemberLevel;
  status: MemberStatus;
  daysSincePost: number; // 0 si está activo
  lastPost: string; // texto relativo, p.ej. "Hace 2 días"
  topRank?: number; // 1, 2, 3
  courses?: number; // cursos completados (📚)
  shared?: boolean; // compartió su racha
}

export type PostType = "Texto" | "Imagen" | "Video" | "Encuesta" | "Logro";

export interface ErpPost {
  id: string;
  author: string;
  authorId: string;
  type: PostType;
  destination: string; // "Todas las comunidades" etc.
  body: string;
  pinned: boolean;
  createdAt: string; // "Hace 2h"
  reactions: number;
  comments: number;
  views: number;
}

export type FeedKind =
  | "foto"
  | "hito"
  | "comentario"
  | "grupo"
  | "nutriobiotico"
  | "publicacion"
  | "racha";

export interface FeedItem {
  id: string;
  member: string;
  memberId: string;
  kind: FeedKind;
  description: string;
  time: string;
  xp?: number;
}

export type GroupType = "Reto" | "Apoyo" | "Nutrición" | "General" | "Principal";

export interface CommunityGroup {
  id: string;
  name: string;
  members: number;
  posts: number;
  type: GroupType;
  lastActivity: string;
}

export interface RecognitionType {
  id: string;
  label: string;
  icon: string; // clave de icono (se mapea en el componente)
  xp: number;
}

export interface Recognition {
  id: string;
  member: string;
  memberId: string;
  typeLabel: string;
  xp: number;
  status: "Enviado" | "Pendiente";
  date: string;
}

export interface NetworkChannel {
  id: string;
  name: string;
  followers: string; // "48.2K"
  color: string;
  growth: { month: string; value: number }[];
}

export interface RegionStat {
  region: RegionName;
  members: number;
  postsPerWeek: number;
  percent: number;
}

export interface DiagnosticStat {
  diagnosis: Diagnosis;
  members: number;
  trend: string; // "+8%"
  barWidth: number; // 0-100 para la barra visual
  postsPerWeek: number;
  avgStreak: number;
  avgXp: number;
  adherence: number; // %
}

export interface StreakRank {
  id: string;
  member: string;
  memberId: string;
  streak: number;
  goal: number;
  shared: boolean;
  xp: number;
}

export interface Kpi {
  label: string;
  value: string;
  context?: string;
  trend?: { value: string; direction: "up" | "down" };
}
