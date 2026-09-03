"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pin,
  Sparkles,
  CalendarClock,
  FileText,
  Trash2,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/feedback/status-badge";
import { SectionHeader } from "@/components/layout/section-header";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/providers/i18n-provider";
import type { ClubPost } from "../types";
import {
  deleteClubPost,
  fetchAllClubPosts,
  publishScheduledPost,
  updateClubPost,
} from "../mock/clubs-api";
import {
  POST_VISIBILITY_COLORS,
  formatRelative,
  initials,
} from "./clubs-helpers";
import { ClubPostEditorDialog } from "./club-post-editor";

export function ClubPostsTab({
  clubId,
  canManage,
}: {
  clubId: string;
  canManage: boolean;
}) {
  const t = useT();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = async () => {
    setPosts(await fetchAllClubPosts(clubId));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const togglePin = async (post: ClubPost) => {
    await updateClubPost(post.id, { pinned: !post.pinned });
    await load();
  };

  const toggleFeatured = async (post: ClubPost) => {
    await updateClubPost(post.id, { featured: !post.featured });
    await load();
  };

  const publishNow = async (post: ClubPost) => {
    await publishScheduledPost(post.id);
    await load();
  };

  const remove = async (post: ClubPost) => {
    await deleteClubPost(post.id);
    await load();
  };

  const published = posts.filter((p) => p.status === "PUBLICADO");
  const scheduled = posts.filter((p) => p.status === "PROGRAMADO");
  const drafts = posts.filter((p) => p.status === "BORRADOR");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Publicaciones")}
        description={`${published.length} ${t("publicadas")} · ${scheduled.length} ${t("programadas")} · ${drafts.length} ${t("borradores")}`}
        icon={FileText}
        variant="primary"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setEditorOpen(true)}>
              <Plus data-icon="inline-start" />
              {t("Nueva publicación")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          {t("Cargando publicaciones…")}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {scheduled.length > 0 && (
            <div className="flex flex-col">
              <SectionHead
                icon={CalendarClock}
                tone="warning"
                title={t("Programadas")}
                count={scheduled.length}
                label={t("programadas")}
              />
              <div className="flex flex-col divide-y divide-border">
                {scheduled.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    canManage={canManage}
                    actions={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => publishNow(post)}
                      >
                        <Clock3 data-icon="inline-start" />
                        {t("Publicar ahora")}
                      </Button>
                    }
                    onPin={togglePin}
                    onFeatured={toggleFeatured}
                    onDelete={remove}
                  />
                ))}
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="flex flex-col">
              <SectionHead
                icon={FileText}
                tone="muted"
                title={t("Borradores")}
                count={drafts.length}
                label={t("borradores")}
              />
              <div className="flex flex-col divide-y divide-border">
                {drafts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    canManage={canManage}
                    onPin={togglePin}
                    onFeatured={toggleFeatured}
                    onDelete={remove}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <SectionHead
              icon={Sparkles}
              tone="primary"
              title={t("Publicadas")}
              count={published.length}
              label={t("publicadas")}
            />
            <div className="flex flex-col divide-y divide-border">
              {published.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  canManage={canManage}
                  onPin={togglePin}
                  onFeatured={toggleFeatured}
                  onDelete={remove}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <ClubPostEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        clubId={clubId}
        onSaved={() => {
          setEditorOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function PostRow({
  post,
  canManage,
  actions,
  onPin,
  onFeatured,
  onDelete,
}: {
  post: ClubPost;
  canManage: boolean;
  actions?: React.ReactNode;
  onPin: (post: ClubPost) => void;
  onFeatured: (post: ClubPost) => void;
  onDelete: (post: ClubPost) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            {initials(post.author.displayName)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold">
              {post.author.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelative(post.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge
            status={t(
              post.type === "ANUNCIO"
                ? "Anuncio"
                : post.type === "ENCUESTA"
                  ? "Encuesta"
                  : post.type === "VIDEO"
                    ? "Video"
                    : post.type === "IMAGEN"
                      ? "Imagen"
                      : "Texto",
            )}
            color={{
              bg: "var(--muted)",
              text: "var(--muted-foreground)",
              dot: "var(--muted-foreground)",
            }}
          />
          <StatusBadge
            status={t(post.visibility === "PUBLICO" ? "Pública" : "Privada")}
            color={POST_VISIBILITY_COLORS[post.visibility]}
          />
          {post.pinned && <Pin className="size-3.5 text-primary" />}
          {post.featured && <Sparkles className="size-3.5 text-warning" />}
        </div>
      </div>
      <p className="text-sm text-foreground/90">{post.body}</p>
      {post.poll && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-3">
          <span className="text-xs font-semibold">{post.poll.question}</span>
          <div className="flex flex-col gap-1">
            {post.poll.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between text-xs"
              >
                <span>{option.text}</span>
                <span className="font-semibold text-muted-foreground">
                  {option.votes.length} {t("votos")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          {post.likes.length} {t("reacciones")}
        </span>
        <span>·</span>
        <span>
          {post.comments.length} {t("comentarios")}
        </span>
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
            <Switch checked={post.pinned} onCheckedChange={() => onPin(post)} />
            {t("Fijada")}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
            <Switch
              checked={post.featured}
              onCheckedChange={() => onFeatured(post)}
            />
            {t("Destacada")}
          </label>
          {actions}
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-destructive"
            title={t("Eliminar")}
            onClick={() => onDelete(post)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Cabecera de sección continua (patrón del tab Miembros): icono en caja
 *  de color + título + contador. */
function SectionHead({
  icon: Icon,
  tone,
  title,
  count,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "muted";
  title: string;
  count: number;
  label: string;
}) {
  const tones = {
    primary: {
      bg: "bg-primary-soft text-primary",
      chip: "bg-primary text-white",
    },
    warning: {
      bg: "bg-warning-soft text-warning-foreground",
      chip: "bg-warning text-white",
    },
    muted: {
      bg: "bg-muted text-muted-foreground",
      chip: "bg-muted-foreground text-white",
    },
  } as const;
  return (
    <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-muted/40 to-transparent px-5 py-3">
      <span
        className={`flex size-9 items-center justify-center rounded-xl ${tones[tone].bg}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <h3 className="text-sm font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span
        className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone].chip}`}
      >
        {count}
      </span>
    </div>
  );
}
