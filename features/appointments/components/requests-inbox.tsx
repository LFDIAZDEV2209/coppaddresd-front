"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  ListFilter,
  RefreshCw,
  Search,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { confirmRequest } from "../services/appointments-service";
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
  value: AppointmentRequestStatus;
  label: string;
}> = [
  { value: "Pending", label: "Pendientes" },
  { value: "Approved", label: "Aprobadas" },
  { value: "Converted", label: "Convertidas" },
  { value: "Rejected", label: "Rechazadas" },
  { value: "Cancelled", label: "Canceladas" },
];

interface RequestsInboxProps {
  scope: "admin" | "professional";
  professionalId?: string | null;
  professionalName?: string | null;
  /** El profesional confirma sus solicitudes; la vista admin es de monitoreo. */
  canConfirm?: boolean;
  summary: ReturnType<typeof useMySummary>;
}

/**
 * Bandeja de solicitudes de telemedicina en estilo notificaciones: header azul
 * con icono, stats cards, filtros (estado server-side + bÃºsqueda local),
 * agrupaciÃ³n por dÃ­a (Hoy/Ayer/fecha) y acciÃ³n de confirmaciÃ³n para el
 * profesional asignado.
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
  const [confirming, setConfirming] = useState<AppointmentRequestDto | null>(
    null,
  );
  const [scheduledStart, setScheduledStart] = useState("");
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

  const doConfirm = async () => {
    if (!confirming || !scheduledStart || !professionalId) return;
    setBusy(true);
    setActionError(null);
    try {
      await confirmRequest(confirming.id, {
        professionalId,
        scheduledStart: new Date(scheduledStart).toISOString(),
        locationId: confirming.locationId,
      });
      setConfirming(null);
      setScheduledStart("");
      refetchList();
      refetchSummary();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "Esta solicitud ya fue confirmada (tiene una cita asociada). Actualiza la lista para ver el estado actual."
          : "No se pudo confirmar la solicitud. Verifica el horario (anticipaciÃ³n mÃ­nima) y que no se solape con otra cita.",
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
              ? `${pending} pendientes por confirmar Â· asignadas a ${professionalName}`
              : "Solicitudes de telemedicina"
            : `${pending} pendientes por confirmar en la plataforma`
        }
        icon={Inbox}
        actions={
          <Button
            size="sm"
            className="gap-1.5 border-transparent bg-white text-[var(--sidebar)] hover:bg-white/90 hover:text-[var(--sidebar)]"
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
          value={data ? String(pending) : "â€”"}
          icon={Clock}
          variant="warning"
          context="requieren confirmaciÃ³n"
        />
        <StatCard
          label="Total en la vista"
          value={String(total)}
          icon={Inbox}
          variant="primary"
          context={
            hasActiveFilters
              ? "segÃºn filtros activos"
              : "todas las solicitudes"
          }
        />
        <StatCard
          label="Convertidas"
          value={String(counts.converted)}
          icon={CalendarCheck}
          variant="success"
          context="se convirtieron en cita"
        />
        <StatCard
          label="Cerradas"
          value={String(counts.rejected + counts.cancelled)}
          icon={XCircle}
          variant="destructive"
          context="rechazadas o canceladas"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar paciente, especialidad o motivoâ€¦"
            className="pl-9 pr-9"
            aria-label="Buscar solicitudes"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Limpiar bÃºsqueda"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        <Select
          value={status || ALL}
          onValueChange={(value) =>
            setStatus(value === ALL ? "" : (value ?? ""))
          }
        >
          <SelectTrigger className="w-[190px]" aria-label="Filtrar por estado">
            <ListFilter
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <SelectValue placeholder="Estado">
              {(value) =>
                value === ALL
                  ? "Todos los estados"
                  : (statusOptions.find((option) => option.value === value)
                      ?.label ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">
            {total} solicitudes
            {status
              ? ` Â· ${requestStatusLabel[status as AppointmentRequestStatus]}`
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
                ? "Cuando tus pacientes pidan una cita de telemedicina, aparecerÃ¡ aquÃ­."
                : "Cuando los pacientes pidan citas de telemedicina, aparecerÃ¡n aquÃ­."}
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
                  className="size-1.5 rounded-full bg-primary"
                  aria-hidden
                />
                {group.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.requests.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    canConfirm={canConfirm && professionalId !== null}
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
                PÃ¡gina {page} de {totalPages}
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

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" aria-hidden />
              Confirmar solicitud
            </DialogTitle>
            <DialogDescription>
              Agenda la cita de {confirming?.specialtyName ?? "telemedicina"}{" "}
              para {confirming?.patientName ?? "el paciente"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-start">Inicio de la cita</Label>
            <Input
              id="confirm-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
            />
            <p className="text-[11.5px] text-muted-foreground">
              La fecha debe respetar la anticipaciÃ³n mÃ­nima configurada y no
              superponerse con otras citas de tu agenda.
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
              onClick={() => setConfirming(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={doConfirm}
              disabled={busy || !scheduledStart}
              className="gap-1.5"
            >
              <CalendarClock className="size-4" aria-hidden />
              {busy ? "Confirmandoâ€¦" : "Confirmar cita"}
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
  onConfirm,
}: {
  request: AppointmentRequestDto;
  canConfirm: boolean;
  onConfirm: (request: AppointmentRequestDto) => void;
}) {
  const pending = request.status === "Pending";
  // El backend permite confirmar solicitudes Pending o Approved (derivan en cita).
  const confirmable = pending || request.status === "Approved";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
        pending
          ? "border-primary/30 bg-primary-soft/30"
          : "border-border bg-card",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
          initialsColor(request.patientName),
        )}
      >
        {initials(request.patientName)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-foreground">
            {request.patientName ?? "Paciente"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Stethoscope className="size-3" aria-hidden />
            {request.specialtyName ?? "Especialidad"}
          </span>
          {pending && (
            <Badge className="gap-1 bg-primary text-primary-foreground">
              <Clock className="size-3" aria-hidden />
              Por confirmar
            </Badge>
          )}
        </div>

        {request.reason && (
          <p className="line-clamp-2 text-[12.5px] text-muted-foreground">
            {request.reason}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground/70">
          <span>{timeAgo(request.createdAt)}</span>
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

      <div className="flex shrink-0 flex-col items-end gap-2">
        <StatusBadge
          status={requestStatusLabel[request.status]}
          color={requestStatusColor(request.status)}
        />
        {confirmable && canConfirm && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => onConfirm(request)}
          >
            <CalendarClock className="size-4" aria-hidden />
            Confirmar
          </Button>
        )}
      </div>
    </li>
  );
}

/** Etiqueta de agrupaciÃ³n por dÃ­a para la bandeja tipo notificaciones. */
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

function initials(name: string | null): string {
  if (!name) return "â€”";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function initialsColor(name: string | null): string {
  const palette = [
    "bg-[var(--sidebar)] text-white",
    "bg-success-soft text-success",
    "bg-warning-soft text-warning",
    "bg-info-soft text-info",
    "bg-destructive-soft text-destructive",
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}
