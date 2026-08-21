"use client";

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
  MapPin,
  CalendarDays,
  Loader2,
  PanelRight,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { useCurrentUser } from "../hooks/use-current-user";
import { loadTwilioVideo } from "@/lib/twilio/twilio-loader";
import {
  fetchAppointment,
  fetchJoinToken,
  fetchRoom,
  startSession,
  endSession,
} from "../services/telemedicine-service";
import { ClinicalEncounterPanel } from "./clinical-encounter-panel";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDateTime,
  formatRange,
  sessionStatusLabel,
} from "../utils/format";
import type { TelemedicineAppointmentDto } from "../types";

type Phase = "loading" | "ready" | "connecting" | "connected" | "ended";

const LOCAL_IDENTITY = "__local__";

/**
 * Sala virtual de Telemedicina: pantalla completa con video en vivo (SDK de
 * Twilio v2 cargado por CDN), controles de micrófono/cámara, lista de
 * participantes, encuentro clínico en el panel lateral y finalización de la
 * consulta por el profesional. La identidad en Twilio es el id del usuario del
 * JWT (ver GenerateAccessTokenAsync en el backend).
 */
export function VirtualRoom() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;
  const { user: session } = useAuth();
  const { context, loading: userLoading } = useCurrentUser();

  const [appointment, setAppointment] = useState<TelemedicineAppointmentDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [remoteTiles, setRemoteTiles] = useState<RoomTile[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [backendRoomStatus, setBackendRoomStatus] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [tracksVersion, setTracksVersion] = useState(0);

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
    (session?.permissions.includes("Telemedicine.SessionsManage") ?? false) || isOwner;

  const myIdentity = session?.id ?? null;
  const isProfessionalParticipant = isOwner;

  const nameFor = useCallback(
    (identity: string, isLocal: boolean): { name: string; role: string } => {
      if (isLocal || identity === myIdentity) {
        if (isProfessionalParticipant) return { name: "Tú", role: "Profesional" };
        if (context?.patient) return { name: "Tú", role: "Paciente" };
        return { name: "Tú", role: "Supervisor" };
      }
      if (isProfessionalParticipant) {
        return {
          name: appointment?.patientName ?? "Paciente",
          role: "Paciente",
        };
      }
      return {
        name: appointment?.professionalName ?? "Profesional",
        role: "Profesional",
      };
    },
    [appointment, context, isProfessionalParticipant, myIdentity],
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
        setLoadError("No se pudo cargar la cita. Verificá que el enlace sea válido.");
        setPhase("ended");
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  // --- Participantes remotos ---

  const addRemoteTile = useCallback((identity: string) => {
    setRemoteTiles((tiles) =>
      tiles.some((t) => t.identity === identity) ? tiles : [...tiles, { identity, isLocal: false }],
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
          attachRemoteTrack(participant.identity, publication.track as TwilioVideo.RemoteTrack);
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
          "La conexión con la sala tardó demasiado. Revisá que la cámara y el micrófono estén disponibles e intentá de nuevo.",
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
          setEndedReason("Te desconectaste de la sala o la conexión se interrumpió.");
        });

        setPhase("connected");
        setElapsed(0);
      } catch (error) {
        setPhase("ready");
        setConnectError(
          error instanceof Error
            ? formatBackendMessage(error.message)
            : "No se pudo conectar con la sala de video.",
        );
      }
    },
    [addRemoteTile, appointmentId, removeRemoteTile, watchParticipant],
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
      router.push(`/telemedicine/citas/${appointment.id}`);
    } catch {
      setConnectError("No se pudo finalizar la sesión. Intentá nuevamente.");
      setEnding(false);
    }
  }, [appointment, router]);

  const toggleAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const publications = Array.from(room.localParticipant.tracks.values());
    const track = publications.find((p) => p.track?.kind === "audio")?.track as
      | TwilioVideo.LocalTrack
      | undefined;
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
      | TwilioVideo.LocalTrack
      | undefined;
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
        if (track.kind !== "video" || attachedTracksRef.current.has(key)) return;
        attachedTracksRef.current.add(key);
        localContainer.appendChild(track.attach());
      });
    }

    remoteTracksRef.current.forEach((tracks, identity) => {
      const container = trackContainersRef.current.get(identity);
      if (!container) return;
      tracks.forEach((track) => {
        const key = `${identity}:${track.id}`;
        if (track.kind !== "video" || attachedTracksRef.current.has(key)) return;
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

  // --- Helpers de render ---

  const localLabel = useMemo(() => nameFor(myIdentity ?? "", true), [nameFor, myIdentity]);
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
    return (
      <div
        key={tile.identity}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
      >
        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
              <User className="size-8 text-slate-300" />
            </div>
            <p className="text-[12.5px] font-medium text-slate-400">
              {tile.isLocal ? "Tu cámara está apagada" : `Esperando a ${info.name.toLowerCase()}…`}
            </p>
          </div>
        )}
        <div
          ref={(el) => {
            const map = trackContainersRef.current;
            if (el) map.set(tile.identity, el);
            else map.delete(tile.identity);
          }}
          className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-slate-950/70 px-2.5 py-1 backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-semibold text-white">
            {info.name}
            {tile.isLocal ? " (tú)" : ""}
          </span>
          <span className="text-[10.5px] font-medium text-slate-300">· {info.role}</span>
        </div>
      </div>
    );
  };

  if (userLoading || phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col gap-4 bg-slate-950 p-6">
        <Skeleton className="h-14 w-full rounded-2xl bg-white/10" />
        <Skeleton className="aspect-video w-full rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (loadError || !appointment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
          <AlertTriangle className="size-7 text-rose-400" />
        </div>
        <p className="max-w-md text-center text-sm text-slate-300">
          {loadError ?? "Cita no encontrada."}
        </p>
        <Button variant="outline" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="size-4" /> Volver
        </Button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
          <PhoneOff className="size-7 text-slate-400" />
        </div>
        <p className="max-w-md text-center text-sm text-slate-300">
          {endedReason ?? "La sesión finalizó."}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/telemedicine/citas/${appointment.id}`)}
          className="gap-1.5"
        >
          Volver a la cita
        </Button>
      </div>
    );
  }

  // --- Pantalla previa / conexión ---

  if (phase === "ready" || phase === "connecting") {
    const canJoin =
      appointment.status === "Confirmed" || appointment.status === "InProgress";
    const connecting = phase === "connecting";

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/15">
                <PhoneCall className="size-5 text-teal-300" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">Sala virtual</p>
                <p className="text-[12px] text-slate-400">Telemedicina · CoppAddresd</p>
              </div>
            </div>
            <StatusBadge
              status={appointmentStatusLabel[appointment.status]}
              color={appointmentStatusColor(appointment.status)}
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15">
                  <User className="size-7 text-teal-300" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">
                    {appointment.patientName ?? "Paciente"}
                  </p>
                  <p className="truncate text-[12.5px] text-slate-400">
                    {appointment.specialtyName ?? "Especialidad"} ·{" "}
                    {appointment.locationName ?? "Sede"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoChip
                  icon={CalendarDays}
                  label="Horario"
                  value={formatRange(appointment.scheduledStart, appointment.scheduledEnd)}
                />
                <InfoChip
                  icon={Stethoscope}
                  label="Especialidad"
                  value={appointment.specialtyName ?? "—"}
                />
                <InfoChip icon={MapPin} label="Sede" value={appointment.locationName ?? "—"} />
              </div>

              {connectError && (
                <p
                  className="rounded-xl bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300"
                  role="alert"
                >
                  {connectError}
                </p>
              )}

              {canJoin ? (
                <div className="flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={join}
                    disabled={connecting}
                    className="gap-2 bg-teal-500 text-slate-950 hover:bg-teal-400"
                  >
                    {connecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PhoneCall className="size-4" />
                    )}
                    {connecting
                      ? "Conectando…"
                      : isOwner && appointment.status === "Confirmed"
                        ? "Iniciar consulta y unirme"
                        : "Unirme a la consulta"}
                  </Button>
                  {connectError && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={joinAudioOnly}
                      className="text-slate-300 hover:bg-white/5"
                    >
                      Unirme solo con audio
                    </Button>
                  )}
                  <p className="text-center text-[11.5px] text-slate-500">
                    Necesitás cámara y micrófono. La sala abre 10 minutos antes de la cita.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 px-4 py-4 text-center">
                  <AlertTriangle className="size-5 text-amber-300" />
                  <p className="text-[13px] font-medium text-slate-200">
                    La sala solo está disponible para citas confirmadas o en curso
                  </p>
                  <p className="text-[12px] text-slate-400">
                    Estado actual: {appointmentStatusLabel[appointment.status]}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mx-auto gap-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            <ArrowLeft className="size-4" /> Volver a la cita
          </Button>
        </div>
      </div>
    );
  }

  // --- Sala conectada ---

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={leave}
            aria-label="Salir de la sala"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <PhoneOff className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">
              {appointment.patientName ?? "Paciente"} ·{" "}
              {appointment.specialtyName ?? "Especialidad"}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {formatRange(appointment.scheduledStart, appointment.scheduledEnd)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 sm:flex">
            <Clock className="size-3.5 text-slate-300" />
            <span className="font-mono text-[12px] font-semibold text-white">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            <Users className="size-3.5 text-slate-300" />
            <span className="text-[12px] font-semibold text-white">{totalTiles}</span>
          </div>
          {backendRoomStatus && backendRoomStatus !== "Active" && (
            <StatusBadge
              status={
                sessionStatusLabel[
                  backendRoomStatus as keyof typeof sessionStatusLabel
                ] ?? backendRoomStatus
              }
              color={
                backendRoomStatus === "Ended"
                  ? { bg: "#3F1D24", text: "#FCA5A5", dot: "#EF4444" }
                  : { bg: "#1E2A4A", text: "#93C5FD", dot: "#3B82F6" }
              }
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Panel de participantes y notas"
            className="text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <PanelRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          {connectError && (
            <p
              className="rounded-xl bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300"
              role="alert"
            >
              {connectError}
            </p>
          )}

          <div
            className={`grid w-full gap-3 ${totalTiles >= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
          >
            {renderTile({ identity: LOCAL_IDENTITY, isLocal: true })}
            {remoteTiles.map((tile) => renderTile(tile))}
          </div>

          {remoteTiles.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-4">
              <Activity className="size-4 text-slate-500" />
              <p className="text-[12.5px] text-slate-400">
                Esperando que el paciente se conecte a la sala…
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pb-1">
            <ControlButton
              label={audioOn ? "Silenciar" : "Activar micrófono"}
              active={audioOn}
              onClick={toggleAudio}
            >
              {audioOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </ControlButton>
            <ControlButton
              label={videoOn ? "Apagar cámara" : "Encender cámara"}
              active={videoOn}
              onClick={toggleVideo}
            >
              {videoOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </ControlButton>
            {canManage && (
              <Button
                onClick={finalize}
                disabled={ending}
                className="ml-2 gap-1.5 bg-rose-600 text-white hover:bg-rose-500"
              >
                {ending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PhoneOff className="size-4" />
                )}
                Finalizar consulta
              </Button>
            )}
          </div>
        </main>

        <aside
          className={`${
            sidebarOpen
              ? "fixed inset-y-14 right-0 z-40 w-full max-w-sm border-l border-white/10"
              : "hidden"
          } min-w-0 shrink-0 overflow-y-auto bg-slate-900 lg:static lg:block lg:w-[380px] lg:border-l lg:border-white/10`}
        >
          <div className="flex flex-col gap-4 p-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-300">
                <Users className="size-3.5" /> Participantes
              </h3>
              <div className="flex flex-col gap-2">
                <ParticipantRow
                  name={localLabel.name}
                  role={localLabel.role}
                  isLocal
                  connected
                />
                {remoteTiles.length === 0 && (
                  <ParticipantRow
                    name={
                      isProfessionalParticipant
                        ? (appointment.patientName ?? "Paciente")
                        : (appointment.professionalName ?? "Profesional")
                    }
                    role={isProfessionalParticipant ? "Paciente" : "Profesional"}
                    connected={false}
                  />
                )}
                {remoteTiles.map((tile) => {
                  const info = nameFor(tile.identity, false);
                  return (
                    <ParticipantRow
                      key={tile.identity}
                      name={info.name}
                      role={info.role}
                      connected
                    />
                  );
                })}
              </div>
            </section>

            {canManage && (
              <div className="rounded-2xl border border-teal-400/20 bg-teal-400/10 p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-teal-200">
                  <ShieldCheck className="size-3.5" /> Sos el profesional de esta cita
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-teal-200/70">
                  Podés registrar el encuentro clínico durante la consulta y finalizarla
                  cuando termines.
                </p>
              </div>
            )}

            {canManage && <ClinicalEncounterPanel appointmentId={appointment.id} />}
          </div>
        </aside>
      </div>

      {sidebarOpen && (
        <button
          aria-label="Cerrar panel"
          className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

interface RoomTile {
  identity: string;
  isLocal: boolean;
}

/** Convierte fechas ISO crudas que llegan dentro de mensajes del backend a formato local. */
function formatBackendMessage(message: string): string {
  return message.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})/g, (match) =>
    formatDateTime(match),
  );
}

/** Timeout para operaciones que dependen de permisos/red del navegador. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-[12.5px] font-semibold text-white">{value}</span>
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
      className={`size-11 rounded-full border ${
        active
          ? "border-white/15 bg-white/10 text-white hover:bg-white/20"
          : "border-rose-400/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
      }`}
    >
      {children}
    </Button>
  );
}

function ParticipantRow({
  name,
  role,
  connected,
  isLocal,
}: {
  name: string;
  role: string;
  connected: boolean;
  isLocal?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20">
        <User className="size-4 text-teal-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-white">
          {name}
          {isLocal ? " (tú)" : ""}
        </p>
        <p className="text-[10.5px] text-slate-400">{role}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1 text-[10.5px] font-medium ${
          connected ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-600"}`}
        />
        {connected ? "Conectado" : "Esperando"}
      </span>
    </div>
  );
}