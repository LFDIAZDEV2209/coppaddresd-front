"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  FileClock,
  Search,
  UserCheck,
  UserRound,
  XCircle,
} from "lucide-react";
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

const AVATAR_GRADS = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export function ProfilesRevisionPage() {
  const {
    pendingProfiles,
    pendingLoading,
    pendingError,
    approveProfile,
    rejectProfile,
  } = useCommunity();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CommunityProfile | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pendingProfiles;
    return pendingProfiles.filter((profile) =>
      profile.displayName.toLowerCase().includes(term),
    );
  }, [pendingProfiles, search]);

  const handleApprove = async (profile: CommunityProfile) => {
    setBusyId(profile.id);
    setNotice(null);
    try {
      await approveProfile(profile.id);
      setNotice({
        kind: "success",
        text: `Perfil de ${profile.displayName} aprobado.`,
      });
    } catch {
      setNotice({
        kind: "error",
        text: "No pudimos aprobar el perfil. Intenta de nuevo.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const target = rejectTarget;
    setBusyId(target.id);
    setNotice(null);
    try {
      await rejectProfile(target.id, rejectReason.trim() || undefined);
      setNotice({
        kind: "success",
        text: `Perfil de ${target.displayName} rechazado.`,
      });
    } catch {
      setNotice({
        kind: "error",
        text: "No pudimos rechazar el perfil. Intenta de nuevo.",
      });
    } finally {
      setBusyId(null);
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Revisión de perfiles"
        description="Aprueba o rechaza los perfiles pendientes de la comunidad"
        icon={UserCheck}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Perfiles pendientes</h2>
            <p className="text-xs text-muted-foreground">
              Busca por nombre y decide sobre cada solicitud.
            </p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre..."
              aria-label="Buscar perfiles"
            />
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-success/30 bg-success-soft text-success-foreground"
              : "border-destructive/20 bg-destructive-soft text-destructive"
          }`}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          {notice.text}
        </div>
      )}

      {pendingLoading ? (
        <ProfilesSkeleton />
      ) : pendingError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft p-10 text-center text-sm text-destructive">
          No pudimos cargar los perfiles pendientes.
        </div>
      ) : visible.length ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${visible.length} perfiles pendientes`}
            description="Requieren revisión antes de publicar en la comunidad"
            icon={FileClock}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead className="hidden md:table-cell">
                  Solicitud
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-40 text-right">
                  <span className="sr-only">Acciones</span>
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
                        <span className="truncate text-xs text-muted-foreground">
                          {profile.bio || "Sin biografía"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{formatDate(profile.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status="Pendiente"
                      color={{
                        bg: "var(--warning-soft)",
                        text: "var(--warning-foreground)",
                        dot: "var(--warning)",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === profile.id}
                        onClick={() => handleApprove(profile)}
                      >
                        <CheckCircle2 data-icon="inline-start" />
                        Aprobar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === profile.id}
                        onClick={() => setRejectTarget(profile)}
                      >
                        <XCircle data-icon="inline-start" />
                        Rechazar
                      </Button>
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
            <UserRound className="size-5 text-primary" />
          </div>
          <p className="text-sm font-medium">No hay perfiles pendientes</p>
          <p className="text-xs text-muted-foreground">
            Los nuevos miembros aparecerán aquí cuando se registren.
          </p>
        </div>
      )}

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Rechazar perfil</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Rechaza la solicitud de ${rejectTarget.displayName}. El miembro podrá corregir su perfil.`
                : "Rechazar la solicitud."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Motivo del rechazo (opcional)"
            aria-label="Motivo del rechazo"
          />
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busyId === rejectTarget?.id}
              onClick={confirmReject}
            >
              <XCircle data-icon="inline-start" />
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfilesSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4].map((item) => (
        <div className="flex items-center gap-4 border-b border-border py-4 last:border-0" key={item}>
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}