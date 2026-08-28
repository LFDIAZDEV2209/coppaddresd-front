"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
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
import { MemberAvatar, profileName } from "./member-avatar";
import { CommunityPagination } from "./community-pagination";
import type { ReportedPostWire } from "../services/community";

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
}: {
  rp: ReportedPostWire;
  onDelete: (postId: string) => void;
  onResolve: (reportId: string) => void;
  onBan: (profileId: string, displayName: string, isBanned: boolean) => void;
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] text-primary"
                  onClick={() => onResolve(r.id)}
                >
                  <CheckCircle data-icon="inline-start" className="size-2.5" />
                  {t("Resolver")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones */}
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
      </div>
    </div>
  );
}

export function ModerationPage() {
  const t = useT();
  const { reportedPosts, reportedPostsLoading, reportedPostsError, refetchReportedPosts, deletePost, resolveReport, banProfile, unbanProfile } = useErp();
  const [confirmDeletePost, setConfirmDeletePost] = useState<string | null>(null);
  const [confirmResolveId, setConfirmResolveId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const paginatedPosts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reportedPosts.slice(start, start + pageSize);
  }, [reportedPosts, page, pageSize]);

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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Moderación")}
        description={t("Publicaciones reportadas por incumplimiento de normas")}
        icon={Shield}
      />

      <SectionHeader
        title={t("Reportes activos")}
        description={`${reportedPosts.length} ${t("publicaciones reportadas")}`}
        icon={AlertTriangle}
        variant="destructive"
      />

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
          <p className="text-sm text-muted-foreground">{t("Sin reportes")}</p>
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
    </div>
  );
}
