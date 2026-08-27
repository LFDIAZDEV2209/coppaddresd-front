"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Provider as UrqlProvider, useMutation, useQuery, useSubscription } from "urql";
import { communityClient } from "./services/client";
import {
  ADD_COMMENT,
  AWARD_XP,
  AWARD_XP_ALL,
  COMMENT_ADDED_SUB,
  COMMUNITY_ANALYTICS_QUERY,
  COMMUNITY_GROUPS_QUERY,
  CREATE_POST,
  DASHBOARD_STATS_QUERY,
  DIAGNOSTIC_STATS_QUERY,
  FEED_EVENT_ADDED_SUB,
  FEED_EVENTS_QUERY,
  FEED_QUERY,
  ME_QUERY,
  MESSAGE_REACH_QUERY,
  MODERATE_DELETE_POST,
  NETWORKS_QUERY,
  PIN_POST,
  PROFILES_QUERY,
  RECOGNITIONS_QUERY,
  REGION_STATS_QUERY,
  REPLY_TO_COMMENT,
  SEND_BULK_MESSAGE,
  SEND_DIRECT_MESSAGE,
  TOP_STREAKS_QUERY,
  type AddCommentResult,
  type AwardXpAllResult,
  type AwardXpResult,
  type CommentAddedResult,
  type CommentDetail,
  type CommunityAnalyticsResult,
  type CommunityGroupsResult,
  type CommunityGroupWire,
  type CreatePostResult,
  type DashboardStatsResult,
  type DiagnosticStatWire,
  type DiagnosticStatsResult,
  type FeedEvent,
  type FeedEventAddedResult,
  type FeedEventsResult,
  type MeResult,
  type MessageReachResult,
  type MessageReachWire,
  type ModerateDeletePostResult,
  type NetworkChannelWire,
  type NetworksResult,
  type PinPostResult,
  type Post,
  type Profile,
  type ProfilesResult,
  type FeedResult,
  type RecognitionWire,
  type RecognitionsResult,
  type RegionStatWire,
  type RegionStatsResult,
  type ReplyToCommentResult,
  type SendBulkMessageResult,
  type SendDirectMessageResult,
  type TopStreaksResult,
} from "./services/community";
import { useT } from "@/providers/i18n-provider";
import type {
  CommunityAnalyticsData,
  CommunityGroup,
  CommunityMember,
  DiagnosticStat,
  ErpComment,
  ErpPost,
  FeedItem,
  FeedKind,
  Kpi,
  MessageReach,
  NetworkChannel,
  PostType,
  Recognition,
  RegionName,
  RegionStat,
  RiskLevel,
  StreakRank,
} from "./types";

// --- Utilidades de mapeo (backend → frontend) ---

