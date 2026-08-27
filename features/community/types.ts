// Tipos del ERP de comunidad (ANTARES). Datos mock en memoria.
// Convención: comentarios en español, sin valores hardcodeados en componentes.

// Se amplían a `string` porque el backend devuelve los enums con ligeras
// variaciones de formato (p.ej. "DM2HTA" vs "DM2+HTA", "Bogota" vs "Bogotá").
export type Diagnosis = string;

export type RegionName = string;

export type MemberLevel = string;

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
  risk?: RiskLevel; // nivel de riesgo (derivado del backend)
  lastPostAt?: string; // ISO del último post (para derivar inactividad)
  topRank?: number; // 1, 2, 3
  courses?: number; // cursos completados (📚)
  shared?: boolean; // compartió su racha
  isSystem?: boolean; // perfil del sistema ("Equipo ANTARES")
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
  isSystem?: boolean;
}

// Nota: el backend también emite "video" y "logro" en FeedEventKind; se mapean
// a este union vía cast y se resguardan en la UI con un fallback.
export type FeedKind =
  | "foto"
  | "hito"
  | "comentario"
  | "grupo"
  | "nutriobiotico"
  | "publicacion"
  | "racha"
  | "video"
  | "logro";

export interface FeedItem {
  id: string;
  member: string;
  memberId: string;
  kind: FeedKind;
  description: string;
  time: string;
  xp?: number;
  isSystem?: boolean;
  isNew?: boolean;
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

export interface MessageReach {
  scope: string;
  total: number;
  reached: number;
}

export interface FeedTodayStats {
  posts: number;
  comments: number;
  reactions: number;
  newMembers: number;
  streaksBroken: number;
  xpDelivered: number;
}

export interface StreakOverview {
  longestStreak: number;
  longestProfileId: string;
  longestProfileName: string;
  membersOverSevenDays: number;
  milestonesThisMonth: number;
  streaksBroken: number;
  distribution: { range: string; value: number }[];
}

export interface XpSeriesPoint {
  label: string;
  rachas: number;
  posts: number;
  erp: number;
}

export interface CommunityAnalyticsData {
  feedToday: FeedTodayStats;
  streakOverview: StreakOverview;
  inactivityDistribution: { range: string; value: number }[];
  xpDeliveredSeries: XpSeriesPoint[];
}
