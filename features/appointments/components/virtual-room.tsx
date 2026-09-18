"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  PhoneCall,
  Users,
  Clock,
  User,
  Stethoscope,
  CalendarDays,
  Loader2,
  PanelRight,
  ClipboardList,
  ClipboardCheck,
  ArrowLeft,
  AlertTriangle,
  Activity,
  CircleCheck,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { useCurrentUser } from "../hooks/use-current-user";
import { loadTwilioVideo } from "@/lib/twilio/twilio-loader";
import { lightenHex, readCssVar } from "@/lib/config/css-vars";
import { DEFAULT_ACCENT } from "@/lib/config/accent-colors";
import {
  fetchAppointment,
  fetchJoinToken,
  fetchRoom,
  startSession,
  endSession,
} from "../services/appointments-service";
import {
  ConsultationPanel,
  clampPanelHeight,
  defaultPanelHeight,
} from "./consultation-panel";
import type { ConsultationPanelTab } from "./consultation-panel";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDate,
  formatDateTime,
  formatRange,
  formatTime,
  sessionStatusLabel,
} from "../utils/format";
import type { AppointmentDto } from "../types";

type Phase = "loading" | "ready" | "connecting" | "connected" | "ended";

const LOCAL_IDENTITY = "__local__";

/**
 * Sala virtual de citas: pantalla completa con video en vivo (SDK de
 * Twilio v2 cargado por CDN), controles de micrófono/cámara, lista de
 * participantes, encuentro clínico en el panel lateral y finalización de la
 * consulta por el profesional. La identidad en Twilio es el id del usuario del
 * JWT (ver GenerateAccessTokenAsync en el backend).
 */
