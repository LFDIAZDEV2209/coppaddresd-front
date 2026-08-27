"use client";

import { useMemo, useState } from "react";
import {
  Send,
  Pin,
  Trash2,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Video,
  BarChart3,
  Trophy,
  Heart,
  MessageCircle,
  Eye,
  X,
  Link2,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { DESTINOS } from "./post-dialog";
import { PostDialog } from "./post-dialog";
import { MemberAvatar, profileName } from "./member-avatar";
import { CommunityPagination } from "./community-pagination";
import { PostDetailDialog } from "./post-detail-dialog";
import type { ErpPost, PostType } from "../types";

const TIPOS: { key: PostType; label: string; icon: typeof FileText }[] = [
  { key: "Texto", label: "Texto", icon: FileText },
  { key: "Imagen", label: "Imagen", icon: ImageIcon },
  { key: "Video", label: "Video", icon: Video },
  { key: "Encuesta", label: "Encuesta", icon: BarChart3 },
  { key: "Logro", label: "Logro", icon: Trophy },
];

const TYPE_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  Texto: { bg: "var(--info-soft)", text: "var(--info-foreground)" },
  Imagen: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
  Video: { bg: "var(--primary-soft)", text: "var(--primary)" },
  Encuesta: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  Logro: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
};

export function PostsPage() {
  const t = useT();
  const { posts, publishPost, togglePin, deletePost, members } = useErp();
  const [type, setType] = useState<PostType>("Texto");
  const [destination, setDestination] = useState(DESTINOS[0]);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [push, setPush] = useState(false);
  const [giveXp, setGiveXp] = useState(false);
  // Campos específicos por tipo (frontend-only, se combinan en body al publicar)
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [logroTitle, setLogroTitle] = useState("");
  // Paginación — Todas las publicaciones
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Dialog de detalle de publicación
  const [detailPost, setDetailPost] = useState<ErpPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const pinnedPosts = posts.filter((p) => p.pinned);

  // Paginación sobre posts no-fijados para que la lista no mezcle; si hay pocos fijados se muestran todos
  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return posts.slice(start, start + pageSize);
  }, [posts, page, pageSize]);

  const buildBody = () => {
    const base = body.trim();
    if (type === "Imagen" && imageUrl.trim()) return `${base}${base ? "\n\n" : ""}🖼️ ${imageUrl.trim()}`;
    if (type === "Video" && videoUrl.trim()) return `${base}${base ? "\n\n" : ""}🎬 ${videoUrl.trim()}`;
    if (type === "Encuesta") {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      const poll = `${pollQuestion.trim() ? `📊 ${pollQuestion.trim()}\n` : ""}${opts.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
      return `${base}${base && poll ? "\n\n" : ""}${poll}`;
    }
    if (type === "Logro" && logroTitle.trim()) return `${base}${base ? "\n\n" : ""}🏆 ${logroTitle.trim()}`;
    return base;
  };

  const canPublish = buildBody().length > 0;

  const handlePublish = () => {
    const finalBody = buildBody();
    if (!finalBody) return;
    publishPost({ type, destination, body: finalBody, pinned });
    setBody("");
    setPinned(false);
    setPush(false);
    setGiveXp(false);
    setImageUrl("");
    setVideoUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setLogroTitle("");
  };

  const openDetail = (post: ErpPost) => {
    setDetailPost(post);
    setDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Publicaciones")}
        description={t("Gestión de publicaciones de ANTARES Comunidad ADRED")}
        icon={Send}
        actions={<PostDialog />}
      />

      {/* Composer - Tarjeta con color distintivo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-strong)] shadow-lg shadow-primary/20">
        <div className="relative flex items-center gap-3 border-b border-white/15 px-4 py-3.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-[15px] font-extrabold text-white ring-1 ring-white/25 shadow-lg shadow-black/10">
            A
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white">{t("Nuevo post")}</span>
            <span className="text-[12px] text-white/70">{t("El mensaje aparecerá en la app de los miembros")}</span>
          </div>
        </div>
        <div className="relative flex flex-col gap-4 p-4">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((tip) => {
              const Icon = tip.icon;
              return (
                <button
                  key={tip.key}
                  onClick={() => setType(tip.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all hover:-translate-y-px ${
                    type === tip.key
                      ? "border-white bg-white text-primary shadow-md shadow-black/10"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t(tip.label)}
                </button>
              );
            })}
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={t("Escribe tu mensaje...")}
            className="border-white/20 bg-white/10 text-sm text-white placeholder:text-white/50 focus-visible:ring-white/40"
          />

          {/* Campos específicos por tipo */}
          {type === "Imagen" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-white/90">{t("URL de la imagen")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/60" />
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-8 border-white/20 bg-white/10 pl-8 text-xs text-white placeholder:text-white/40"
                  />
                </div>
              </div>
              {imageUrl.trim() && (
                <div className="overflow-hidden rounded-lg border border-white/20 bg-black/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl.trim()} alt={t("Vista previa")} className="max-h-48 w-full rounded object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                </div>
              )}
            </div>
          )}
          {type === "Video" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-white/90">{t("URL del video")}</Label>
              <div className="relative">
                <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/60" />
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 border-white/20 bg-white/10 pl-8 text-xs text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}
          {type === "Encuesta" && (
            <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/10 p-3">
              <Label className="text-xs text-white/90">{t("Pregunta de la encuesta")}</Label>
              <Input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder={t("¿Cuál es tu pregunta?")}
                className="h-8 border-white/20 bg-white/10 text-xs text-white placeholder:text-white/40"
              />
              <Label className="text-xs text-white/90">{t("Opciones")}</Label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">{idx + 1}</span>
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`${t("Opción")} ${idx + 1}`}
                    className="h-8 flex-1 border-white/20 bg-white/10 text-xs text-white placeholder:text-white/40"
                  />
                  {pollOptions.length > 2 && (
                    <Button size="icon-sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}>
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <Button size="sm" variant="ghost" className="h-7 self-start text-xs text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setPollOptions([...pollOptions, ""])}>
                  <Plus data-icon="inline-start" className="size-3" />
                  {t("Añadir opción")}
                </Button>
              )}
            </div>
          )}
          {type === "Logro" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-white/90">{t("Título del logro")}</Label>
              <div className="relative">
                <Trophy className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/60" />
                <Input
                  value={logroTitle}
                  onChange={(e) => setLogroTitle(e.target.value)}
                  placeholder={t("Ej: Racha de 30 días completada")}
                  className="h-8 border-white/20 bg-white/10 pl-8 text-xs text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap text-white/80">{t("Destino")}</Label>
              <Select value={destination} onValueChange={(v) => { if (v !== null) setDestination(v); }}>
                <SelectTrigger className="h-8 w-auto min-w-[180px] border-white/20 bg-white/10 text-xs text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINOS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Fijar al tope")}</span>
            </label>
            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={push} onCheckedChange={(c) => setPush(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Push notification")}</span>
            </label>
            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={giveXp} onCheckedChange={(c) => setGiveXp(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Dar XP por comentar")}</span>
            </label>

            <Button size="sm" onClick={handlePublish} disabled={!canPublish} className="ml-auto bg-white text-primary transition-all hover:-translate-y-px active:scale-[0.97] disabled:opacity-50">
              <Send data-icon="inline-start" />
              {t("Publicar")}
            </Button>
          </div>
        </div>
      </div>

      {/* Pinned posts — orden natural: autor arriba, body, meta al pie */}
      {pinnedPosts.length > 0 && (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
          <SectionHeader
            title={t("Publicaciones fijadas")}
            description={`${pinnedPosts.length} ${t("publicaciones fijadas activas")}`}
            icon={Pin}
            variant="primary"
          />
          <div className="flex flex-col gap-3 p-4">
            {pinnedPosts.map((post) => {
              const member = members.find((m) => m.id === post.authorId);
              const chipColor = TYPE_CHIP_COLORS[post.type] ?? TYPE_CHIP_COLORS.Texto;
              return (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-xl border border-border transition-all hover:shadow-md hover:shadow-black/5"
                >
                  <div className="flex flex-col gap-2 p-3">
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
                              <span className="truncate text-sm font-semibold">{profileName(post.author, post.isSystem, t)}</span>
                              <span className="truncate text-xs text-muted-foreground">{post.createdAt}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => togglePin(post.id)} title={t("Desfijar")}>
                          <Pin className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => openDetail(post)} title={t("Ver publicación")}>
                          <MessageCircle className="size-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => deletePost(post.id)} title={t("Eliminar")}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{post.body}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={t("Fijado")}
                        color={{ bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" }}
                      />
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
                        <span className="flex items-center gap-1"><Heart className="size-3" /> {post.reactions}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {post.comments}</span>
                        <span className="flex items-center gap-1"><Eye className="size-3" /> {post.views}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Todas las publicaciones — paginadas, orden natural */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Todas las publicaciones")}
          description={`${posts.length} ${t("publicaciones este mes")}`}
          icon={FileText}
          variant="primary"
        />
        <div className="flex flex-col gap-3 p-4">
          {posts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("Sin publicaciones")}</p>
          ) : (
            paginatedPosts.map((post) => {
              const member = members.find((m) => m.id === post.authorId);
              const chipColor = TYPE_CHIP_COLORS[post.type] ?? TYPE_CHIP_COLORS.Texto;
              return (
                <div
                  key={post.id}
                  className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md hover:shadow-black/5"
                >
                  <div className="flex flex-col gap-2 p-3">
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
                              <span className="truncate text-sm font-semibold">{profileName(post.author, post.isSystem, t)}</span>
                              <span className="truncate text-xs text-muted-foreground">{post.createdAt}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => togglePin(post.id)}
                          title={post.pinned ? t("Desfijar") : t("Fijar")}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pin className="size-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => togglePin(post.id)}>
                              {post.pinned ? t("Desfijar") : t("Fijar")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDetail(post)}>
                              <MessageCircle data-icon="inline-start" className="size-3.5" />
                              {t("Ver publicación")}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => deletePost(post.id)}>
                              {t("Eliminar")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{post.body}</p>
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
                        <span className="flex items-center gap-1"><Heart className="size-3" /> {post.reactions}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {post.comments}</span>
                        <span className="flex items-center gap-1"><Eye className="size-3" /> {post.views}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {posts.length > 0 && (
          <CommunityPagination
            page={page}
            pageSize={pageSize}
            total={posts.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      <PostDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        post={detailPost}
      />
    </div>
  );
}
