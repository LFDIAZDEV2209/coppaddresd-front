"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search, UserCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCommunity } from "../hooks/useCommunity";
import type { CommunityProfile } from "../services/community";
import { useT } from "@/providers/i18n-provider";

const AVATAR_GRADS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

type StatusFilter = "Todos" | "Activos" | "Baneados";

export function MembersPage() {
  const t = useT();
  const {
    profiles,
    profilesLoading,
    profilesError,
    refetchProfiles,
    banProfile,
    unbanProfile,
  } = useCommunity();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<CommunityProfile | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" && profile.status === "ACTIVE") ||
        (statusFilter === "Baneados" && profile.status === "BANNED");
      const matchesSearch =
        !term || profile.displayName.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [profiles, search, statusFilter]);

  const openBanDialog = (profile: CommunityProfile) => {
    setBanTarget(profile);
    setBanReason("");
    setBanError(null);
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    const target = banTarget;
    setBusyId(target.id);
    setBanError(null);
    try {
      await banProfile(target.id, banReason.trim() || undefined);
      setBanTarget(null);
      setBanReason("");
    } catch {
      setBanError(t('No pudimos banear al miembro. Intenta de nuevo.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUnban = async (profile: CommunityProfile) => {
    setBusyId(profile.id);
    try {
      await unbanProfile(profile.id);
    } catch {
      // El error se refleja al reintentar; el estado de carga se limpia abajo.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('Miembros')}
        description={t('Administra los miembros de la comunidad y su estado')}
        icon={UserCheck}
      />

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as StatusFilter)
          }
          aria-label={t('Filtrar por estado')}
        >
          <option value="Todos">{t('Todos')}</option>
          <option value="Activos">{t('Activos')}</option>
          <option value="Baneados">{t('Baneados')}</option>
        </select>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Buscar por nombre...')}
              aria-label={t('Buscar miembros')}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={profilesLoading}
            onClick={() => refetchProfiles({ requestPolicy: "network-only" })}
          >
            <RefreshCw
              data-icon="inline-start"
              className={profilesLoading ? "animate-spin" : undefined}
            />
            {t('Actualizar')}
          </Button>
        </div>
      </section>

      {profilesLoading ? (
        <MembersSkeleton />
      ) : profilesError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft p-10 text-center text-sm text-destructive">
          {t('No pudimos cargar los miembros.')}
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchProfiles({ requestPolicy: "network-only" })}
            >
              {t('Reintentar')}
            </Button>
          </div>
        </div>
      ) : visible.length ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t('{count} miembros', { count: String(visible.length) })}
            description={t('Miembros registrados en la comunidad')}
            icon={Users}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Miembro')}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t('Miembro desde')}
                </TableHead>
                <TableHead>{t('Estado')}</TableHead>
                <TableHead className="w-40 text-right">
                  <span className="sr-only">{t('Acciones')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${avatarGrad(profile.id)}`}
                      >
                        {initials(profile.displayName)}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold">
                          {profile.displayName}
                        </span>
                        {profile.status === "BANNED" && profile.banReason ? (
                          <span className="truncate text-xs text-destructive">
                            {profile.banReason}
                          </span>
                        ) : (
                          <span className="truncate text-xs text-muted-foreground">
                            {profile.bio || t('Sin bio')}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">
                      {formatDate(profile.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {profile.status === "ACTIVE" ? (
                      <StatusBadge
                        status={t('Activo')}
                        color={{
                          bg: "var(--success-soft)",
                          text: "var(--success-foreground)",
                          dot: "var(--success-foreground)",
                        }}
                      />
                    ) : (
                      <StatusBadge
                        status={t('Baneado')}
                        color={{
                          bg: "var(--destructive-soft)",
                          text: "var(--destructive)",
                          dot: "var(--destructive)",
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      {profile.status === "ACTIVE" ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyId === profile.id}
                          onClick={() => openBanDialog(profile)}
                        >
                          {t('Banear')}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === profile.id}
                          onClick={() => handleUnban(profile)}
                        >
                          {t('Reactivar')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-primary-soft">
            <Users className="size-5 text-primary" />
          </div>
          <p className="text-sm font-medium">{t('No hay miembros')}</p>
          <p className="text-xs text-muted-foreground">
            {t('No se encontraron miembros con los filtros aplicados.')}
          </p>
        </div>
      )}

      <Dialog
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBanTarget(null);
            setBanReason("");
            setBanError(null);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{t('Banear miembro')}</DialogTitle>
            <DialogDescription>
              {banTarget
                ? t('Banea a {name}. El miembro perderá el acceso a la comunidad.', { name: banTarget.displayName })
                : t('Banear miembro.')}
            </DialogDescription>
          </DialogHeader>
          {banError && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {banError}
            </div>
          )}
          <Input
            value={banReason}
            onChange={(event) => setBanReason(event.target.value)}
            placeholder={t('Motivo del baneo (opcional)')}
            aria-label={t('Motivo del baneo')}
          />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBanTarget(null);
                setBanReason("");
                setBanError(null);
              }}
            >
              {t('Cancelar')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busyId === banTarget?.id}
              onClick={confirmBan}
            >
              {t('Banear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 bg-[#0B2B4A] px-5 py-4 text-white">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#123B63]" />
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>
      {[1, 2, 3, 4].map((item) => (
        <div
          className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0"
          key={item}
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-20" />
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
