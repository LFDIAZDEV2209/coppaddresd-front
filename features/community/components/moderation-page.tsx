"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Pin,
  PinOff,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunity, type FeedPostView } from "../hooks/useCommunity";

const AVATAR_GRADS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

// Filtros del feed. Los valores vacíos se envían como undefined para no
// aplicar ese filtro en el servidor.
type FeedFilters = {
  author?: string;
  search?: string;
  from?: string;
  to?: string;
};

const EMPTY_FILTERS: FeedFilters = {
  author: undefined,
  search: undefined,
  from: undefined,
  to: undefined,
};

export function ModerationPage() {
  // Estado de los inputs del formulario de filtros.
  const [filters, setFilters] = useState<FeedFilters>({
    author: "",
    search: "",
    from: "",
    to: "",
  });
  // Estado de los filtros que realmente se enviaron al query.
  const [applied, setApplied] = useState<FeedFilters>(EMPTY_FILTERS);

  const {
    feed,
    feedLoading,
    feedError,
    pinPost,
    deletePost,
    refetchFeed,
  } = useCommunity({ feedVariables: applied });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedPostView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyFilters = () => {
    setApplied({
      author: filters.author?.trim() || undefined,
      search: filters.search?.trim() || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    });
  };

  const clearFilters = () => {
    setFilters({ author: "", search: "", from: "", to: "" });
    setApplied(EMPTY_FILTERS);
  };

  const handlePin = async (view: FeedPostView) => {
    setBusyId(view.post.id);
    setError(null);
    try {
      await pinPost(view.post.id, !view.post.pinned);
    } catch {
      setError("No pudimos actualizar la publicación. Intenta de nuevo.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.post.id);
    setError(null);
    try {
      await deletePost(target.post.id);
    } catch {
      setError("No pudimos eliminar la publicación. Intenta de nuevo.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Moderación de contenido"
        description="Gestiona las publicaciones de la comunidad"
        icon={ShieldCheck}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            disabled={feedLoading}
            onClick={() => refetchFeed({ requestPolicy: "network-only" })}
          >
            <RefreshCw
              data-icon="inline-start"
              className={feedLoading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        }
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Filtros del feed</h2>
          <p className="text-xs text-muted-foreground">
            Filtra las publicaciones por autor, contenido o rango de fechas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] lg:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-author"
              className="text-xs font-medium text-muted-foreground"
            >
              Autor
            </label>
            <Input
              id="filter-author"
              value={filters.author ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, author: event.target.value }))
              }
              placeholder="Buscar por usuario…"
              aria-label="Filtrar por autor"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-search"
              className="text-xs font-medium text-muted-foreground"
            >
              Contenido
            </label>
            <Input
              id="filter-search"
              value={filters.search ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Buscar por palabra…"
              aria-label="Filtrar por contenido"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-from"
              className="text-xs font-medium text-muted-foreground"
            >
              Desde
            </label>
            <Input
              id="filter-from"
              type="date"
              value={filters.from ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              aria-label="Filtrar desde la fecha"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filter-to"
              className="text-xs font-medium text-muted-foreground"
            >
              Hasta
            </label>
            <Input
              id="filter-to"
              type="date"
              value={filters.to ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              aria-label="Filtrar hasta la fecha"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" onClick={applyFilters}>
              Aplicar
            </Button>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {feedLoading ? (
        <FeedSkeleton />
      ) : feedError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft p-10 text-center text-sm text-destructive">
          No pudimos cargar el feed de la comunidad.
        </div>
      ) : feed.length ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${feed.length} publicaciones recientes`}
            description="Últimas publicaciones del feed"
            icon={ShieldCheck}
            variant="primary"
          />
          <div className="divide-y divide-border">
            {feed.map((view) => {
              const { post } = view;
              return (
                <div
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  key={post.id}
                >
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${avatarGrad(post.profile.id)}`}
                    >
                      {initials(post.profile.displayName)}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {post.profile.displayName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(post.createdAt)}
                        </span>
                        {post.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-[2px] text-[11px] font-semibold text-primary">
                            <Pin className="size-3" />
                            Fijada
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
                        {post.body}
                      </p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3.5" />
                          {view.likeCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="size-3.5" />
                          {view.commentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === post.id}
                      onClick={() => handlePin(view)}
                    >
                      {post.pinned ? (
                        <PinOff data-icon="inline-start" />
                      ) : (
                        <Pin data-icon="inline-start" />
                      )}
                      {post.pinned ? "Desfijar" : "Fijar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busyId === post.id}
                      onClick={() => setDeleteTarget(view)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          Todavía no hay publicaciones en la comunidad.
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar publicación</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `La publicación de ${deleteTarget.post.profile.displayName} dejará de ser visible para la comunidad.`
                : "Eliminar publicación."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              size="default"
              disabled={busyId === deleteTarget?.post.id}
              onClick={confirmDelete}
            >
              <Trash2 data-icon="inline-start" />
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4].map((item) => (
        <div className="flex gap-4 border-b border-border py-4 last:border-0" key={item}>
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

function avatarGrad(id: string): string {
  return AVATAR_GRADS[id.charCodeAt(0) % AVATAR_GRADS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}