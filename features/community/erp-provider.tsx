"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Provider as UrqlProvider, useMutation, useQuery } from "urql";
import { communityClient } from "./services/client";
import {
  AWARD_XP,
  AWARD_XP_ALL,
  CREATE_POST,
  FEED_EVENTS_QUERY,
  FEED_QUERY,
  ME_QUERY,
  MODERATE_DELETE_POST,
  PIN_POST,
  PROFILES_QUERY,
  TOP_STREAKS_QUERY,
  type AwardXpAllResult,
  type AwardXpResult,
  type CreatePostResult,
  type FeedEvent,
  type FeedEventsResult,
  type MeResult,
  type ModerateDeletePostResult,
  type PinPostResult,
  type Post,
  type Profile,
  type ProfilesResult,
  type FeedResult,
  type TopStreaksResult,
} from "./services/community";
import {
  mockDiagnostics,
  mockGroups,
  mockNetworks,
  mockRegions,
  mockRecognitions,
} from "./mock-data";
import type {
  CommunityMember,
  ErpPost,
  FeedItem,
  FeedKind,
  PostType,
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

function mapProfile(p: Profile): CommunityMember {
  const { firstName, lastName } = splitName(p.displayName);
  return {
    id: p.id,
    firstName,
    lastName,
    diagnosis: p.diagnosis,
    region: p.region,
    week: p.week,
    posts: p.posts,
    comments: p.comments,
    reactions: p.likes,
    xp: p.xpTotal,
    streak: p.currentStreak,
    level: p.levelName,
    status: p.status === "BANNED" ? "Inactivo" : "Activo",
    daysSincePost: daysSince(p.lastPostAt),
    lastPost: relativeTime(p.lastPostAt),
    risk: p.riskLevel,
    lastPostAt: p.lastPostAt ?? undefined,
    courses: 0,
    shared: false,
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

function mapPost(post: Post): ErpPost {
  return {
    id: post.id,
    author: post.profile.displayName,
    authorId: post.profile.id,
    type: post.type as PostType,
    destination: DEST_LABEL[post.destination] ?? post.destination,
    body: post.body,
    pinned: post.pinned,
    createdAt: relativeTime(post.createdAt),
    reactions: post.likes.length,
    comments: post.comments.length,
    views: post.viewCount,
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
  groups: typeof mockGroups;
  networks: typeof mockNetworks;
  regions: typeof mockRegions;
  diagnostics: typeof mockDiagnostics;
  streaks: StreakRank[];
  recognitions: typeof mockRecognitions;
  inactive: CommunityMember[];
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

  const members = useMemo(
    () => (membersResult.data?.profiles ?? []).map(mapProfile),
    [membersResult.data],
  );
  const posts = useMemo(
    () => (postsResult.data?.feed ?? []).map(mapPost),
    [postsResult.data],
  );
  const feed = useMemo(
    () => (feedResult.data?.feedEvents ?? []).map(mapFeedEvent),
    [feedResult.data],
  );
  const streaks = useMemo(
    () => (streaksResult.data?.topStreaks ?? []).map(mapStreak),
    [streaksResult.data],
  );
  const me = meResult.data?.me ?? null;

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
      const target = members.find((m) => m.id === memberId);
      toast(`Mensaje enviado a ${target?.firstName ?? "miembro"}: ${message}`);
    },
    [members, toast],
  );

  const sendBulkInactive = useCallback<ErpContextValue["sendBulkInactive"]>(
    (message) => {
      toast(`Mensaje masivo enviado a ${inactive.length} miembros inactivos`);
    },
    [inactive, toast],
  );

  const value = useMemo<ErpContextValue>(
    () => ({
      me,
      members,
      posts,
      feed,
      groups: mockGroups,
      networks: mockNetworks,
      regions: mockRegions,
      diagnostics: mockDiagnostics,
      streaks,
      recognitions: mockRecognitions,
      inactive,
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
      publishPost,
      togglePin,
      deletePost,
      awardXp,
      sendMessage,
      sendBulkInactive,
      toast,
      toasts,
    }),
    [
      me,
      members,
      posts,
      feed,
      streaks,
      inactive,
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
      publishPost,
      togglePin,
      deletePost,
      awardXp,
      sendMessage,
      sendBulkInactive,
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
