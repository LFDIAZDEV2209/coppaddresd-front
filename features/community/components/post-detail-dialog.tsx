"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Send,
  Pin,
  Trash2,
  Heart,
  MessageCircle,
  Eye,
  EyeOff,
  CornerDownRight,
  X,
  Flag,
  BarChart3,
  Check,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/feedback/status-badge";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { MemberAvatar, profileName } from "./member-avatar";
import { MediaLightbox } from "./media-lightbox";
import type { ErpComment, ErpPost } from "../types";
import type { PollWire } from "../types";

/** Bloque de encuesta inline — solo lectura en ERP; muestra opciones, barras, votos. */
function PollBlockInline({
  poll,
  myId,
  canModerate,
}: {
  poll: PollWire;
  myId: string | null;
  canModerate: boolean;
}) {
  const [showVoters, setShowVoters] = useState(false);
  const myVote = poll.options.find((o) => o.votes.some((v) => v.profileId === myId));
  const total = poll.options.reduce((acc, o) => acc + o.votes.length, 0);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <BarChart3 className="size-3" /> Encuesta
      </div>
      {poll.options.map((option) => {
        const votes = option.votes.length;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const mine = myVote?.id === option.id;
        return (
          <div key={option.id} className="relative flex items-center gap-2 overflow-hidden rounded-md border border-border bg-card px-3 py-2">
            <div
              className="absolute inset-y-0 left-0 rounded-l-md transition-all"
              style={{ width: `${pct}%`, backgroundColor: mine ? "var(--primary)" : "var(--primary-soft)" }}
            />
            <span className="relative flex items-center gap-1.5 text-xs font-medium">
              {mine && <Check className="size-3 text-primary" />}
              {option.text}
            </span>
            <span className="relative ml-auto text-[10px] font-bold text-muted-foreground">{pct}%</span>
          </div>
        );
      })}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {total === 0
            ? "Sin votos todavía"
            : `${total} ${total === 1 ? "voto" : "votos"}${myVote ? " · Ya votaste" : ""}`}
        </span>
        {canModerate && total > 0 && (
          <button
            type="button"
            onClick={() => setShowVoters((v) => !v)}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary-soft"
          >
            {showVoters ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            {showVoters ? "Ocultar votantes" : "Ver votantes"}
          </button>
        )}
      </div>
      {/* Votantes expandibles */}
      {showVoters && (
        <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-2">
          {poll.options.map((option) => (
            <div key={option.id} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-muted-foreground">{option.text}</span>
              {option.votes.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/60">Sin votos</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {option.votes.map((v) => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                    >
                      <Users className="size-2.5 text-muted-foreground" />
                      {v.profile?.displayName ?? v.profileId}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Colores de chip por tipo de publicación. */
const TYPE_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  Texto: { bg: "var(--info-soft)", text: "var(--info-foreground)" },
  Imagen: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
  Video: { bg: "var(--primary-soft)", text: "var(--primary)" },
  Encuesta: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  Logro: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
};

/** Razones de reporte disponibles. */
const REPORT_REASONS = [
  "Spam",
  "Contenido inapropiado",
  "Información falsa",
  "Acoso o bullying",
  "Otro",
];

interface PostDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ErpPost | null;
}

export function PostDetailDialog({ open, onOpenChange, post }: PostDetailDialogProps) {
  const t = useT();
  const { can } = useAppContext();
  const canModerate = can("Community.Moderate");
  const {
    members,
    togglePin,
    deletePost,
    viewPost,
    addComment,
    replyToComment,
    deleteComment,
    reportPost,
    me,
  } = useErp();

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ commentId: string; author: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // commentId a eliminar
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [reportDialogComment, setReportDialogComment] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"IMAGE" | "VIDEO" | null>(null);

  const openLightbox = (url: string, mediaType: "IMAGE" | "VIDEO") => {
    setLightboxUrl(url);
    setLightboxType(mediaType);
  };

  /** Registra la vista al abrir el diálogo (fire-and-forget). */
  const postId = post?.id;
  useEffect(() => {
    if (open && postId) viewPost(postId);
  }, [open, postId, viewPost]);

  /** Árbol de comentarios: raíces + respuestas anidadas. */
  const commentTree = useMemo(() => {
    const comments = post?.commentsList ?? [];
    const roots: ErpComment[] = [];
    const childrenMap: Record<string, ErpComment[]> = {};
    for (const c of comments) {
      if (c.parentCommentId) {
        if (!childrenMap[c.parentCommentId]) childrenMap[c.parentCommentId] = [];
        childrenMap[c.parentCommentId].push(c);
      } else {
        roots.push(c);
      }
    }
    return { roots, childrenMap };
  }, [post?.commentsList]);

  if (!post) return null;

  const chipColor = TYPE_CHIP_COLORS[post.type] ?? TYPE_CHIP_COLORS.Texto;
  const member = members.find((m) => m.id === post.authorId);

  const handleSendComment = () => {
    const text = draft.trim();
    if (!text || !post) return;
    if (replyTo) {
      replyToComment(replyTo.commentId, text);
      setReplyTo(null);
    } else {
      addComment(post.id, text);
    }
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleReportSubmit = () => {
    if (!reportReason || !reportDialogComment) return;
    reportPost(reportDialogComment, reportReason, reportDetails || undefined);
    setReportDialogComment(null);
    setReportReason("");
    setReportDetails("");
  };

  /** Renderiza un comentario y sus respuestas recursivamente. */
  const renderComment = (c: ErpComment, depth = 0) => {
    const children = commentTree.childrenMap[c.id] ?? [];
    const isReply = Boolean(c.parentCommentId);
    return (
      <div key={c.id} className="flex flex-col">
        <div
          className={`flex gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
            c.isNew ? "animate-feed-slide bg-primary-soft/40" : "hover:bg-muted/40"
          } ${isReply ? "ml-6 border-l border-border pl-3" : ""}`}
        >
          {isReply && (
            <CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          )}
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
            {profileName(c.author, c.isSystem, t).slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{profileName(c.author, c.isSystem, t)}</span>
              <span className="text-[11px] text-muted-foreground">{c.createdAt}</span>
              {isReply && (
                <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                  {t("Respuesta")}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-xs text-foreground/90">{c.body}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setReplyTo({ commentId: c.id, author: profileName(c.author, c.isSystem, t) })}
              className="shrink-0 self-start rounded px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary-soft"
            >
              {t("Responder")}
            </button>
            {canModerate && (
              <button
                onClick={() => setConfirmDelete(c.id)}
                className="shrink-0 self-start rounded px-1.5 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
                title={t("Eliminar comentario")}
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>
        {children.map((child) => renderComment(child, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Detalle de publicación")}</DialogTitle>
          </DialogHeader>

          {/* Cabecera del post */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {member ? (
                  <MemberAvatar member={member} subtitle={post.createdAt} />
                ) : (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {profileName(post.author, post.isSystem, t).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold">
                        {profileName(post.author, post.isSystem, t)}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{post.createdAt}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {canModerate && (
                  <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => togglePin(post.id, !post.pinned)}
                      title={post.pinned ? t("Desfijar") : t("Fijar")}
                    >
                      <Pin className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setConfirmDeletePost(true)}
                      title={t("Eliminar")}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Body del post */}
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">{post.body}</p>

            {/* Media — thumbnail + lightbox */}
            {post.imageUrl && post.mediaType === "IMAGE" && (
              <button
                type="button"
                onClick={() => openLightbox(post.imageUrl!, "IMAGE")}
                className="group relative w-full cursor-zoom overflow-hidden rounded-lg border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full rounded-lg object-cover transition-transform group-hover:scale-[1.02]"
                  style={{ maxHeight: 160, maxWidth: 280 }}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[0px] text-white transition-all group-hover:bg-black/20 group-hover:text-xs">
                  Ver imagen completa
                </span>
              </button>
            )}
            {post.mediaType === "VIDEO" && post.imageUrl && (
              <button
                type="button"
                onClick={() => openLightbox(post.imageUrl!, "VIDEO")}
                className="group relative w-full cursor-zoom overflow-hidden rounded-lg border border-border"
              >
                <video
                  src={post.imageUrl}
                  muted
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: 160, maxWidth: 280 }}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[0px] text-white transition-all group-hover:bg-black/20 group-hover:text-xs">
                  Ver video completo
                </span>
              </button>
            )}
            {/* Poll rendering */}
            {post.poll && (
              <PollBlockInline poll={post.poll} myId={me?.id ?? null} canModerate={canModerate} />
            )}

            {/* Chips de metadata */}
            <div className="flex flex-wrap items-center gap-1.5">
              {post.pinned && (
                <StatusBadge
                  status={t("Fijado")}
                  color={{ bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" }}
                />
              )}
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: chipColor.bg, color: chipColor.text }}
              >
                {t(post.type)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {post.destination}
              </span>
              <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className="size-3" /> {post.reactions}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3" /> {post.comments}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="size-3" /> {post.views}
                </span>
              </span>
            </div>
          </div>

          {/* Sección de comentarios */}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("Comentarios")} ({post.commentsList?.length ?? 0})
            </span>

            {(post.commentsList?.length ?? 0) === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("Sin comentarios")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {commentTree.roots.map((c) => renderComment(c))}
              </div>
            )}

            {/* Indicador de respuesta */}
            {replyTo && (
              <div className="flex items-center justify-between rounded-lg bg-primary-soft px-2 py-1 text-xs text-primary">
                <span className="flex items-center gap-1">
                  <CornerDownRight className="size-3" />{" "}
                  {t("Respondiendo a {name}", { name: replyTo.author })}
                </span>
                <button onClick={() => setReplyTo(null)} className="rounded p-1 hover:bg-white/50">
                  <X className="size-3" />
                </button>
              </div>
            )}

            {/* Input de comentario */}
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("Escribe un comentario...")}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={handleSendComment}
                disabled={!draft.trim()}
                className="h-8 shrink-0"
              >
                <Send data-icon="inline-start" className="size-3.5" />
                {t("Comentar")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar eliminación de comentario */}
      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Eliminar comentario")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  deleteComment(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmar eliminación de publicación */}
      <AlertDialog open={confirmDeletePost} onOpenChange={setConfirmDeletePost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Eliminar publicación")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deletePost(post.id);
                setConfirmDeletePost(false);
                onOpenChange(false);
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Reportar comentario */}
      <Dialog open={Boolean(reportDialogComment)} onOpenChange={(o) => { if (!o) setReportDialogComment(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Reportar comentario")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("Razón del reporte")}</span>
              <div className="flex flex-wrap gap-1.5">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                      reportReason === r
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t(r)}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              placeholder={t("Detalles adicionales (opcional)")}
              className="text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReportDialogComment(null)}>
                {t("Cancelar")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!reportReason}
                onClick={handleReportSubmit}
              >
                <Flag data-icon="inline-start" className="size-3.5" />
                {t("Enviar reporte")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MediaLightbox
        url={lightboxUrl}
        mediaType={lightboxType}
        open={Boolean(lightboxUrl)}
        onOpenChange={(o) => { if (!o) setLightboxUrl(null); }}
      />
    </>
  );
}
