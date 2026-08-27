"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Video,
  ArrowLeft,
  PhoneCall,
  PhoneOff,
  User,
  Stethoscope,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "../hooks/use-current-user";
import {
  fetchAppointment,
  fetchRoom,
  startSession,
  endSession,
} from "../services/appointments-service";
import { ClinicalEncounterPanel } from "./clinical-encounter-panel";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatRange,
  sessionStatusLabel,
} from "../utils/format";
import type { AppointmentDto, VirtualRoomDto } from "../types";

interface RoomPanelProps {
  appointment: AppointmentDto;
  onSessionChanged: () => void;
}

function RoomPanel({ appointment, onSessionChanged }: RoomPanelProps) {
  const t = useT();
  const router = useRouter();
  const [room, setRoom] = useState<VirtualRoomDto | null>(null);
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

  const handleJoin = () => {
    router.push(`/appointments/sala/${appointment.id}`);
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

  const participantsConnected =
    room?.participants.filter((p) => p.isConnected).length ?? 0;

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
            color={
              room.status === "Active"
                ? { bg: "#E6F7EF", text: "#0E7A4D", dot: "#10B981" }
                : { bg: "#162032", text: "#FFFFFF", dot: "#FFFFFF" }
            }
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoChip
          icon={User}
          label={t("Paciente")}
          value={appointment.patientName ?? "—"}
        />
        <InfoChip
          icon={Stethoscope}
          label={t("Especialidad")}
          value={appointment.specialtyName ?? "—"}
        />
        <InfoChip
          icon={Clock}
          label={t("Horario")}
          value={formatRange(
            appointment.scheduledStart,
            appointment.scheduledEnd,
          )}
        />
        <InfoChip
          icon={Video}
          label={t("Participantes")}
          value={`${participantsConnected} conectados`}
        />
      </div>

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {canJoin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleJoin} className="gap-1.5">
            <PhoneCall className="size-4" />
            Unirme a la consulta
          </Button>
          {appointment.status === "Confirmed" && (
            <Button
              variant="outline"
              onClick={handleStart}
              disabled={busy}
              className="gap-1.5"
            >
              <Video className="size-4" />
              Iniciar sesión
            </Button>
          )}
          {appointment.status === "InProgress" && (
            <Button
              variant="destructive"
              onClick={handleEnd}
              disabled={busy}
              className="gap-1.5"
            >
              <PhoneOff className="size-4" />
              Finalizar sesión
            </Button>
          )}
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
      <span className="truncate text-[12.5px] font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

export function AppointmentDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;
  const { context } = useCurrentUser();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
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
    context?.professional != null &&
    appointment != null &&
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
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-fit gap-1.5"
        >
          <ArrowLeft className="size-4" /> Volver
        </Button>
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error ?? "Cita no encontrada."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="w-fit gap-1.5"
      >
        <ArrowLeft className="size-4" /> Volver
      </Button>

      <PageHeader
        title={appointment.patientName ?? "Cita"}
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
        <p
          className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-700"
          role="note"
        >
          Solo el profesional asignado puede gestionar la sala y el encuentro
          clínico.
        </p>
      )}

      {isProfessional && (
        <>
          <RoomPanel
            appointment={appointment}
            onSessionChanged={() => setRefreshKey((k) => k + 1)}
          />
          <ClinicalEncounterPanel appointmentId={appointment.id} />
        </>
      )}
    </div>
  );
}
