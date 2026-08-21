"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  ArrowLeft,
  PhoneCall,
  PhoneOff,
  ClipboardPenLine,
  Save,
  CheckCircle2,
  User,
  Stethoscope,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "../hooks/use-current-user";
import {
  fetchAppointment,
  fetchJoinToken,
  fetchRoom,
  startSession,
  endSession,
  fetchEncounter,
  saveEncounter,
  completeEncounter,
} from "../services/telemedicine-service";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatRange,
  sessionStatusLabel,
  encounterStatusLabel,
} from "../utils/format";
import type {
  ClinicalDataDto,
  TelemedicineAppointmentDto,
  VirtualRoomDto,
} from "../types";

interface RoomPanelProps {
  appointment: TelemedicineAppointmentDto;
  onSessionChanged: () => void;
}

function RoomPanel({ appointment, onSessionChanged }: RoomPanelProps) {
  const [room, setRoom] = useState<VirtualRoomDto | null>(null);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRoom = useCallback(async () => {
    try {
      const result = await fetchRoom(appointment.id);
      setRoom(result);
      setError(null);
    } catch {
      // La sala puede no existir aún (lazy): no es error fatal.
      setRoom(null);
    }
  }, [appointment.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshRoom();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshRoom]);

  const canJoin =
    appointment.status === "Confirmed" || appointment.status === "InProgress";

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await fetchJoinToken(appointment.id);
      setJoinToken(result.token);
      setTokenExpiresAt(result.expiresAt);
      setRoom(result.room);
      // Mostrar el token como "enlace" para el usuario (la integración con el
      // SDK de Twilio del cliente se integra en una fase posterior).
      window.open(result.token, "_blank");
    } catch {
      setError("No se pudo generar el acceso a la sala (¿dentro de la ventana?).");
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await startSession(appointment.id);
      await refreshRoom();
      onSessionChanged();
    } catch {
      setError("No se pudo iniciar la sesión.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async () => {
    setBusy(true);
    setError(null);
    try {
      await endSession(appointment.id, "Finalizada por el profesional");
      await refreshRoom();
      onSessionChanged();
    } catch {
      setError("No se pudo finalizar la sesión.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  const participantsConnected = room?.participants.filter((p) => p.isConnected).length ?? 0;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Video className="size-4 text-primary" />
          Sala virtual
        </h2>
        {room && (
          <StatusBadge
            status={sessionStatusLabel[room.status]}
            color={room.status === "Active" ? { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" } : { bg: "#E5F0FA", text: "#123B63", dot: "#2563EB" }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoChip icon={User} label="Paciente" value={appointment.patientName ?? "—"} />
        <InfoChip icon={Stethoscope} label="Especialidad" value={appointment.specialtyName ?? "—"} />
        <InfoChip icon={Clock} label="Horario" value={formatRange(appointment.scheduledStart, appointment.scheduledEnd)} />
        <InfoChip icon={Video} label="Participantes" value={`${participantsConnected} conectados`} />
      </div>

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {canJoin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleJoin} disabled={busy} className="gap-1.5">
            <PhoneCall className="size-4" />
            {busy ? "Generando acceso..." : "Generar acceso a la sala"}
          </Button>
          {appointment.status === "Confirmed" && (
            <Button variant="outline" onClick={handleStart} disabled={busy} className="gap-1.5">
              <Video className="size-4" />
              Iniciar sesión
            </Button>
          )}
          {appointment.status === "InProgress" && (
            <Button variant="destructive" onClick={handleEnd} disabled={busy} className="gap-1.5">
              <PhoneOff className="size-4" />
              Finalizar sesión
            </Button>
          )}
        </div>
      )}

      {joinToken && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-[12px] font-medium text-foreground">
            Token de acceso generado
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
            {joinToken}
          </p>
          {tokenExpiresAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Expira: {formatRange(tokenExpiresAt, tokenExpiresAt)}
            </p>
          )}
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            La integración con el SDK de video del navegador se habilita en una
            fase posterior; este token valida el acceso a la sala.
          </p>
        </div>
      )}

      {!canJoin && (
        <p className="text-[12.5px] text-muted-foreground">
          La sala solo se habilita para citas confirmadas o en curso.
        </p>
      )}
    </section>
  );
}

function ClinicalEncounterPanel({ appointmentId }: { appointmentId: string }) {
  const [encounter, setEncounter] = useState<ClinicalDataDto>({
    motivoConsulta: "",
    evaluacion: "",
    diagnostico: "",
    plan: "",
    indicaciones: "",
    observaciones: "",
    seguimiento: "",
  });
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchEncounter(appointmentId);
        if (!active) return;
        setEncounter(
          result.clinicalData ?? {
            motivoConsulta: "",
            evaluacion: "",
            diagnostico: "",
            plan: "",
            indicaciones: "",
            observaciones: "",
            seguimiento: "",
          },
        );
        setNotes(result.notes ?? "");
        setStatus(result.status);
      } catch {
        if (active) {
          // No hay encuentro todavía (creación perezosa).
          setStatus("Draft");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  const update = (field: keyof ClinicalDataDto, value: string) => {
    setEncounter((prev) => ({ ...prev, [field]: value }));
  };

  const persist = async (complete: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (complete) {
        await completeEncounter(appointmentId, { clinicalData: encounter, notes });
        setStatus("Completed");
      } else {
        await saveEncounter(appointmentId, { clinicalData: encounter, notes });
        setStatus("Draft");
      }
    } catch {
      setError("No se pudo guardar el encuentro clínico.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const isCompleted = status === "Completed";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <ClipboardPenLine className="size-4 text-primary" />
          Encuentro clínico
        </h2>
        <StatusBadge
          status={encounterStatusLabel[(status as "Draft" | "Completed" | "Cancelled") ?? "Draft"] ?? "Borrador"}
          color={isCompleted ? { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" } : { bg: "#FDF2E3", text: "#9A6A0A", dot: "#F59E0B" }}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Field label="Motivo de consulta" value={encounter.motivoConsulta ?? ""} onChange={(v) => update("motivoConsulta", v)} disabled={isCompleted} />
        <Field label="Evaluación" value={encounter.evaluacion ?? ""} onChange={(v) => update("evaluacion", v)} disabled={isCompleted} />
        <Field label="Diagnóstico" value={encounter.diagnostico ?? ""} onChange={(v) => update("diagnostico", v)} disabled={isCompleted} />
        <Field label="Plan" value={encounter.plan ?? ""} onChange={(v) => update("plan", v)} disabled={isCompleted} />
        <Field label="Indicaciones" value={encounter.indicaciones ?? ""} onChange={(v) => update("indicaciones", v)} disabled={isCompleted} />
        <Field label="Observaciones" value={encounter.observaciones ?? ""} onChange={(v) => update("observaciones", v)} disabled={isCompleted} />
        <Field label="Seguimiento" value={encounter.seguimiento ?? ""} onChange={(v) => update("seguimiento", v)} disabled={isCompleted} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-notes">Notas</Label>
        <textarea
          id="encounter-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales de la consulta"
          disabled={isCompleted}
          className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => persist(false)} disabled={busy} className="gap-1.5">
            <Save className="size-4" />
            Guardar borrador
          </Button>
          <Button onClick={() => persist(true)} disabled={busy} className="gap-1.5">
            <CheckCircle2 className="size-4" />
            Completar encuentro
          </Button>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className="min-h-14 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      />
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-[12.5px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function AppointmentDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;
  const { context } = useCurrentUser();

  const [appointment, setAppointment] = useState<TelemedicineAppointmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!appointmentId) return;
    let active = true;
    (async () => {
      try {
        const result = await fetchAppointment(appointmentId);
        if (!active) return;
        setAppointment(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudo cargar la cita.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId, refreshKey]);

  const isProfessional =
    context?.professional != null && appointment != null &&
    context.professional.id === appointment.professionalId;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Button variant="outline" onClick={() => router.back()} className="w-fit gap-1.5">
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {error ?? "Cita no encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button variant="outline" onClick={() => router.back()} className="w-fit gap-1.5">
        <ArrowLeft className="size-4" /> Volver
      </Button>

      <PageHeader
        title={appointment.patientName ?? "Cita de telemedicina"}
        description={`${appointment.specialtyName ?? "Especialidad"} · ${formatRange(appointment.scheduledStart, appointment.scheduledEnd)}`}
        icon={Video}
        actions={
          <StatusBadge
            status={appointmentStatusLabel[appointment.status]}
            color={appointmentStatusColor(appointment.status)}
          />
        }
      />

      {!isProfessional && (
        <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-700" role="note">
          Solo el profesional asignado puede gestionar la sala y el encuentro clínico.
        </p>
      )}

      {isProfessional && (
        <>
          <RoomPanel appointment={appointment} onSessionChanged={() => setRefreshKey((k) => k + 1)} />
          <ClinicalEncounterPanel appointmentId={appointment.id} />
        </>
      )}
    </div>
  );
}