function splitName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] ?? displayName;
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Sin publicaciones";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return `Hace ${d} días`;
}

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/** Normalize HotChocolate uppercase enum wire values (ALTO → Alto, TEXTO → Texto). */
function normalizeEnum(s: string | null | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function mapProfile(p: Profile): CommunityMember {
  const { firstName, lastName } = splitName(p.displayName);
  // Normalizar status del wire ("Active"|"Banned") → ("ACTIVE"|"BANNED")
  const normalizedStatus: "ACTIVE" | "BANNED" =
    p.status.toUpperCase() === "BANNED" ? "BANNED" : "ACTIVE";
  return {
    id: p.id,
    firstName,
    lastName,
    diagnosis: normalizeEnum(p.diagnosis),
    region: normalizeEnum(p.region),
    week: p.week,
    posts: p.postsCount,
    comments: p.commentsCount,
    reactions: p.likesCount,
    xp: p.xpTotal,
    streak: p.currentStreak,
    level: normalizeEnum(p.levelName),
    status: normalizedStatus === "BANNED" ? "Inactivo" : "Activo",
    daysSincePost: daysSince(p.lastPostAt),
    lastPost: relativeTime(p.lastPostAt),
    risk: normalizeEnum(p.riskLevel) as RiskLevel || "Bajo",
    lastPostAt: p.lastPostAt ?? undefined,
    courses: 0,
    shared: false,
    isSystem: p.isSystem,
  };
}

const DEST_LABEL: Record<string, string> = {
  TodasLasComunidades: "Todas las comunidades",
  ComunidadADRED: "Comunidad ADRED",
  RetoCaminata: "Reto caminata 30 días",
  ApoyoEmocional: "Apoyo emocional",
  CocinaSaludable: "Cocina saludable",
  SoloInactivos: "Solo inactivos",
};

function mapComment(c: CommentDetail): ErpComment {
  return {
    id: c.id,
    body: c.body,
    createdAt: relativeTime(c.createdAt),
    postId: c.postId,
    parentCommentId: c.parentCommentId,
    author: c.profile.displayName,
    authorId: c.profile.id,
    isSystem: c.profile.isSystem,
  };
}

function mapPost(post: Post): ErpPost {
  return {
    id: post.id,
    author: post.profile.displayName,
    authorId: post.profile.id,
    type: normalizeEnum(post.type) as PostType,
    destination: DEST_LABEL[normalizeEnum(post.destination)] ?? DEST_LABEL[post.destination] ?? post.destination,
    body: post.body,
    pinned: post.pinned,
    createdAt: relativeTime(post.createdAt),
    reactions: post.likes.length,
    comments: post.comments.length,
    views: post.viewCount,
    isSystem: post.profile.isSystem,
    commentsList: post.comments.map(mapComment),
  };
}

function mapFeedEvent(e: FeedEvent): FeedItem {
  return {
    id: e.id,
    member: e.profile.displayName,
    memberId: e.profileId,
    kind: e.kind.toLowerCase() as FeedKind,
    description: e.body,
    time: relativeTime(e.createdAt),
    xp: undefined,
    isSystem: e.profile.isSystem,
  };
}

function mapStreak(p: Profile): StreakRank {
  return {
    id: p.id,
    member: p.displayName,
    memberId: p.id,
    streak: p.currentStreak,
    goal: p.currentStreak,
    shared: false,
    xp: p.xpTotal,
  };
}

// Convierte el destino "amigable" del composer al enum del backend.
function toDestinationEnum(friendly: string): string {
  const base = friendly
    .replace(/^[^\w\s]*\s*/, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
  const map: Record<string, string> = {
    "Todas las comunidades": "TodasLasComunidades",
    "Comunidad ADRED": "ComunidadADRED",
    "Reto caminata 30 días": "RetoCaminata",
    "Apoyo emocional": "ApoyoEmocional",
    "Cocina saludable": "CocinaSaludable",
    "Solo inactivos": "SoloInactivos",
  };
  return map[base] ?? "TodasLasComunidades";
}

// --- Utilidades de mapeo wire → display (reutilizables) ---

function mapDiagnosis(d: string): string {
  if (d === "DM2HTA") return "DM2+HTA";
  return d;
}

const REGION_LABEL: Record<string, string> = {
  Bogota: "Bogotá",
};

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function deriveGroupType(name: string): "Reto" | "Apoyo" | "Nutrición" | "General" | "Principal" {
  const lower = name.toLowerCase();
  if (lower.includes("reto")) return "Reto";
  if (lower.includes("apoyo")) return "Apoyo";
  if (lower.includes("cocina") || lower.includes("nutri")) return "Nutrición";
  if (lower.includes("comunidad") || lower.includes("adred")) return "Principal";
  return "General";
}

function mapWireGroup(g: CommunityGroupWire): CommunityGroup {
  return {
    id: g.id,
    name: g.name,
    members: g.memberCount,
    posts: g.messageCount,
    type: deriveGroupType(g.name),
    lastActivity: relativeTime(g.lastActivityAt),
  };
}

function mapWireRegion(r: RegionStatWire, totalMembers: number): RegionStat {
  return {
    region: REGION_LABEL[r.region] ?? r.region,
    members: r.members,
    postsPerWeek: r.postsPerWeek,
    percent: totalMembers === 0 ? 0 : Math.round((r.members / totalMembers) * 100),
  };
}

function mapWireDiagnostic(d: DiagnosticStatWire): DiagnosticStat {
  return {
    diagnosis: mapDiagnosis(d.diagnosis),
    members: d.members,
    trend: "",
    barWidth: 0, // computed after all rows are mapped
    postsPerWeek: d.postsPerWeek,
    avgStreak: d.avgStreak,
    avgXp: d.avgXp,
    adherence: d.adherence,
  };
}

function mapWireRecognition(r: RecognitionWire): Recognition {
  return {
    id: r.id,
    member: r.profile.displayName,
    memberId: r.profileId,
    typeLabel: r.typeLabel,
    xp: r.xp,
    status: r.status === "Sent" ? "Enviado" : "Pendiente",
    date: relativeTime(r.createdAt),
  };
}

function mapWireNetwork(n: NetworkChannelWire, idx: number): NetworkChannel {
  return {
    id: `n-${idx}`,
    name: n.name,
    followers: formatFollowers(n.followers),
    color: n.color,
    growth: n.growthPoints
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((gp) => ({ month: gp.month, value: gp.value })),
  };
}

function mapWireMessageReach(m: MessageReachWire): MessageReach {
  return { scope: m.scope, total: m.total, reached: m.reached };
}

// --- Contexto ---

interface ToastItem {
  id: string;
  message: string;
}

interface AwardPayload {
  memberId: string; // "all" para broadcast
  typeLabel: string;
  xp: number;
  message: string;
  publishInFeed: boolean;
}

interface ErpContextValue {
  me: Profile | null;
  members: CommunityMember[];
  posts: ErpPost[];
  feed: FeedItem[];
  communityGroups: CommunityGroup[];
  networks: NetworkChannel[];
  regions: RegionStat[];
  diagnostics: DiagnosticStat[];
  streaks: StreakRank[];
  recognitions: Recognition[];
  inactive: CommunityMember[];
  analytics: CommunityAnalyticsData | null;
  messageReach: MessageReach[];
  membersLoading: boolean;
  membersError: string | undefined;
  refetchMembers: () => void;
  postsLoading: boolean;
  postsError: string | undefined;
  refetchPosts: () => void;
  feedLoading: boolean;
  feedError: string | undefined;
  refetchFeed: () => void;
  streaksLoading: boolean;
  streaksError: string | undefined;
  refetchStreaks: () => void;
  analyticsLoading: boolean;
  analyticsError: string | undefined;
  refetchAnalytics: () => void;
  regionsLoading: boolean;
  regionsError: string | undefined;
  refetchRegions: () => void;
  diagnosticsLoading: boolean;
  diagnosticsError: string | undefined;
  refetchDiagnostics: () => void;
  recognitionsLoading: boolean;
  recognitionsError: string | undefined;
  refetchRecognitions: () => void;
  networksLoading: boolean;
  networksError: string | undefined;
  refetchNetworks: () => void;
  communityGroupsLoading: boolean;
  communityGroupsError: string | undefined;
  refetchCommunityGroups: () => void;
  messageReachLoading: boolean;
  messageReachError: string | undefined;
  refetchMessageReach: () => void;
  dashboardKpis: Kpi[];
  dashboardActivitySeries: { dia: string; posts: number; comentarios: number; reacciones: number }[];
  dashboardPostTypeData: { name: string; value: number }[];
  dashboardPeakHoursData: { hora: string; valor: number }[];
  dashboardDiagnosisParticipation: { subject: string; value: number; fullMark: number }[];
  dashboardInactiveOver7Days: number;
  dashboardInactiveAtRisk: number;
  dashboardLoading: boolean;
  dashboardError: string | undefined;
  refetchDashboard: () => void;
  publishPost: (input: {
    type: PostType;
    destination: string;
    body: string;
    pinned: boolean;
  }) => void;
  togglePin: (id: string) => void;
  deletePost: (id: string) => void;
  awardXp: (payload: AwardPayload) => void;
  sendMessage: (memberId: string, message: string) => void;
  sendBulkInactive: (message: string) => void;
  addComment: (postId: string, body: string) => void;
  replyToComment: (commentId: string, body: string) => void;
  toast: (message: string) => void;
  toasts: ToastItem[];
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({ children }: { children: ReactNode }) {
  // urql necesita su propio Provider con el communityClient.
  return (
    <UrqlProvider value={communityClient}>
      <ErpDataProvider>{children}</ErpDataProvider>
    </UrqlProvider>
  );
}

function ErpDataProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [membersResult, refetchMembers] = useQuery<
    ProfilesResult,
    { take: number; skip: number; search?: string }
  >({
    query: PROFILES_QUERY,
    variables: { take: 50, skip: 0 },
  });

  const [postsResult, refetchPosts] = useQuery<
    FeedResult,
    { take: number; skip: number }
  >({
    query: FEED_QUERY,
    variables: { take: 20, skip: 0 },
  });

  const [feedResult, refetchFeed] = useQuery<
    FeedEventsResult,
    { take: number; skip: number }
  >({
    query: FEED_EVENTS_QUERY,
    variables: { take: 20, skip: 0 },
  });

  // Suscripción en tiempo real para el feed en vivo.
  const [liveFeedEvents, setLiveFeedEvents] = useState<FeedEvent[]>([]);
  const [newFeedIds, setNewFeedIds] = useState<Set<string>>(new Set());
  const [feedSubResult] = useSubscription<FeedEventAddedResult>({
    query: FEED_EVENT_ADDED_SUB,
  });

  // Sincroniza eventos del WS con el estado local (datos externos → estado).
  useEffect(() => {
    const ev = feedSubResult.data?.feedEventAdded;
    if (!ev) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveFeedEvents((prev) => {
      if (prev.some((p) => p.id === ev.id)) return prev;
      return [ev, ...prev].slice(0, 20);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewFeedIds((prev) => {
      const next = new Set(prev);
      next.add(ev.id);
      return next;
    });
    // Quitar el resaltado después de 3s
    setTimeout(() => {
      setNewFeedIds((prev) => {
        const next = new Set(prev);
        next.delete(ev.id);
        return next;
      });
    }, 3000);
  }, [feedSubResult.data]);

  // Suscripción en tiempo real para comentarios (incluye respuestas).
  const [liveComments, setLiveComments] = useState<CommentDetail[]>([]);
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set());
  const [commentSubResult] = useSubscription<CommentAddedResult>({
    query: COMMENT_ADDED_SUB,
  });

  useEffect(() => {
    const c = commentSubResult.data?.commentAdded;
    if (!c) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveComments((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev;
      return [c, ...prev].slice(0, 100);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewCommentIds((prev) => {
      const next = new Set(prev);
      next.add(c.id);
      return next;
    });
    setTimeout(() => {
      setNewCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }, 3000);
  }, [commentSubResult.data]);

  const [streaksResult, refetchStreaks] = useQuery<
    TopStreaksResult,
    { take: number }
  >({
    query: TOP_STREAKS_QUERY,
    variables: { take: 20 },
  });

  const [meResult] = useQuery<MeResult>({
    query: ME_QUERY,
    variables: {},
  });

  const [dashboardResult, refetchDashboard] = useQuery<DashboardStatsResult>({
    query: DASHBOARD_STATS_QUERY,
    variables: {},
  });

  const [analyticsResult, refetchAnalytics] = useQuery<CommunityAnalyticsResult>({
    query: COMMUNITY_ANALYTICS_QUERY,
    variables: {},
  });

  const [regionStatsResult, refetchRegions] = useQuery<RegionStatsResult>({
    query: REGION_STATS_QUERY,
    variables: {},
  });

  const [diagnosticStatsResult, refetchDiagnostics] = useQuery<DiagnosticStatsResult>({
    query: DIAGNOSTIC_STATS_QUERY,
    variables: {},
  });

  const [recognitionsResult, refetchRecognitions] = useQuery<
    RecognitionsResult,
    { take: number; skip: number }
  >({
    query: RECOGNITIONS_QUERY,
    variables: { take: 20, skip: 0 },
  });

  const [networksResult, refetchNetworks] = useQuery<NetworksResult>({
    query: NETWORKS_QUERY,
    variables: {},
  });

  const [communityGroupsResult, refetchCommunityGroups] = useQuery<
    CommunityGroupsResult,
    { take: number; skip: number }
  >({
    query: COMMUNITY_GROUPS_QUERY,
    variables: { take: 50, skip: 0 },
  });

  const [messageReachResult, refetchMessageReach] = useQuery<MessageReachResult>({
    query: MESSAGE_REACH_QUERY,
    variables: {},
  });

  const [, createPostMut] = useMutation<
    CreatePostResult,
    { body: string; type: PostType; destination: string }
  >(CREATE_POST);
  const [, pinPostMut] = useMutation<
    PinPostResult,
    { id: string; pinned: boolean }
  >(PIN_POST);
  const [, deletePostMut] = useMutation<
    ModerateDeletePostResult,
    { id: string }
  >(MODERATE_DELETE_POST);
  const [, awardXpMut] = useMutation<
    AwardXpResult,
    { profileId: string; amount: number; reason?: string }
  >(AWARD_XP);
  const [, awardXpAllMut] = useMutation<
    AwardXpAllResult,
    { amount: number; reason?: string }
  >(AWARD_XP_ALL);

  const [, sendDirectMessageMut] = useMutation<
    SendDirectMessageResult,
    { profileId: string; body: string }
  >(SEND_DIRECT_MESSAGE);
  const [, sendBulkMessageMut] = useMutation<
    SendBulkMessageResult,
    { scope: string; body: string }
  >(SEND_BULK_MESSAGE);

  const [, addCommentMut] = useMutation<AddCommentResult, { postId: string; body: string }>(ADD_COMMENT);
  const [, replyToCommentMut] = useMutation<ReplyToCommentResult, { commentId: string; body: string }>(
    REPLY_TO_COMMENT,
  );

  const members = useMemo(
    () => (membersResult.data?.profiles ?? []).map(mapProfile),
    [membersResult.data],
  );
  const posts = useMemo(() => {
    const base = postsResult.data?.feed ?? [];
    // Mezcla comentarios live por postId, deduplicando, y marca isNew.
    return base.map((p) => {
      const liveForPost = liveComments.filter(
        (c) => c.postId === p.id && !p.comments.some((pc) => pc.id === c.id),
      );
      const mergedComments = [...liveForPost, ...p.comments];
      const mapped = mapPost({ ...p, comments: mergedComments } as Post);
      if (newCommentIds.size > 0) {
        mapped.commentsList = mapped.commentsList.map((cm) =>
          newCommentIds.has(cm.id) ? { ...cm, isNew: true } : cm,
        );
      }
      mapped.comments = mapped.commentsList.length;
      return mapped;
    });
  }, [postsResult.data, liveComments, newCommentIds]);
  const feed = useMemo(() => {
    const base = feedResult.data?.feedEvents ?? [];
    const live = liveFeedEvents;
    // Combinar eventos en vivo al inicio, deduplicando por id, y marcar los nuevos
    const merged: FeedEvent[] = [...live, ...base.filter((b) => !live.some((l) => l.id === b.id))];
    return merged.map((e) => {
      const item = mapFeedEvent(e);
      if (newFeedIds.has(e.id)) item.isNew = true;
      return item;
    });
  }, [feedResult.data, liveFeedEvents, newFeedIds]);
  const streaks = useMemo(
    () => (streaksResult.data?.topStreaks ?? []).map(mapStreak),
    [streaksResult.data],
  );
  const me = meResult.data?.me ?? null;

  // --- Mapeo de datos de analytics (backend → gráficos) ---

  const analytics = useMemo<CommunityAnalyticsData | null>(() => {
    const ca = analyticsResult.data?.communityAnalytics;
    if (!ca) return null;
    return {
      feedToday: ca.feedToday,
      streakOverview: ca.streakOverview,
      inactivityDistribution: ca.inactivityDistribution,
      xpDeliveredSeries: ca.xpDeliveredSeries,
    };
  }, [analyticsResult.data]);

  const regions = useMemo<RegionStat[]>(() => {
    const wire = regionStatsResult.data?.regionStats ?? [];
    const totalMembers = wire.reduce((s, r) => s + r.members, 0);
    return wire.map((r) => mapWireRegion(r, totalMembers));
  }, [regionStatsResult.data]);

  const diagnostics = useMemo<DiagnosticStat[]>(() => {
    const wire = diagnosticStatsResult.data?.diagnosticStats ?? [];
    const mapped = wire.map(mapWireDiagnostic);
    const maxMembers = Math.max(...mapped.map((d) => d.members), 1);
    return mapped.map((d) => ({
      ...d,
      barWidth: Math.round((d.members / maxMembers) * 100),
    }));
  }, [diagnosticStatsResult.data]);

  const recognitions = useMemo<Recognition[]>(() => {
    return (recognitionsResult.data?.recognitions ?? []).map(mapWireRecognition);
  }, [recognitionsResult.data]);

  const networks = useMemo<NetworkChannel[]>(() => {
    return (networksResult.data?.networks ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((n, i) => mapWireNetwork(n, i));
  }, [networksResult.data]);

  const communityGroups = useMemo<CommunityGroup[]>(() => {
    return (communityGroupsResult.data?.communityGroups ?? []).map(mapWireGroup);
  }, [communityGroupsResult.data]);

  const messageReach = useMemo<MessageReach[]>(() => {
    return (messageReachResult.data?.messageReach ?? []).map(mapWireMessageReach);
  }, [messageReachResult.data]);

  // --- Mapeo de datos del dashboard (backend → gráficos) ---

  const ds = dashboardResult.data?.dashboardStats ?? null;

  const dashboardActivitySeries = useMemo(
    () =>
      (ds?.activitySeries ?? []).map((d) => ({
        dia: String(d.dia),
        posts: d.posts,
        comentarios: d.comentarios,
        reacciones: d.reacciones,
      })),
    [ds],
  );

  const dashboardPostTypeData = useMemo(() => {
    const pts = ds?.postTypes ?? [];
    const total = pts.reduce((s, p) => s + p.count, 0);
    return pts.map((p) => ({
      name: p.type,
      value: total === 0 ? 0 : Math.round((p.count / total) * 100),
    }));
  }, [ds]);

  const dashboardPeakHoursData = useMemo(
    () =>
      (ds?.peakHours ?? []).map((h) => ({
        hora: `${h.hora}:00`,
        valor: h.count,
      })),
    [ds],
  );

  const dashboardDiagnosisParticipation = useMemo(() => {
    return (ds?.diagnosisParticipation ?? []).map((dp) => ({
      subject: mapDiagnosis(dp.diagnosis),
      value: Math.round(dp.participation),
      fullMark: 100,
    }));
  }, [ds]);

  const dashboardKpis = useMemo<Kpi[]>(() => {
    if (!ds) return [];
    const fmtNum = (n: number) => n.toLocaleString("es-ES");
    const fmtPct = (n: number) => `${Math.round(n)}%`;
    const trendFor = (delta: number): { value: string; direction: "up" | "down" } | undefined => {
      if (delta === 0) return undefined;
      const abs = Math.abs(delta);
      const rounded = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1).replace(/\.0$/, "");
      return {
        value: delta > 0 ? `+${rounded}%` : `-${rounded}%`,
        direction: delta > 0 ? "up" : "down",
      };
    };
    return [
      {
        label: "Miembros activos",
        value: fmtNum(ds.activeMembers),
        context: "este mes",
        trend: trendFor(ds.kpiTrends.activeMembers),
      },
      {
        label: "Publicaciones",
        value: fmtNum(ds.postsThisMonth),
        context: "este mes",
        trend: trendFor(ds.kpiTrends.postsThisMonth),
      },
      {
        label: "Tasa participación",
        value: fmtPct(ds.participationRate),
        context: "semanal",
        trend: trendFor(ds.kpiTrends.participationRate),
      },
      {
        label: "Inactivos >7d",
        value: fmtNum(ds.inactiveOver7Days),
        context: "requieren acción",
        trend: trendFor(ds.kpiTrends.inactiveOver7Days),
      },
    ];
  }, [ds]);

  const inactive = useMemo(
    () =>
      members.filter((m) => {
        const risk = m.risk ?? "Bajo";
        const stale = daysSince(m.lastPostAt ?? null) > 7;
        return risk === "Alto" || risk === "Medio" || stale;
      }),
    [members],
  );

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const publishPost = useCallback<ErpContextValue["publishPost"]>(
    ({ type, destination, body }) => {
      createPostMut({
        body,
        type,
        destination: toDestinationEnum(destination),
      }).then((res) => {
        if (res.error) {
          toast("No se pudo publicar la publicación");
        } else {
          toast("Publicación creada correctamente");
          refetchPosts();
          refetchFeed();
        }
      });
    },
    [toast, refetchPosts, refetchFeed],
  );

  const togglePin = useCallback<ErpContextValue["togglePin"]>(
    (id) => {
      const current = posts.find((p) => p.id === id);
      pinPostMut({ id, pinned: !current?.pinned }).then((res) => {
        if (res.error) {
          toast("No se pudo actualizar el fijado");
        } else {
          toast("Estado de fijado actualizado");
          refetchPosts();
        }
      });
    },
    [posts, toast, refetchPosts],
  );

  const deletePost = useCallback<ErpContextValue["deletePost"]>(
    (id) => {
      deletePostMut({ id }).then((res) => {
        if (res.error) {
          toast("No se pudo eliminar la publicación");
        } else {
          toast("Publicación eliminada");
          refetchPosts();
        }
      });
    },
    [toast, refetchPosts],
  );

  const awardXp = useCallback<ErpContextValue["awardXp"]>(
    ({ memberId, typeLabel, xp, message }) => {
      const run =
        memberId === "all"
          ? awardXpAllMut({ amount: xp, reason: message || typeLabel })
          : awardXpMut({
              profileId: memberId,
              amount: xp,
              reason: message || typeLabel,
            });
      run.then((res) => {
        if (res.error) {
          toast("No se pudo otorgar el reconocimiento");
        } else {
          toast(
            memberId === "all"
              ? `+${xp} XP enviados a toda la comunidad`
              : `+${xp} XP enviados`,
          );
          refetchMembers();
          refetchStreaks();
        }
      });
    },
    [toast, refetchMembers, refetchStreaks],
  );

  const sendMessage = useCallback<ErpContextValue["sendMessage"]>(
    (memberId, message) => {
      sendDirectMessageMut({ profileId: memberId, body: message }).then((res) => {
        if (res.error) {
          toast(t("No pudimos enviar el mensaje. Intenta de nuevo."));
        } else {
          toast(t("Enviado como Equipo ANTARES"));
        }
      });
    },
    [toast, t],
  );

  const sendBulkInactive = useCallback<ErpContextValue["sendBulkInactive"]>(
    (message) => {
      sendBulkMessageMut({ scope: "INACTIVE", body: message }).then((res) => {
        if (res.error) {
          toast(t("No pudimos enviar el mensaje. Intenta de nuevo."));
        } else {
          const count = res.data?.sendBulkMessage ?? 0;
          toast(t("Mensajes enviados: {n}", { n: String(count) }));
        }
      });
    },
    [toast, t],
  );

  const addComment = useCallback<ErpContextValue["addComment"]>(
    (postId, body) => {
      if (!body.trim()) return;
      addCommentMut({ postId, body: body.trim() }).then((res) => {
        if (res.error) {
          toast(t("No se pudo comentar. Intenta de nuevo."));
        } else {
          const c = res.data?.addComment;
          if (c) {
            // Optimistic merge inmediato + highlight (también llegará por WS).
            setLiveComments((prev) => {
              if (prev.some((p) => p.id === c.id)) return prev;
              return [c as CommentDetail, ...prev].slice(0, 100);
            });
            setNewCommentIds((prev) => {
              const next = new Set(prev);
              next.add(c.id);
              return next;
            });
            setTimeout(() => {
              setNewCommentIds((prev) => {
                const next = new Set(prev);
                next.delete(c.id);
                return next;
              });
            }, 3000);
            toast(t("Comentario publicado"));
          }
        }
      });
    },
    [toast, t],
  );

  const replyToComment = useCallback<ErpContextValue["replyToComment"]>(
    (commentId, body) => {
      if (!body.trim()) return;
      replyToCommentMut({ commentId, body: body.trim() }).then((res) => {
        if (res.error) {
          toast(t("No se pudo responder. Intenta de nuevo."));
        } else {
          const c = res.data?.replyToComment;
          if (c) {
            setLiveComments((prev) => {
              if (prev.some((p) => p.id === c.id)) return prev;
              return [c as CommentDetail, ...prev].slice(0, 100);
            });
            setNewCommentIds((prev) => {
              const next = new Set(prev);
              next.add(c.id);
              return next;
            });
            setTimeout(() => {
              setNewCommentIds((prev) => {
                const next = new Set(prev);
                next.delete(c.id);
                return next;
              });
            }, 3000);
            toast(t("Respuesta publicada"));
          }
        }
      });
    },
    [toast, t],
  );

  const value = useMemo<ErpContextValue>(
    () => ({
      me,
      members,
      posts,
      feed,
      communityGroups,
      networks,
      regions,
      diagnostics,
      streaks,
      recognitions,
      inactive,
      analytics,
      messageReach,
      membersLoading: membersResult.fetching,
      membersError: membersResult.error?.message,
      refetchMembers,
      postsLoading: postsResult.fetching,
      postsError: postsResult.error?.message,
      refetchPosts,
      feedLoading: feedResult.fetching,
      feedError: feedResult.error?.message,
      refetchFeed,
      streaksLoading: streaksResult.fetching,
      streaksError: streaksResult.error?.message,
      refetchStreaks,
      analyticsLoading: analyticsResult.fetching,
      analyticsError: analyticsResult.error?.message,
      refetchAnalytics,
      regionsLoading: regionStatsResult.fetching,
      regionsError: regionStatsResult.error?.message,
      refetchRegions,
      diagnosticsLoading: diagnosticStatsResult.fetching,
      diagnosticsError: diagnosticStatsResult.error?.message,
      refetchDiagnostics,
      recognitionsLoading: recognitionsResult.fetching,
      recognitionsError: recognitionsResult.error?.message,
      refetchRecognitions,
      networksLoading: networksResult.fetching,
      networksError: networksResult.error?.message,
      refetchNetworks,
      communityGroupsLoading: communityGroupsResult.fetching,
      communityGroupsError: communityGroupsResult.error?.message,
      refetchCommunityGroups,
      messageReachLoading: messageReachResult.fetching,
      messageReachError: messageReachResult.error?.message,
      refetchMessageReach,
      dashboardKpis,
      dashboardActivitySeries,
      dashboardPostTypeData,
      dashboardPeakHoursData,
      dashboardDiagnosisParticipation,
      dashboardInactiveOver7Days: ds?.inactiveOver7Days ?? 0,
      dashboardInactiveAtRisk: ds?.inactiveAtRisk ?? 0,
      dashboardLoading: dashboardResult.fetching,
      dashboardError: dashboardResult.error?.message,
      refetchDashboard,
      publishPost,
      togglePin,
      deletePost,
      awardXp,
      sendMessage,
      sendBulkInactive,
      addComment,
      replyToComment,
      toast,
      toasts,
    }),
    [
      me,
      members,
      posts,
      feed,
      communityGroups,
      networks,
      regions,
      diagnostics,
      streaks,
      recognitions,
      inactive,
      analytics,
      messageReach,
      membersResult.fetching,
      membersResult.error,
      refetchMembers,
      postsResult.fetching,
      postsResult.error,
      refetchPosts,
      feedResult.fetching,
      feedResult.error,
      refetchFeed,
      streaksResult.fetching,
      streaksResult.error,
      refetchStreaks,
      analyticsResult.fetching,
      analyticsResult.error,
      refetchAnalytics,
      regionStatsResult.fetching,
      regionStatsResult.error,
      refetchRegions,
      diagnosticStatsResult.fetching,
      diagnosticStatsResult.error,
      refetchDiagnostics,
      recognitionsResult.fetching,
      recognitionsResult.error,
      refetchRecognitions,
      networksResult.fetching,
      networksResult.error,
      refetchNetworks,
      communityGroupsResult.fetching,
      communityGroupsResult.error,
      refetchCommunityGroups,
      messageReachResult.fetching,
      messageReachResult.error,
      refetchMessageReach,
      dashboardKpis,
      dashboardActivitySeries,
      dashboardPostTypeData,
      dashboardPeakHoursData,
      dashboardDiagnosisParticipation,
      ds?.inactiveOver7Days,
      ds?.inactiveAtRisk,
      dashboardResult.fetching,
      dashboardResult.error,
      refetchDashboard,
      publishPost,
      togglePin,
      deletePost,
      awardXp,
      sendMessage,
      sendBulkInactive,
      addComment,
      replyToComment,
      toast,
      toasts,
    ],
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp(): ErpContextValue {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error("useErp debe usarse dentro de ErpProvider");
  return ctx;
}