export function VirtualRoom() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;
  const { user: session, hasPermission } = useAuth();
  const { context, loading: userLoading } = useCurrentUser();

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [remoteTiles, setRemoteTiles] = useState<RoomTile[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [backendRoomStatus, setBackendRoomStatus] = useState<string | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] =
    useState<ConsultationPanelTab>("participants");
  const [ending, setEnding] = useState(false);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [tracksVersion, setTracksVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    if (typeof window === "undefined") return defaultPanelHeight();
    const stored = Number(window.localStorage.getItem(PANEL_HEIGHT_STORAGE_KEY));
    return stored > 0 ? clampPanelHeight(stored) : defaultPanelHeight();
  });

  const roomRef = useRef<TwilioVideo.Room | null>(null);
  const localTracksRef = useRef<TwilioVideo.LocalTrack[]>([]);
  const remoteTracksRef = useRef(new Map<string, TwilioVideo.RemoteTrack[]>());
  const attachedTracksRef = useRef(new Set<string>());
  const trackContainersRef = useRef(new Map<string, HTMLDivElement>());

  const isOwner =
    context?.professional != null &&
    appointment != null &&
    context.professional.id === appointment.professionalId;

  const canManage =
    hasAppointmentPermission(hasPermission, "Appointments.SessionsManage") ||
    isOwner;

  const myIdentity = session?.id ?? null;
  const isProfessionalParticipant = isOwner;

  const nameFor = useCallback(
    (identity: string, isLocal: boolean): { name: string; role: string } => {
      if (isLocal || identity === myIdentity) {
        if (isProfessionalParticipant)
          return { name: t("Tú"), role: t("Profesional") };
        if (context?.patient) return { name: t("Tú"), role: t("Paciente") };
        return { name: t("Tú"), role: t("Supervisor") };
      }
      if (isProfessionalParticipant) {
        return {
          name: appointment?.patientName ?? t("Paciente"),
          role: t("Paciente"),
        };
      }
      return {
        name: appointment?.professionalName ?? t("Profesional"),
        role: t("Profesional"),
      };
    },
    [appointment, context, isProfessionalParticipant, myIdentity, t],
  );

  // --- Carga inicial de la cita ---

  useEffect(() => {
    if (!appointmentId) return;
    let active = true;
    (async () => {
      try {
        const result = await fetchAppointment(appointmentId);
        if (!active) return;
        setAppointment(result);
        setLoadError(null);
        setPhase("ready");
      } catch {
        if (!active) return;
        setLoadError(
          t("No se pudo cargar la cita. Verificá que el enlace sea válido."),
        );
        setPhase("ended");
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId, t]);

  // --- Participantes remotos ---

  const addRemoteTile = useCallback((identity: string) => {
    setRemoteTiles((tiles) =>
      tiles.some((t) => t.identity === identity)
        ? tiles
        : [...tiles, { identity, isLocal: false, connectedAt: new Date().toISOString() }],
    );
  }, []);

  const removeRemoteTile = useCallback((identity: string) => {
    setRemoteTiles((tiles) => tiles.filter((t) => t.identity !== identity));
    remoteTracksRef.current.delete(identity);
    attachedTracksRef.current.forEach((id) => {
      if (id.startsWith(`${identity}:`)) attachedTracksRef.current.delete(id);
    });
    setTracksVersion((v) => v + 1);
  }, []);

  const attachRemoteTrack = useCallback(
    (identity: string, track: TwilioVideo.RemoteTrack) => {
      const list = remoteTracksRef.current.get(identity) ?? [];
      list.push(track);
      remoteTracksRef.current.set(identity, list);
      setTracksVersion((v) => v + 1);
    },
    [],
  );

  const detachRemoteTrack = useCallback(
    (identity: string, track: TwilioVideo.RemoteTrack) => {
      track.detach().forEach((el) => el.remove());
      const list = remoteTracksRef.current.get(identity) ?? [];
      remoteTracksRef.current.set(
        identity,
        list.filter((t) => t !== track),
      );
      attachedTracksRef.current.delete(`${identity}:${track.id}`);
      setTracksVersion((v) => v + 1);
    },
    [],
  );

  const watchParticipant = useCallback(
    (participant: TwilioVideo.Participant) => {
      participant.tracks.forEach((publication) => {
        if (publication.track && publication.isTrackEnabled) {
          attachRemoteTrack(
            participant.identity,
            publication.track as TwilioVideo.RemoteTrack,
          );
        }
      });
      participant.on("trackSubscribed", (track) =>
        attachRemoteTrack(participant.identity, track),
      );
      participant.on("trackUnsubscribed", (track) =>
        detachRemoteTrack(participant.identity, track),
      );
    },
    [attachRemoteTrack, detachRemoteTrack],
  );

  // --- Conexión a la sala ---

  const connect = useCallback(
    async (withVideo: boolean) => {
      if (!appointmentId) return;
      setPhase("connecting");
      setConnectError(null);
      localTracksRef.current = [];
      remoteTracksRef.current = new Map();
      attachedTracksRef.current = new Set();
      try {
        const result = await fetchJoinToken(appointmentId);
        const sdk = await loadTwilioVideo();
        const room = await withTimeout(
          sdk.connect(result.token, {
            name: null,
            audio: true,
            video: withVideo,
          }),
          30000,
          t(
            "La conexión con la sala tardó demasiado. Revisá que la cámara y el micrófono estén disponibles e intentá de nuevo.",
          ),
        );
        roomRef.current = room;
        setVideoOn(withVideo);

        room.localParticipant.tracks.forEach((publication) => {
          const track = publication.track;
          if (track && (track.kind === "audio" || track.kind === "video")) {
            localTracksRef.current.push(track as TwilioVideo.LocalTrack);
          }
        });
        setTracksVersion((v) => v + 1);

        room.participants.forEach((participant) => {
          addRemoteTile(participant.identity);
          watchParticipant(participant);
        });
        room.on("participantConnected", (participant) => {
          addRemoteTile(participant.identity);
          watchParticipant(participant);
        });
        room.on("participantDisconnected", (participant) => {
          removeRemoteTile(participant.identity);
        });
        room.on("disconnected", (disconnectedRoom) => {
          if (roomRef.current !== disconnectedRoom) return;
          setPhase("ended");
          setEndedReason(
            t("Te desconectaste de la sala o la conexión se interrumpió."),
          );
        });

        setJoinedAt(new Date().toISOString());
        setPhase("connected");
        setElapsed(0);
      } catch (error) {
        setPhase("ready");
        setConnectError(
          error instanceof Error
            ? formatBackendMessage(error.message)
            : t("No se pudo conectar con la sala de video."),
        );
      }
    },
    [addRemoteTile, appointmentId, removeRemoteTile, t, watchParticipant],
  );

  const join = useCallback(async () => {
    if (!appointment || !isOwner) {
      await connect(true);
      return;
    }
    // El profesional inicia la consulta al entrar (cita confirmada → en curso).
    if (appointment.status === "Confirmed") {
      try {
        await startSession(appointment.id);
        const refreshed = await fetchAppointment(appointment.id);
        setAppointment(refreshed);
      } catch {
        // El inicio puede fallar por concurrencia (ya iniciada por otro); la
        // sala sigue siendo accesible mientras el join-token lo permita.
      }
    }
    await connect(true);
  }, [appointment, connect, isOwner]);

  const joinAudioOnly = useCallback(async () => {
    await connect(false);
  }, [connect]);

  const leave = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    router.back();
  }, [router]);

  const finalize = useCallback(async () => {
    if (!appointment) return;
    setEnding(true);
    setConnectError(null);
    try {
      await endSession(appointment.id, "Finalizada por el profesional");
      roomRef.current?.disconnect();
      roomRef.current = null;
      router.push(`/appointments/citas/${appointment.id}`);
    } catch {
      setConnectError(t("No se pudo finalizar la sesión. Intentá nuevamente."));
      setEnding(false);
    }
  }, [appointment, router, t]);

  const toggleAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const publications = Array.from(room.localParticipant.tracks.values());
    const track = publications.find((p) => p.track?.kind === "audio")?.track as
      TwilioVideo.LocalTrack | undefined;
    if (!track) return;
    if (track.isEnabled) {
      track.disable();
      setAudioOn(false);
    } else {
      track.enable();
      setAudioOn(true);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const publications = Array.from(room.localParticipant.tracks.values());
    const track = publications.find((p) => p.track?.kind === "video")?.track as
      TwilioVideo.LocalTrack | undefined;
    if (!track) return;
    if (track.isEnabled) {
      track.disable();
      setVideoOn(false);
    } else {
      track.enable();
      setVideoOn(true);
    }
  }, []);

  // --- Limpieza al desmontar ---

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
      localTracksRef.current.forEach((track) => {
        track.detach().forEach((el) => el.remove());
        track.stop();
      });
      localTracksRef.current = [];
      remoteTracksRef.current.forEach((tracks) => {
        tracks.forEach((track) => track.detach().forEach((el) => el.remove()));
      });
    };
  }, []);

  // --- Adjuntar tracks (locales y remotos) a sus tiles ---

  useEffect(() => {
    if (phase !== "connected") return;

    const localContainer = trackContainersRef.current.get(LOCAL_IDENTITY);
    if (localContainer) {
      localTracksRef.current.forEach((track) => {
        const key = `${LOCAL_IDENTITY}:${track.id}`;
        if (track.kind !== "video" || attachedTracksRef.current.has(key))
          return;
        attachedTracksRef.current.add(key);
        localContainer.appendChild(track.attach());
      });
    }

    remoteTracksRef.current.forEach((tracks, identity) => {
      const container = trackContainersRef.current.get(identity);
      if (!container) return;
      tracks.forEach((track) => {
        const key = `${identity}:${track.id}`;
        if (track.kind !== "video" || attachedTracksRef.current.has(key))
          return;
        attachedTracksRef.current.add(key);
        container.appendChild(track.attach());
      });
    });
  }, [phase, tracksVersion]);

  // --- Reloj de la sesión ---

  useEffect(() => {
    if (phase !== "connected") return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // --- Estado de la sala en el backend (webhooks de Twilio) ---

  useEffect(() => {
    if (phase !== "connected") return;
    let active = true;
    const poll = async () => {
      try {
        const room = await fetchRoom(appointmentId);
        if (!active) return;
        setBackendRoomStatus(room.activeSessionStatus ?? room.status);
      } catch {
        // Polling best-effort: la sala puede no existir aún o caer la red.
      }
    };
    poll();
    const timer = window.setInterval(poll, 20000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [phase, appointmentId]);

  useEffect(() => {
    if (phase !== "ready" && phase !== "connecting") return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Persistencia de la altura elegida del panel inferior.
  useEffect(() => {
    window.localStorage.setItem(PANEL_HEIGHT_STORAGE_KEY, String(panelHeight));
  }, [panelHeight]);

  // --- Helpers de render ---

  const localLabel = useMemo(
    () => ({ ...nameFor(myIdentity ?? "", true), connectedAt: joinedAt }),
    [nameFor, myIdentity, joinedAt],
  );
  const totalTiles = remoteTiles.length + 1;

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const renderTile = (tile: RoomTile) => {
    const info = nameFor(tile.identity, tile.isLocal);
    const showPlaceholder = !tile.isLocal || !videoOn;
    const initials = info.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
    return (
      <div
        key={tile.identity}
        className="relative h-full min-h-0 w-full overflow-hidden rounded-[26px] border border-border/80 bg-muted p-1.5 shadow-sm"
      >
        <div
          ref={(el) => {
            const map = trackContainersRef.current;
            if (el) map.set(tile.identity, el);
            else map.delete(tile.identity);
          }}
          className="absolute inset-1.5 overflow-hidden rounded-[21px] bg-muted [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        {showPlaceholder && (
          <div className="absolute inset-1.5 flex flex-col items-center justify-center gap-3 rounded-[21px] bg-muted">
            <div className="flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              {initials ? (
                <span className="text-lg font-bold text-primary">{initials}</span>
              ) : (
                <User className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1 px-4 text-center">
              <p className="text-[13.5px] font-semibold text-foreground">
                {info.name}
              </p>
              <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                {tile.isLocal ? (
                  <>
                    <VideoOff className="size-3.5" /> {t("Cámara apagada")}
                  </>
                ) : (
                  <>
                    <Clock className="size-3.5" /> {t("Esperando conexión…")}
                  </>
                )}
              </p>
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-white/20 bg-foreground/75 px-3 py-1.5 backdrop-blur-md">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="truncate text-[11px] font-semibold text-background">
            {info.name}
          </span>
          <span className="shrink-0 text-[10.5px] font-medium text-background/75">
            {info.role}
          </span>
        </div>
      </div>
    );
  };

  if (userLoading || phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col gap-4 bg-background p-6">
        <Skeleton className="h-14 w-full rounded-2xl bg-muted" />
        <Skeleton className="aspect-video w-full rounded-2xl bg-muted" />
      </div>
    );
  }

  if (loadError || !appointment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <AlertTriangle className="size-7 text-destructive" />
        </div>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {loadError ?? t("Cita no encontrada.")}
        </p>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" /> {t("Volver")}
        </Button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <PhoneOff className="size-7 text-muted-foreground" />
        </div>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {endedReason ?? t("La sesión finalizó.")}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/appointments/citas/${appointment.id}`)}
          className="gap-1.5"
        >
          {t("Volver a la cita")}
        </Button>
      </div>
    );
  }

  // --- Pantalla previa / conexión ---

  if (phase === "ready" || phase === "connecting") {
    const statusAllowsJoin =
      appointment.status === "Confirmed" || appointment.status === "InProgress";
    // La ventana viene del detalle de la cita (settings efectivas del
    // backend); la sala diferida no hace falta para decidir el ingreso.
    const openAtIso = appointment?.roomOpensAt ?? null;
    const closeAtIso = appointment?.roomClosesAt ?? null;
    const openTime = openAtIso ? new Date(openAtIso).getTime() : null;
    const closeTime = closeAtIso ? new Date(closeAtIso).getTime() : null;
    const windowClosed =
      closeTime != null && !Number.isNaN(closeTime) && now >= closeTime;
    const windowNotOpen =
      !windowClosed &&
      openTime != null &&
      !Number.isNaN(openTime) &&
      now < openTime;
    const canJoin = statusAllowsJoin && !windowClosed && !windowNotOpen;
    const connecting = phase === "connecting";

    const appointmentCode = appointment.id.slice(0, 8).toUpperCase();
    const appointmentStatus = t(appointmentStatusLabel[appointment.status]);

    return (
      <div className="flex min-h-dvh flex-col bg-muted/20">
        <header className="shrink-0 border-b border-border bg-background/95 px-4 py-3.5 shadow-sm backdrop-blur sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <PhoneCall className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {t("Consulta virtual")}
                </p>
                <p className="truncate text-[13px] font-medium text-foreground">
                  {t("Citas")} · CoppAddresd
                </p>
              </div>
            </div>
            <StatusBadge
              status={appointmentStatus}
              color={appointmentStatusColor(appointment.status)}
            />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.85fr)] lg:gap-8">
            <main className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-primary/[0.04] px-5 py-8 sm:px-10 sm:py-10">
                <div className="flex items-start gap-4">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-8 ring-primary/[0.04]">
                    <User className="size-8 text-primary" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {t("Paciente")}
                    </p>
                    <h1 className="mt-1 line-clamp-2 break-words text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[28px] xl:text-[32px]">
                      {appointment.patientName ?? t("Paciente")}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Stethoscope className="size-3.5 text-primary" />
                        {appointment.specialtyName ?? t("Especialidad")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" />
                        {appointment.locationName ?? t("Sede")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoChip
                    icon={CalendarDays}
                    label={t("Fecha")}
                    value={formatDate(appointment.scheduledStart)}
                  />
                  <InfoChip
                    icon={Clock}
                    label={t("Horario")}
                    value={`${formatTime(appointment.scheduledStart)} – ${formatTime(appointment.scheduledEnd)}`}
                  />
                  <InfoChip
                    icon={Stethoscope}
                    label={t("Profesional")}
                    value={appointment.professionalName ?? t("Sin asignar")}
                  />
                  <InfoChip
                    icon={ShieldCheck}
                    label={t("Código de cita")}
                    value={appointmentCode}
                    mono
                  />
                </div>
              </div>

              <div className="px-5 py-5 sm:px-8 sm:py-6">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CircleCheck className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("Estado de la cita")}
                    </p>
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {appointmentStatus}
                    </p>
                  </div>
                  <span className="ml-auto size-2.5 shrink-0 rounded-full bg-primary" />
                </div>
              </div>
            </main>

            <aside className="flex flex-col gap-5">
              <section className="rounded-[1.75rem] border border-primary/20 bg-primary/[0.04] p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {t("Atención segura")}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">
                      {t("Acceso a la consulta")}
                    </h2>
                  </div>
                </div>

                {connectError && (
                  <p
                    className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive"
                    role="alert"
                  >
                    {connectError}
                  </p>
                )}

                {canJoin ? (
                  <div className="mt-5 flex flex-col gap-2">
                    <Button
                      size="lg"
                      onClick={join}
                      disabled={connecting}
                      className="h-12 gap-2 rounded-xl"
                    >
                      {connecting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PhoneCall className="size-4" />
                      )}
                      {connecting
                        ? t("Conectando…")
                        : isOwner && appointment.status === "Confirmed"
                          ? t("Iniciar consulta y unirme")
                          : t("Unirme a la consulta")}
                    </Button>
                    {connectError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={joinAudioOnly}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {t("Unirme solo con audio")}
                      </Button>
                    )}
                    <p className="pt-1 text-center text-[11.5px] leading-5 text-muted-foreground">
                      {t(
                        "Necesita cámara y micrófono. La sala abre poco antes del inicio y cierra unos minutos después del fin.",
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-5 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
                    <AlertTriangle className="size-5 text-amber-600" />
                    <p className="text-[13px] font-semibold text-foreground">
                      {windowClosed
                        ? t("La ventana de acceso a la sala ya terminó")
                        : windowNotOpen
                          ? t("La sala todavía no está abierta")
                          : t(
                              "La sala solo está disponible para citas confirmadas o en curso",
                            )}
                    </p>
                    <p className="text-[12px] leading-5 text-muted-foreground">
                      {windowClosed && closeAtIso
                        ? t("Cerró el {date}", {
                            date: formatDateTime(closeAtIso),
                          })
                        : windowNotOpen && openAtIso
                          ? t("Abre el {date}", {
                              date: formatDateTime(openAtIso),
                            })
                          : t("Estado actual: {status}", {
                              status: appointmentStatus,
                            })}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                    <ClipboardCheck className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-foreground">
                      {t("Preparación para la consulta")}
                    </h2>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      {t("Revisa tu equipo antes de entrar.")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col divide-y divide-border">
                  <ReadinessItem
                    icon={Video}
                    label={t("Cámara y micrófono")}
                    detail={t("Necesita cámara y micrófono.")}
                  />
                  <ReadinessItem
                    icon={ShieldCheck}
                    label={t("Consulta privada")}
                    detail={t(
                      "Tu información se mantiene protegida durante la consulta.",
                    )}
                  />
                </div>
              </section>
            </aside>
          </div>

        </div>

        <footer className="mt-auto shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              {t("Tu información se mantiene protegida durante la consulta.")}
            </p>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-1.5 px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> {t("Volver a la cita")}
            </Button>
          </div>
        </footer>
      </div>
    );
  }

  // --- Sala conectada ---

  return (
    <div className="flex h-dvh flex-col bg-muted/20 text-foreground">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-3 shadow-sm backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={leave}
            aria-label={t("Salir de la sala")}
            className="shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PhoneOff className="size-4" />
          </Button>
          <div className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary sm:flex">
            <ClipboardCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                {t("Consulta virtual")}
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span className="hidden text-[10.5px] font-medium text-muted-foreground sm:block">
                {t("Atención segura")}
              </span>
            </div>
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {appointment.patientName ?? t("Paciente")} · {appointment.specialtyName ?? t("Especialidad")}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {formatRange(appointment.scheduledStart, appointment.scheduledEnd)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 sm:flex">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[12px] font-semibold text-foreground">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">
              {totalTiles}
            </span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 sm:flex">
            <CircleCheck className="size-3.5" />
            {t("En curso")}
          </div>
          {backendRoomStatus && backendRoomStatus !== "Active" && (
            <StatusBadge
              status={
                sessionStatusLabel[
                  backendRoomStatus as keyof typeof sessionStatusLabel
                ]
                  ? t(
                      sessionStatusLabel[
                        backendRoomStatus as keyof typeof sessionStatusLabel
                      ],
                    )
                  : backendRoomStatus
              }
              color={
                backendRoomStatus === "Ended"
                  ? { bg: "#FCEBEC", text: "#B42318", dot: "#EF4444" }
                  : {
                      bg: readCssVar("--sidebar") || DEFAULT_ACCENT,
                      text: lightenHex(
                        readCssVar("--accent-color") || DEFAULT_ACCENT,
                        0.5,
                      ),
                      dot: lightenHex(
                        readCssVar("--accent-color") || DEFAULT_ACCENT,
                        0.35,
                      ),
                    }
              }
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setSidebarTab("participants");
              setSidebarOpen(true);
            }}
            aria-label={t("Abrir panel de participantes y formularios")}
            className="rounded-xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-5">
          {connectError && (
            <p
              className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive shadow-sm"
              role="alert"
            >
              {connectError}
            </p>
          )}

          <div
            className={`grid min-h-0 w-full flex-1 gap-2 rounded-[30px] border border-border/80 bg-card/80 p-2 shadow-[0_18px_50px_rgba(46,67,97,0.08)] sm:gap-3 sm:p-3 ${totalTiles >= 2 ? "auto-rows-fr grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
          >
            {renderTile({
              identity: LOCAL_IDENTITY,
              isLocal: true,
              connectedAt: joinedAt ?? new Date().toISOString(),
            })}
            {remoteTiles.map((tile) => renderTile(tile))}
          </div>

          {remoteTiles.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 shadow-sm">
              <Activity className="size-4 text-primary" />
              <p className="text-[12.5px] text-primary/80">
                {isProfessionalParticipant
                  ? t("Esperando que el paciente se conecte a la sala…")
                  : t("Esperando que el profesional se conecte a la sala…")}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[26px] border border-border/80 bg-card p-2.5 shadow-sm sm:p-3">
            {canManage && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSidebarTab("forms");
                  setSidebarOpen(true);
                }}
                aria-label={t("Abrir formularios médicos")}
                className="h-11 gap-1.5 rounded-full border border-border bg-background px-4 text-foreground shadow-sm hover:bg-muted"
              >
                <ClipboardList className="size-4" />
                <span className="hidden sm:inline">{t("Formularios")}</span>
              </Button>
            )}
            <ControlButton
              label={audioOn ? t("Silenciar") : t("Activar micrófono")}
              active={audioOn}
              onClick={toggleAudio}
            >
              {audioOn ? (
                <Mic className="size-5" />
              ) : (
                <MicOff className="size-5" />
              )}
            </ControlButton>
            <ControlButton
              label={videoOn ? t("Apagar cámara") : t("Encender cámara")}
              active={videoOn}
              onClick={toggleVideo}
            >
              {videoOn ? (
                <Video className="size-5" />
              ) : (
                <VideoOff className="size-5" />
              )}
            </ControlButton>
            {canManage && (
              <Button
                onClick={finalize}
                disabled={ending}
                className="h-11 rounded-full bg-destructive px-4 text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                {ending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PhoneOff className="size-4" />
                )}
                {t("Finalizar consulta")}
              </Button>
            )}
          </div>
        </main>

        {/* Spacer: empuja el escenario cuando el panel inferior está abierto. */}
        <div
          aria-hidden="true"
          className="shrink-0 transition-all duration-300 ease-out"
          style={{ height: sidebarOpen ? panelHeight : 0 }}
        />
      </div>

      <ConsultationPanel
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tab={sidebarTab}
        onTabChange={setSidebarTab}
        appointment={appointment}
        patientConnected={remoteTiles.length > 0}
        isProfessional={isProfessionalParticipant}
        canManage={canManage}
        localLabel={localLabel}
        remoteLabels={remoteTiles.map((tile) => ({
          ...nameFor(tile.identity, false),
          connectedAt: tile.connectedAt,
        }))}
        heightPx={panelHeight}
        onHeightChange={setPanelHeight}
      />
    </div>
  );
}

interface RoomTile {
  identity: string;
  isLocal: boolean;
  connectedAt: string;
}

/** Clave de localStorage con la altura elegida del panel de consulta. */
const PANEL_HEIGHT_STORAGE_KEY = "copp_sala_panel_height";

/** Convierte fechas ISO crudas que llegan dentro de mensajes del backend a formato local. */
function formatBackendMessage(message: string): string {
  return message.replace(
    /\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})/g,
    (match) => formatDateTime(match),
  );
}

/** Timeout para operaciones que dependen de permisos/red del navegador. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function InfoChip({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span
        className={`truncate text-[12.5px] font-semibold text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function ReadinessItem({
  icon: Icon,
  label,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-5 text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`size-11 rounded-full border-2 shadow-sm transition-transform hover:scale-[1.03] ${
        active
          ? "border-border bg-card text-foreground shadow-sm hover:bg-muted"
          : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
      }`}
    >
      {children}
    </Button>
  );
}
