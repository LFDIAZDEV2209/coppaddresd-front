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
  ArrowLeft,
  AlertTriangle,
  Activity,
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
import { ConsultationPanel, PANEL_HEIGHT } from "./consultation-panel";
import type { ConsultationPanelTab } from "./consultation-panel";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatDateTime,
  formatRange,
  formatTime,
  sessionStatusLabel,
} from "../utils/format";
import type { AppointmentDto, VirtualRoomDto } from "../types";

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
  const [roomInfo, setRoomInfo] = useState<VirtualRoomDto | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
        : [...tiles, { identity, isLocal: false }],
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

  // --- Ventana de la sala en la pantalla previa ---
  // El backend crea la sala de forma diferida en el primer join-token; si aún
  // no existe, el 404 es esperado y la validación queda del lado del servidor.
  useEffect(() => {
    if (phase !== "ready" && phase !== "connecting") return;
    let active = true;
    (async () => {
      try {
        const room = await fetchRoom(appointmentId);
        if (active) setRoomInfo(room);
      } catch {
        // Sin sala todavía o sin red: no bloqueamos el ingreso.
      }
    })();
    return () => {
      active = false;
    };
  }, [phase, appointmentId]);

  useEffect(() => {
    if (phase !== "ready" && phase !== "connecting") return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [phase]);

  // --- Helpers de render ---

  const localLabel = useMemo(
    () => nameFor(myIdentity ?? "", true),
    [nameFor, myIdentity],
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
        className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl border border-border bg-muted"
      >
        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-full bg-background ring-4 ring-border">
              {initials ? (
                <span className="text-lg font-bold text-muted-foreground">
                  {initials}
                </span>
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
        <div
          ref={(el) => {
            const map = trackContainersRef.current;
            if (el) map.set(tile.identity, el);
            else map.delete(tile.identity);
          }}
          className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-foreground/70 px-2.5 py-1 backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-background">
            {info.name}
          </span>
          <span className="text-[10.5px] font-medium text-background/80">
            · {info.role}
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
    const openAtIso =
      roomInfo?.scheduledOpenAt ?? appointment?.roomOpensAt ?? null;
    const closeAtIso =
      roomInfo?.scheduledCloseAt ?? appointment?.roomClosesAt ?? null;
    const openTime = openAtIso ? new Date(openAtIso).getTime() : null;
    const closeTime = closeAtIso ? new Date(closeAtIso).getTime() : null;
    const roomEnded = roomInfo?.status === "Ended";
    const windowClosed =
      roomEnded ||
      (closeTime != null && !Number.isNaN(closeTime) && now >= closeTime);
    const windowNotOpen =
      !windowClosed &&
      openTime != null &&
      !Number.isNaN(openTime) &&
      now < openTime;
    const canJoin = statusAllowsJoin && !windowClosed && !windowNotOpen;
    const connecting = phase === "connecting";

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_55%)]" />
        <div className="relative flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <PhoneCall className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  {t("Sala virtual")}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t("Citas")} · CoppAddresd
                </p>
              </div>
            </div>
            <StatusBadge
              status={t(appointmentStatusLabel[appointment.status])}
              color={appointmentStatusColor(appointment.status)}
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <User className="size-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words text-lg font-semibold text-foreground">
                    {appointment.patientName ?? t("Paciente")}
                  </p>
                  <p className="truncate text-[12.5px] text-muted-foreground">
                    {appointment.specialtyName ?? t("Especialidad")} ·{" "}
                    {appointment.locationName ?? t("Sede")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoChip
                  icon={CalendarDays}
                  label={t("Horario")}
                  value={`${formatTime(appointment.scheduledStart)} – ${formatTime(appointment.scheduledEnd)}`}
                />
                <InfoChip
                  icon={Stethoscope}
                  label={t("Código de cita")}
                  value={appointment.id.slice(0, 8).toUpperCase()}
                  mono
                />
              </div>

              {connectError && (
                <p
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive"
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
                    className="gap-2"
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
                  <p className="text-center text-[11.5px] text-muted-foreground">
                    {t(
                      "Necesita cámara y micrófono. La sala abre poco antes del inicio y cierra unos minutos después del fin.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 px-4 py-4 text-center">
                  <AlertTriangle className="size-5 text-amber-600" />
                  <p className="text-[13px] font-medium text-foreground">
                    {roomEnded
                      ? t("Esta sala ya finalizó")
                      : windowClosed
                        ? t("La ventana de acceso a la sala ya terminó")
                        : windowNotOpen
                          ? t("La sala todavía no está abierta")
                          : t(
                              "La sala solo está disponible para citas confirmadas o en curso",
                            )}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {roomEnded
                      ? t("Estado actual: {status}", {
                          status: t(appointmentStatusLabel[appointment.status]),
                        })
                      : windowClosed && closeAtIso
                        ? t("Cerró el {date}", {
                            date: formatDateTime(closeAtIso),
                          })
                        : windowNotOpen && openAtIso
                          ? t("Abre el {date}", {
                              date: formatDateTime(openAtIso),
                            })
                          : t("Estado actual: {status}", {
                              status: t(
                                appointmentStatusLabel[appointment.status],
                              ),
                            })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mx-auto gap-1.5 px-5 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {t("Volver a la cita")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Sala conectada ---

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={leave}
            aria-label={t("Salir de la sala")}
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PhoneOff className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              {appointment.patientName ?? t("Paciente")} ·{" "}
              {appointment.specialtyName ?? t("Especialidad")}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {formatRange(
                appointment.scheduledStart,
                appointment.scheduledEnd,
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 sm:flex">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[12px] font-semibold text-foreground">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">
              {totalTiles}
            </span>
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
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          {connectError && (
            <p
              className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive"
              role="alert"
            >
              {connectError}
            </p>
          )}

          <div
            className={`grid min-h-0 w-full flex-1 gap-3 ${totalTiles >= 2 ? "auto-rows-fr grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
          >
            {renderTile({ identity: LOCAL_IDENTITY, isLocal: true })}
            {remoteTiles.map((tile) => renderTile(tile))}
          </div>

          {remoteTiles.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4">
              <Activity className="size-4 text-muted-foreground" />
              <p className="text-[12.5px] text-muted-foreground">
                {isProfessionalParticipant
                  ? t("Esperando que el paciente se conecte a la sala…")
                  : t("Esperando que el profesional se conecte a la sala…")}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pb-1">
            {canManage && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSidebarTab("forms");
                  setSidebarOpen(true);
                }}
                aria-label={t("Abrir formularios médicos")}
                className="gap-1.5 border border-border bg-card text-foreground hover:bg-muted"
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
                className="ml-2 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          className={`shrink-0 transition-all duration-300 ease-out ${
            sidebarOpen ? PANEL_HEIGHT : "h-0"
          }`}
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
        remoteLabels={remoteTiles.map((tile) => nameFor(tile.identity, false))}
      />
    </div>
  );
}

interface RoomTile {
  identity: string;
  isLocal: boolean;
}

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
      className={`size-11 rounded-full border-2 ${
        active
          ? "border-border bg-card text-foreground shadow-sm hover:bg-muted"
          : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
      }`}
    >
      {children}
    </Button>
  );
}
