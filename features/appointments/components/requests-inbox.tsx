"use client";

import { createElement, useMemo, useState } from "react";
import {
  Apple,
  Brain,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  ListFilter,
  MessageSquareX,
  RefreshCw,
  Scale,
  Search,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/http";
import { useRequestsInbox } from "../hooks/use-requests-inbox";
import { useMySummary } from "../hooks/use-admin";
import {
  approveRequest,
  confirmRequest,
  rejectRequest,
} from "../services/appointments-service";
import { ProfessionalSelector } from "./professional-selector";
import {
  formatDate,
  formatDateTime,
  requestStatusColor,
  requestStatusLabel,
  timeAgo,
} from "../utils/format";
import type { AppointmentRequestStatus, AppointmentRequestDto } from "../types";

const ALL = "__all__";

const statusOptions: Array<{
  value: AppointmentRequestStatus | typeof ALL;
  label: string;
}> = [
  { value: ALL, label: "Todas" },
  { value: "Pending", label: "Pendientes" },
  { value: "Approved", label: "Aprobadas" },
  { value: "Converted", label: "Convertidas" },
  { value: "Rejected", label: "Rechazadas" },
  { value: "Cancelled", label: "Canceladas" },
];

/** Icono representativo de cada especialidad (fallback genérico). */
function specialtyIcon(name: string | null): LucideIcon {
  const normalized = (name ?? "").toLowerCase();
  if (/(behavioral|psic|mental|ansiedad)/.test(normalized)) return Brain;
  if (/(nutrition|aliment|nutric)/.test(normalized)) return Apple;
  if (/(obesity|weight|peso)/.test(normalized)) return Scale;
  return Stethoscope;
}

interface RequestsInboxProps {
  scope: "admin" | "professional";
  professionalId?: string | null;
  professionalName?: string | null;
  /** El profesional confirma sus solicitudes; la vista admin es de monitoreo. */
  canConfirm?: boolean;
  summary: ReturnType<typeof useMySummary>;
}

/**
 * Bandeja de solicitudes de telemedicina: header azul de marca con icono,
 * stat cards, chips de filtro por estado con conteos (filtro server-side),
 * agrupación por día y ciclo de revisión de 2 pasos (aprobar → confirmar con
 * cita) más rechazo con motivo obligatorio. Autorización dual en el backend:
 * el profesional actúa sobre sus solicitudes y el admin sobre todas.
 */
export function RequestsInbox({
  scope,
  professionalId = null,
  professionalName = null,
  canConfirm = false,
  summary,
}: RequestsInboxProps) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState<AppointmentRequestDto | null>(
    null,
  );
  const [rejecting, setRejecting] = useState<AppointmentRequestDto | null>(
    null,
  );
  const [confirming, setConfirming] = useState<AppointmentRequestDto | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [confirmProfessionalId, setConfirmProfessionalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    items,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage,
    counts,
    refetch: refetchList,
  } = useRequestsInbox({ scope, professionalId, status });
  const { summary: data, refetch: refetchSummary } = summary;

  const pending = data?.requestsPending ?? 0;
  const hasActiveFilters = status !== "" || search.trim() !== "";

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? items.filter((request) =>
          [request.patientName, request.specialtyName, request.reason].some(
            (value) => value?.toLowerCase().includes(query),
          ),
        )
      : items;
    const result: Array<{
      label: string;
      requests: AppointmentRequestDto[];
    }> = [];
    for (const request of filtered) {
      const label = dayLabel(request.createdAt);
      const last = result[result.length - 1];
      if (last && last.label === label) last.requests.push(request);
      else result.push({ label, requests: [request] });
    }
    return result;
  }, [items, search]);

  const countFor = (value: AppointmentRequestStatus | typeof ALL): number => {
    switch (value) {
      case "Pending":
        return counts.pending;
      case "Approved":
        return counts.approved;
      case "Converted":
        return counts.converted;
      case "Rejected":
        return counts.rejected;
      case "Cancelled":
        return counts.cancelled;
      default:
        return total;
    }
  };

  const doApprove = async () => {
    if (!approving) return;
    setBusy(true);
    setActionError(null);
    try {
      await approveRequest(approving.id);
      setApproving(null);
      refetchList();
      refetchSummary();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "Esta solicitud ya no puede aprobarse (fue confirmada o cerrada). Actualiza la lista para ver el estado actual."
          : "No se pudo aprobar la solicitud. Verifica que siga pendiente.",
      );
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejecting || !rejectionReason.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await rejectRequest(rejecting.id, { reason: rejectionReason.trim() });
      setRejecting(null);
      setRejectionReason("");
      refetchList();
      refetchSummary();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "Esta solicitud ya no puede rechazarse (fue confirmada o cerrada). Actualiza la lista para ver el estado actual."
          : "No se pudo rechazar la solicitud. Verifica que siga pendiente o aprobada.",
      );
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!confirming || !scheduledStart) return;
    const targetProfessionalId =
      confirmProfessionalId ||
      professionalId ||
      confirming.professionalId ||
      "";
    if (!targetProfessionalId) return;
    setBusy(true);
    setActionError(null);
    try {
      await confirmRequest(confirming.id, {
        professionalId: targetProfessionalId,
        scheduledStart: new Date(scheduledStart).toISOString(),
        locationId: confirming.locationId,
      });
      setConfirming(null);
      setScheduledStart("");
      setConfirmProfessionalId("");
      refetchList();
      refetchSummary();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "No se pudo confirmar: el horario se solapa con otra cita de la agenda o la solicitud ya fue confirmada. Actualiza la lista para ver el estado actual."
          : "No se pudo confirmar la solicitud. Verifica el horario (anticipación mínima) y que no se solape con otra cita.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = () => {
    refetchList();
    refetchSummary();
  };

  const resetFilters = () => {
    setStatus("");
    setSearch("");
  };

  const closeReviewDialogs = () => {
    setApproving(null);
    setRejecting(null);
    setConfirming(null);
    setActionError(null);
  };

  const pageError = error;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={
          scope === "professional"
            ? "Solicitudes de mis pacientes"
            : "Solicitudes de los pacientes"
        }
        description={
          scope === "professional"
            ? professionalName
              ? `${pending} pendientes por revisar · asignadas a ${professionalName}`
              : "Solicitudes de telemedicina"
            : `${pending} pendientes por revisar en la plataforma`
        }
        icon={Inbox}
        actions={
          <Button
            size="sm"
            className="gap-1.5 border-transparent bg-white text-[var(--sidebar)] shadow-sm hover:bg-white/90 hover:text-[var(--sidebar)]"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Actualizar solicitudes"
          >
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
              aria-hidden
            />
            Actualizar
          </Button>
        }
      />

      {pageError && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {pageError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendientes"
          value={data ? String(pending) : "—"}
          icon={Clock}
          variant="navy"
          context="requieren revisión"
        />
        <StatCard
          label="Aprobadas"
          value={String(counts.approved)}
          icon={CalendarCheck}
          variant="navy"
          context="listas para agendar"
        />
        <StatCard
          label="Convertidas"
          value={String(counts.converted)}
          icon={CalendarCheck}
          variant="navy"
          context="se convirtieron en cita"
        />
        <StatCard
          label="Cerradas"
          value={String(counts.rejected + counts.cancelled)}
          icon={XCircle}
          variant="navy"
          context="rechazadas o canceladas"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente, especialidad…"
              className="pl-9 pr-9"
              aria-label="Buscar solicitudes"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              {total} solicitudes
              {status
                ? ` · ${requestStatusLabel[status as AppointmentRequestStatus]}`
                : ""}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          </div>
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por estado"
        >
          {statusOptions.map((option) => {
            const active = (status || ALL) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setStatus(option.value === ALL ? "" : option.value)
                }
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "border-transparent bg-[var(--sidebar)] text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-[var(--sidebar)]/40 hover:bg-[var(--sidebar)]/5 hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {option.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10.5px] font-semibold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {countFor(option.value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            {hasActiveFilters ? (
              <ListFilter
                className="size-6 text-muted-foreground"
                aria-hidden
              />
            ) : (
              <Inbox className="size-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">
            {hasActiveFilters ? "Sin resultados" : "Sin solicitudes"}
          </p>
          <p className="max-w-sm text-[12.5px] text-muted-foreground">
            {hasActiveFilters
              ? "No hay solicitudes que coincidan con los filtros actuales."
              : scope === "professional"
                ? "Cuando tus pacientes pidan una cita de telemedicina, aparecerá aquí."
                : "Cuando los pacientes pidan citas de telemedicina, aparecerán aquí."}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
              onClick={resetFilters}
            >
              <X className="size-3.5" aria-hidden />
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section
              key={group.label}
              aria-label={`Solicitudes de ${group.label.toLowerCase()}`}
              className="flex flex-col gap-2"
            >
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span
                  className="size-1.5 rounded-full bg-[var(--sidebar)]"
                  aria-hidden
                />
                {group.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.requests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    canConfirm={canConfirm || scope === "admin"}
                    onApprove={setApproving}
                    onReject={setRejecting}
                    onConfirm={setConfirming}
                  />
                ))}
              </ul>
            </section>
          ))}

          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Anterior
              </Button>
              <span className="text-[12px] text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Aprobar */}
      <Dialog
        open={approving !== null}
        onOpenChange={(open) => {
          if (!open) closeReviewDialogs();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="size-4 text-[var(--sidebar)]" aria-hidden />
              Aprobar solicitud
            </DialogTitle>
            <DialogDescription>
              Aprobar la solicitud de{" "}
              {approving?.specialtyName ?? "telemedicina"} de{" "}
              {approving?.patientName ?? "el paciente"} la deja lista para
              agendar la cita. No se crea ninguna cita en este paso.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <p
              role="alert"
              className="rounded-lg bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
            >
              {actionError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => closeReviewDialogs()}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={doApprove}
              disabled={busy}
              className="gap-1.5 bg-[var(--sidebar)] text-white hover:bg-[var(--sidebar)]/90"
            >
              <Check className="size-4" aria-hidden />
              {busy ? "Aprobando…" : "Aprobar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rechazar */}
      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectionReason("");
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareX className="size-4 text-destructive" aria-hidden />
              Rechazar solicitud
            </DialogTitle>
            <DialogDescription>
              La solicitud de {rejecting?.specialtyName ?? "telemedicina"} de{" "}
              {rejecting?.patientName ?? "el paciente"} quedará cerrada. El
              motivo es obligatorio y se mostrará en el detalle.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <textarea
              id="reject-reason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej.: sin cupos en el horario solicitado"
              className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label="Motivo del rechazo"
            />
            <p className="text-[11.5px] text-muted-foreground">
              Máximo 500 caracteres
              {rejectionReason.trim() === "" && (
                <span className="text-destructive"> · obligatorio</span>
              )}
            </p>
            {actionError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
              >
                {actionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(null);
                setRejectionReason("");
                setActionError(null);
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={doReject}
              disabled={busy || rejectionReason.trim() === ""}
              className="gap-1.5"
            >
              <XCircle className="size-4" aria-hidden />
              {busy ? "Rechazando…" : "Rechazar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar (crear cita) */}
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
            setScheduledStart("");
            setConfirmProfessionalId("");
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck
                className="size-4 text-[var(--sidebar)]"
                aria-hidden
              />
              Confirmar solicitud
            </DialogTitle>
            <DialogDescription>
              Agenda la cita de {confirming?.specialtyName ?? "telemedicina"}{" "}
              para {confirming?.patientName ?? "el paciente"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {scope === "admin" && !confirming?.professionalId && (
              <div className="flex flex-col gap-1.5">
                <Label>Profesional asignado</Label>
                <ProfessionalSelector
                  value={confirmProfessionalId}
                  onChange={setConfirmProfessionalId}
                />
                <p className="text-[11.5px] text-muted-foreground">
                  La solicitud no tiene profesional asignado; elige quién
                  atenderá la cita.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-start">Inicio de la cita</Label>
              <Input
                id="confirm-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(event) => setScheduledStart(event.target.value)}
              />
              <p className="text-[11.5px] text-muted-foreground">
                La fecha debe respetar la anticipación mínima configurada y no
                superponerse con otras citas de la agenda.
              </p>
            </div>
            {actionError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
              >
                {actionError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirming(null);
                setScheduledStart("");
                setConfirmProfessionalId("");
                setActionError(null);
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={doConfirm}
              disabled={
                busy ||
                !scheduledStart ||
                (scope === "admin" &&
                  !confirming?.professionalId &&
                  !confirmProfessionalId)
              }
              className="gap-1.5 bg-[var(--sidebar)] text-white hover:bg-[var(--sidebar)]/90"
            >
              <CalendarClock className="size-4" aria-hidden />
              {busy ? "Confirmando…" : "Confirmar cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestItem({
  request,
  canConfirm,
  onApprove,
  onReject,
  onConfirm,
}: {
  request: AppointmentRequestDto;
  canConfirm: boolean;
  onApprove: (request: AppointmentRequestDto) => void;
  onReject: (request: AppointmentRequestDto) => void;
  onConfirm: (request: AppointmentRequestDto) => void;
}) {
  const pending = request.status === "Pending";
  const approved = request.status === "Approved";
  // El backend permite confirmar solicitudes Pending o Approved (derivan en cita).
  const reviewable = pending || approved;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 sm:flex-row sm:items-center",
        pending
          ? "border-l-4 border-border shadow-sm hover:shadow-md"
          : approved
            ? "border-l-4 border-border/70 hover:shadow-sm"
            : "border-border hover:shadow-sm",
      )}
      style={
        pending
          ? { borderLeftColor: "var(--sidebar)" }
          : approved
            ? { borderLeftColor: "var(--info)" }
            : undefined
      }
    >
      <div
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
          pending
            ? "bg-[var(--sidebar)] text-white"
            : approved
              ? "bg-info/10 text-info"
              : "bg-muted text-muted-foreground",
        )}
      >
        {createElement(specialtyIcon(request.specialtyName), {
          className: "size-5",
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-foreground">
            {request.patientName ?? "Paciente"}
          </span>
          <Badge variant="secondary" className="gap-1">
            <Stethoscope className="size-3" aria-hidden />
            {request.specialtyName ?? "Especialidad"}
          </Badge>
        </div>

        {request.reason && (
          <p className="line-clamp-2 text-[12.5px] text-muted-foreground">
            {request.reason}
          </p>
        )}

        {request.status === "Rejected" && request.rejectionReason && (
          <p className="flex items-start gap-1 text-[12px] text-destructive">
            <MessageSquareX className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Motivo del rechazo: <strong>{request.rejectionReason}</strong>
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {timeAgo(request.createdAt)}
          </span>
          {request.preferredStart ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" aria-hidden />
              Preferida: {formatDateTime(request.preferredStart)}
            </span>
          ) : (
            <span>Sin fecha preferida</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <StatusBadge
          status={requestStatusLabel[request.status]}
          color={requestStatusColor(request.status)}
        />
        {reviewable && canConfirm && (
          <div className="flex flex-wrap items-center gap-1.5">
            {pending && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-success/60 text-success hover:bg-success-soft hover:text-success"
                onClick={() => onApprove(request)}
              >
                <Check className="size-3.5" aria-hidden />
                Aprobar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-destructive/70 text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={() => onReject(request)}
            >
              <XCircle className="size-3.5" aria-hidden />
              Rechazar
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[var(--sidebar)] text-white shadow-sm hover:bg-[var(--sidebar)]/90"
              onClick={() => onConfirm(request)}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              Confirmar
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Etiqueta de agrupación por día para la bandeja tipo notificaciones. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Anteriores";
  const today = new Date();
  const startOfDay = (day: Date) =>
    new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(today) - startOfDay(date)) / 86_400_000,
  );
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return formatDate(iso);
}
