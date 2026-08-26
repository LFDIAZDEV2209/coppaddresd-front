"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  mockDiagnostics,
  mockFeed,
  mockGroups,
  mockMembers,
  mockNetworks,
  mockPosts,
  mockRecognitions,
  mockRegions,
  mockStreaks,
} from "./mock-data";
import type {
  CommunityMember,
  ErpPost,
  FeedItem,
  PostType,
} from "./types";

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
  members: CommunityMember[];
  posts: ErpPost[];
  feed: FeedItem[];
  groups: typeof mockGroups;
  networks: typeof mockNetworks;
  regions: typeof mockRegions;
  diagnostics: typeof mockDiagnostics;
  streaks: typeof mockStreaks;
  recognitions: typeof mockRecognitions;
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
  const [members, setMembers] = useState<CommunityMember[]>(mockMembers);
  const [posts, setPosts] = useState<ErpPost[]>(mockPosts);
  const [feed] = useState<FeedItem[]>(mockFeed);
  const [recognitions] = useState(mockRecognitions);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const publishPost = useCallback<ErpContextValue["publishPost"]>(
    ({ type, destination, body, pinned }) => {
      const post: ErpPost = {
        id: `p-${Date.now()}`,
        author: "Ángel Isaac R.",
        authorId: "admin",
        type,
        destination,
        body,
        pinned,
        createdAt: "Ahora",
        reactions: 0,
        comments: 0,
        views: 0,
      };
      setPosts((prev) => (pinned ? [post, ...prev] : [...prev, post]));
      toast("Publicación creada correctamente");
    },
    [toast],
  );

  const togglePin = useCallback<ErpContextValue["togglePin"]>(
    (id) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)),
      );
      toast("Estado de fijado actualizado");
    },
    [toast],
  );

  const deletePost = useCallback<ErpContextValue["deletePost"]>(
    (id) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast("Publicación eliminada");
    },
    [toast],
  );

  const awardXp = useCallback<ErpContextValue["awardXp"]>(
    ({ memberId, typeLabel, xp, message, publishInFeed }) => {
      if (memberId === "all") {
        setMembers((prev) =>
          prev.map((m) => ({ ...m, xp: m.xp + xp })),
        );
        toast(`+${xp} XP enviados a toda la comunidad`);
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, xp: m.xp + xp } : m)),
        );
        const target = members.find((m) => m.id === memberId);
        toast(`+${xp} XP enviados a ${target?.firstName ?? "miembro"}`);
      }
      if (publishInFeed) {
        setPosts((prev) => [
          {
            id: `p-${Date.now()}`,
            author: "Ángel Isaac R.",
            authorId: "admin",
            type: "Logro",
            destination: "Todas las comunidades",
            body: message || `Reconocimiento: ${typeLabel}`,
            pinned: false,
            createdAt: "Ahora",
            reactions: 0,
            comments: 0,
            views: 0,
          },
          ...prev,
        ]);
      }
    },
    [members, toast],
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
      const count = members.filter((m) => m.status === "Inactivo").length;
      toast(`Mensaje masivo enviado a ${count} miembros inactivos`);
    },
    [members, toast],
  );

  const value = useMemo<ErpContextValue>(
    () => ({
      members,
      posts,
      feed,
      groups: mockGroups,
      networks: mockNetworks,
      regions: mockRegions,
      diagnostics: mockDiagnostics,
      streaks: mockStreaks,
      recognitions,
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
      members,
      posts,
      feed,
      recognitions,
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
