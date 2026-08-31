"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Trash2,
  MessageCircle,
  Heart,
  Eye,
  Ban,
  UserX,
  ShieldCheck,
  Search,
  Flag,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { MemberAvatar, profileName } from "./member-avatar";
import { CommunityPagination } from "./community-pagination";
import type { ReportedPostWire, ReportedCommentWire } from "../services/community";

/** Normalize HotChocolate uppercase enum wire values (ALTO → Alto, TEXTO → Texto). */
function normalizeEnum(s: string | null | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Colores de chip por tipo de publicación. */
const TYPE_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  Texto: { bg: "var(--info-soft)", text: "var(--info-foreground)" },
  Imagen: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
  Video: { bg: "var(--primary-soft)", text: "var(--primary)" },
  Encuesta: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  Logro: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
};

/** Carta de un post reportado con sus reportes y acciones. */
function ReportedPostCard({
  rp,
  onDelete,
  onResolve,
  onBan,
  canModerate,
}: {
  rp: ReportedPostWire;
  onDelete: (postId: string) => void;
  onResolve: (reportId: string) => void;
  onBan: (profileId: string, displayName: string, isBanned: boolean) => void;
  canModerate: boolean;
}) {
  const t = useT();
  const { members } = useErp();
  const chipColor = TYPE_CHIP_COLORS[rp.post.type] ?? TYPE_CHIP_COLORS.Texto;
  const member = members.find((m) => m.id === rp.post.profile?.id);
  const isBanned = member?.status === "Inactivo";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md hover:shadow-black/5">
      <div className="flex flex-col gap-3 p-3">
        {/* Cabecera: autor + chips + badge de reportes */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {member ? (
              <MemberAvatar member={member} subtitle={rp.post.createdAt} />
            ) : (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {profileName(rp.post.profile?.displayName ?? "", rp.post.profile?.isSystem, t).slice(0, 2).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {profileName(rp.post.profile?.displayName ?? "", rp.post.profile?.isSystem, t)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{rp.post.createdAt}</span>
                </div>
              </>
            )}
          </div>
          <StatusBadge
            status={`${rp.reportCount} ${t("reportes")}`}
            color={{ bg: "var(--destructive-soft, #fee2e2)", text: "var(--destructive, #ef4444)", dot: "var(--destructive, #ef4444)" }}
          />
        </div>

        {/* Body del post */}
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{rp.post.body}</p>

        {/* Chips de metadata */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: chipColor.bg, color: chipColor.text }}
          >
            {t(rp.post.type)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {rp.post.destination}
          </span>
          {isBanned && (
            <StatusBadge
              status={t("Restringido")}
              color={{ bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }}
            />
          )}
          <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="size-3" /> {rp.post.likes?.length ?? 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {rp.post.comments?.length ?? 0}</span>
            <span className="flex items-center gap-1"><Eye className="size-3" /> {rp.post.viewCount}</span>
          </span>
        </div>

        {/* Lista de reportes */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2">
          <span className="text-[11px] font-semibold text-destructive">{t("Reportes")}:</span>
          {rp.reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-0.5 rounded bg-background/60 px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.reason}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("por")} {profileName(r.reportedBy.displayName, false, t)}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{r.createdAt}</span>
              </div>
              {r.details && (
                <p className="text-[11px] text-muted-foreground">{r.details}</p>
              )}
              <div className="flex justify-end">
                {canModerate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-primary"
                    onClick={() => onResolve(r.id)}
                  >
                    <CheckCircle data-icon="inline-start" className="size-2.5" />
                    {t("Resolver")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Acciones */}
        {canModerate && (
          <div className="flex flex-wrap justify-end gap-2">
            {rp.post.profile?.id && !rp.post.profile?.isSystem && (
              <Button
                size="sm"
                variant={isBanned ? "outline" : "destructive"}
                onClick={() => onBan(rp.post.profile!.id, profileName(rp.post.profile?.displayName ?? "", false, t), isBanned)}
              >
                {isBanned ? <ShieldCheck data-icon="inline-start" className="size-3.5" /> : <Ban data-icon="inline-start" className="size-3.5" />}
                {isBanned ? t("Restaurar acceso") : t("Restringir comunidad")}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(rp.post.id)}
            >
              <Trash2 data-icon="inline-start" className="size-3.5" />
              {t("Eliminar publicación")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Carta de un comentario reportado con sus reportes y acciones. */
function ReportedCommentCard({
  rc,
  onResolve,
  onDeleteComment,
  onBan,
  canModerate,
}: {
  rc: ReportedCommentWire;
  onResolve: (reportId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onBan: (profileId: string, displayName: string, isBanned: boolean) => void;
  canModerate: boolean;
}) {
  const t = useT();
  const { members } = useErp();
  const member = members.find((m) => m.id === rc.comment.profile?.id);
  const isBanned = member?.status === "Inactivo";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md hover:shadow-black/5">
      <div className="flex flex-col gap-3 p-3">
        {/* Cabecera: autor + badge de reportes */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {member ? (
              <MemberAvatar member={member} subtitle={rc.comment.createdAt} />
            ) : (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {profileName(rc.comment.profile?.displayName ?? "", false, t).slice(0, 2).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {profileName(rc.comment.profile?.displayName ?? "", false, t)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{rc.comment.createdAt}</span>
                </div>
              </>
            )}
          </div>
          <StatusBadge
            status={`${rc.reportCount} ${t("reportes")}`}
            color={{ bg: "var(--destructive-soft, #fee2e2)", text: "var(--destructive, #ef4444)", dot: "var(--destructive, #ef4444)" }}
          />
        </div>

        {/* Body del comentario */}
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{rc.comment.body}</p>

        {/* Contexto del post */}
        <div className="rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <span className="font-medium">{t("en publicación")}: </span>
          {rc.post.body?.slice(0, 80)}{rc.post.body && rc.post.body.length > 80 ? "..." : ""}
        </div>

        {/* Lista de reportes */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2">
          <span className="text-[11px] font-semibold text-destructive">{t("Reportes")}:</span>
          {rc.reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-0.5 rounded bg-background/60 px-2 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.reason}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("por")} {profileName(r.reportedBy.displayName, false, t)}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{r.createdAt}</span>
              </div>
              {r.details && (
                <p className="text-[11px] text-muted-foreground">{r.details}</p>
              )}
              <div className="flex justify-end">
                {canModerate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-primary"
                    onClick={() => onResolve(r.id)}
                  >
                    <CheckCircle data-icon="inline-start" className="size-2.5" />
                    {t("Resolver")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Acciones */}
        {canModerate && (
          <div className="flex flex-wrap justify-end gap-2">
            {rc.comment.profile?.id && (
              <Button
                size="sm"
                variant={isBanned ? "outline" : "destructive"}
                onClick={() => onBan(rc.comment.profile!.id, profileName(rc.comment.profile?.displayName ?? "", false, t), isBanned)}
              >
                {isBanned ? <ShieldCheck data-icon="inline-start" className="size-3.5" /> : <Ban data-icon="inline-start" className="size-3.5" />}
                {isBanned ? t("Restaurar acceso") : t("Restringir comunidad")}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDeleteComment(rc.commentId)}
            >
              <Trash2 data-icon="inline-start" className="size-3.5" />
              {t("Eliminar comentario")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ModerationPage() {
  const t = useT();
  const { can } = useAppContext();
  const {
    reportedPosts, reportedPostsLoading, reportedPostsError, refetchReportedPosts, deletePost, resolveReport, banProfile, unbanProfile,
    reportedComments, reportedCommentsLoading, reportedCommentsError, refetchReportedComments, resolveCommentReport, deleteComment,
    searchProfiles, searchProfilesResult, searchProfilesLoading,
  } = useErp();
  const [confirmDeletePost, setConfirmDeletePost] = useState<string | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<string | null>(null);
  const [confirmResolveId, setConfirmResolveId] = useState<string | null>(null);
  const [confirmResolveCommentReportId, setConfirmResolveCommentReportId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [commentPage, setCommentPage] = useState(1);
  const [commentPageSize, setCommentPageSize] = useState(6);
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [memberSearch, setMemberSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canModerate = can("Community.Moderate");

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reportedPosts.slice(start, start + pageSize);
  }, [reportedPosts, page, pageSize]);

  const paginatedComments = useMemo(() => {
    const start = (commentPage - 1) * commentPageSize;
    return reportedComments.slice(start, start + commentPageSize);
  }, [reportedComments, commentPage, commentPageSize]);

  const handleMemberSearch = useCallback((value: string) => {
    setMemberSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      searchProfiles(value || "", 20, 0);
    }, 400);
  }, [searchProfiles]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleDelete = (postId: string) => {
    deletePost(postId);
    setConfirmDeletePost(null);
    setTimeout(() => refetchReportedPosts(), 500);
  };

  const handleResolve = (reportId: string) => {
    resolveReport(reportId);
    setConfirmResolveId(null);
  };

  const handleBan = () => {
    if (!banTarget) return;
    // Si ya está baneado, restauramos
    const member = reportedPosts.find((rp) => rp.post.profile?.id === banTarget.id);
    // No tenemos status aquí fácil, revisamos vía banTarget; el botón decide: si texto es Restaurar ya está baneado → unban
    // Diferenciamos por razón vacía + estado previo: usamos unban si el botón mostrado era Restaurar
    // Para simplificar, si el modal fue abierto desde botón Restringir → ban, si fue Restaurar → unban
    // Detectamos si el miembro está restringido buscando en reportedPosts (no ideal) → mejor comprobar vía reportedPosts no fiable
    // Usamos lógica: si el modal tiene banReason vacío y el nombre es el mismo, asumimos ban; pero para unban no necesitamos razón.
    // Para distinguir, el Ban button ahora abre modal solo para ban; para unban hacemos directo.
    banProfile(banTarget.id, banReason || t("Incumplimiento de normas de la comunidad"));
    setBanTarget(null);
    setBanReason("");
  };

  const handleUnban = (id: string) => {
    unbanProfile(id);
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    setConfirmDeleteComment(null);
    setTimeout(() => refetchReportedComments(), 500);
  };

  const handleResolveCommentReport = (reportId: string) => {
    resolveCommentReport(reportId);
    setConfirmResolveCommentReportId(null);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Moderación")}
        description={t("Publicaciones reportadas por incumplimiento de normas")}
        icon={Shield}
      />

      {/* Header — mismo layout que banner de inactivos, en rojo oscuro */}
      <div className="flex items-center gap-2.5 rounded-xl border border-[#991B1B] bg-destructive-soft px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#991B1B] text-white">
          <AlertTriangle className="size-4" />
        </span>
        <div className="flex flex-col gap-0 min-w-0">
          <p className="text-[13px] font-semibold leading-tight text-[#991B1B]">{t("Reportes activos")}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {`${reportedPosts.length + reportedComments.length} ${t("reportes activos")}`}
          </p>
        </div>
      </div>

      {/* Búsqueda de miembros */}
      {canModerate && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <SectionHeader
            title={t("Buscar miembro")}
            description={t("Buscar miembros para moderar")}
            icon={Search}
            variant="primary"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
                placeholder={t("Buscar por nombre...")}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          {searchProfilesLoading && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}
          {!searchProfilesLoading && memberSearch && searchProfilesResult.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">{t("No se encontraron miembros")}</p>
          )}
          {!searchProfilesLoading && searchProfilesResult.length > 0 && (
            <div className="flex flex-col gap-2">
              {searchProfilesResult.map((p) => {
                const isBanned = p.status?.toUpperCase() === "BANNED";
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {profileName(p.displayName, p.isSystem, t).slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold">{profileName(p.displayName, p.isSystem, t)}</span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {normalizeEnum(p.region)}
                          </span>
                          {isBanned && (
                            <StatusBadge
                              status={t("Restringido")}
                              color={{ bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isBanned ? "outline" : "destructive"}
                      onClick={() => {
                        if (isBanned) {
                          unbanProfile(p.id);
                        } else {
                          setBanTarget({ id: p.id, name: profileName(p.displayName, false, t) });
                        }
                      }}
                    >
                      {isBanned ? <ShieldCheck data-icon="inline-start" className="size-3.5" /> : <Ban data-icon="inline-start" className="size-3.5" />}
                      {isBanned ? t("Restaurar") : t("Restringir")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("posts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "posts"
              ? "bg-primary text-white shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Flag className="mr-1.5 inline size-3.5" />
          {t("Reportes de publicaciones")} ({reportedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "comments"
              ? "bg-primary text-white shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <MessageCircle className="mr-1.5 inline size-3.5" />
          {t("Reportes de comentarios")} ({reportedComments.length})
        </button>
      </div>

      {/* Tab: Reportes de publicaciones */}
      {activeTab === "posts" && (
        <>
          {/* Estado de carga */}
          {reportedPostsLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {/* Estado de error */}
          {reportedPostsError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {t("No se pudieron cargar los reportes. Intenta de nuevo.")}
            </div>
          )}

          {/* Sin reportes */}
          {!reportedPostsLoading && !reportedPostsError && reportedPosts.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
              <CheckCircle className="size-10 text-success" />
              <p className="text-sm text-muted-foreground">{t("Sin reportes de publicaciones")}</p>
              <p className="text-xs text-muted-foreground">{t("No hay publicaciones reportadas pendientes.")}</p>
            </div>
          )}

          {/* Lista de reportes */}
          {!reportedPostsLoading && !reportedPostsError && reportedPosts.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {paginatedPosts.map((rp) => (
                  <ReportedPostCard
                    key={rp.post.id}
                    rp={rp}
                    onDelete={setConfirmDeletePost}
                    onResolve={setConfirmResolveId}
                    onBan={(profileId, name, isBanned) => {
                      if (isBanned) {
                        handleUnban(profileId);
                      } else {
                        setBanTarget({ id: profileId, name });
                      }
                    }}
                    canModerate={canModerate}
                  />
                ))}
              </div>
              <CommunityPagination
                page={page}
                pageSize={pageSize}
                total={reportedPosts.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </>
          )}
        </>
      )}

      {/* Tab: Reportes de comentarios */}
      {activeTab === "comments" && (
        <>
          {/* Estado de carga */}
          {reportedCommentsLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          )}

          {/* Estado de error */}
          {reportedCommentsError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
              {t("No se pudieron cargar los reportes de comentarios. Intenta de nuevo.")}
            </div>
          )}

          {/* Sin reportes */}
          {!reportedCommentsLoading && !reportedCommentsError && reportedComments.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-12 text-center">
              <CheckCircle className="size-10 text-success" />
              <p className="text-sm text-muted-foreground">{t("Sin reportes de comentarios")}</p>
              <p className="text-xs text-muted-foreground">{t("No hay comentarios reportados pendientes.")}</p>
            </div>
          )}

          {/* Lista de reportes de comentarios */}
          {!reportedCommentsLoading && !reportedCommentsError && reportedComments.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {paginatedComments.map((rc) => (
                  <ReportedCommentCard
                    key={rc.commentId}
                    rc={rc}
                    onResolve={setConfirmResolveCommentReportId}
                    onDeleteComment={setConfirmDeleteComment}
                    onBan={(profileId, name, isBanned) => {
                      if (isBanned) {
                        handleUnban(profileId);
                      } else {
                        setBanTarget({ id: profileId, name });
                      }
                    }}
                    canModerate={canModerate}
                  />
                ))}
              </div>
              <CommunityPagination
                page={commentPage}
                pageSize={commentPageSize}
                total={reportedComments.length}
                onPageChange={setCommentPage}
                onPageSizeChange={(size) => { setCommentPageSize(size); setCommentPage(1); }}
              />
            </>
          )}
        </>
      )}

      {/* AlertDialog: Confirmar eliminación de publicación */}
      <AlertDialog open={Boolean(confirmDeletePost)} onOpenChange={(o) => { if (!o) setConfirmDeletePost(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Eliminar publicación")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Estás seguro de que deseas eliminar esta publicación reportada? Esta acción la ocultará de la comunidad y no se podrá deshacer.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeletePost) handleDelete(confirmDeletePost);
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Resolver reporte — confirma que cumple normas */}
      <AlertDialog open={Boolean(confirmResolveId)} onOpenChange={(o) => { if (!o) setConfirmResolveId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Resolver reporte")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Confirmas que este reporte cumple con las normas? Se eliminará el reporte y la publicación permanecerá visible en la comunidad.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmResolveId) handleResolve(confirmResolveId);
              }}
            >
              <CheckCircle data-icon="inline-start" className="size-3.5" />
              {t("Confirmar y resolver")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Restringir acceso a la comunidad (ban) */}
      <Dialog open={Boolean(banTarget)} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="size-4 text-destructive" />
              {t("Restringir acceso a la comunidad")}
            </DialogTitle>
            <DialogDescription>
              {banTarget ? t("Se restringirá el uso de la comunidad para {name}. No podrá publicar ni comentar, pero seguirá teniendo acceso a la plataforma.", { name: banTarget.name }) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t("Motivo (opcional)")}</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t("Ej: Contenido que incumple las normas de la comunidad")}
                rows={3}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("Esta acción solo restringe el acceso a la comunidad. Podrás restaurarlo en cualquier momento.")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBanTarget(null); setBanReason(""); }}>{t("Cancelar")}</Button>
            <Button variant="destructive" onClick={handleBan}>
              <Ban data-icon="inline-start" className="size-3.5" />
              {t("Restringir")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar eliminación de comentario */}
      <AlertDialog open={Boolean(confirmDeleteComment)} onOpenChange={(o) => { if (!o) setConfirmDeleteComment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Eliminar comentario")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Estás seguro de que deseas eliminar este comentario reportado? Esta acción lo ocultará de la comunidad y no se podrá deshacer.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteComment) handleDeleteComment(confirmDeleteComment);
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmar resolver reporte de comentario */}
      <AlertDialog open={Boolean(confirmResolveCommentReportId)} onOpenChange={(o) => { if (!o) setConfirmResolveCommentReportId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Resolver reporte")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("¿Confirmas que este reporte cumple con las normas? Se eliminará el reporte y el comentario permanecerá visible.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmResolveCommentReportId) handleResolveCommentReport(confirmResolveCommentReportId);
              }}
            >
              <CheckCircle data-icon="inline-start" className="size-3.5" />
              {t("Confirmar y resolver")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
