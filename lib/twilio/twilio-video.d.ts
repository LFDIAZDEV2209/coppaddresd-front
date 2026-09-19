/**
 * Tipos mínimos del SDK de Twilio Video v2 (cargado por CDN, ver
 * twilio-loader.ts). Declara únicamente la superficie que usa la sala virtual;
 * el resto del SDK queda fuera del contrato de tipos del proyecto.
 */

declare namespace TwilioVideo {
  interface ConnectOptions {
    name?: string | null;
    audio?: boolean | { deviceId?: string } | true;
    video?: boolean | { deviceId?: string } | true;
  }

  interface LocalTrack {
    kind: "audio" | "video" | "data";
    isEnabled: boolean;
    isTrackEnabled: boolean;
    id: string;
    enable(): void;
    disable(): void;
    stop(): void;
    attach(element?: HTMLElement): HTMLElement;
    detach(): HTMLElement[];
    on(event: "stopped", listener: () => void): LocalTrack;
    once(event: "stopped", listener: () => void): LocalTrack;
  }

  /** Track local de video (cámara o pantalla; la pantalla se llama "screen"). */
  interface LocalVideoTrack extends LocalTrack {
    kind: "video";
    name: string;
  }

  interface RemoteTrack {
    kind: "audio" | "video" | "data";
    isEnabled: boolean;
    id: string;
    name?: string;
    attach(element?: HTMLElement): HTMLElement;
    detach(): HTMLElement[];
  }

  interface Participant {
    sid: string;
    identity: string;
    state: string;
    tracks: Map<string, TrackPublication>;
    on(
      event: "trackSubscribed",
      listener: (track: RemoteTrack, publication: TrackPublication) => void,
    ): Participant;
    on(
      event: "trackUnsubscribed",
      listener: (track: RemoteTrack, publication: TrackPublication) => void,
    ): Participant;
    on(event: "trackPublicationFailed", listener: (track: RemoteTrack) => void): Participant;
  }

  interface TrackPublication {
    track: RemoteTrack | LocalTrack | null;
    isTrackEnabled: boolean;
    /** Nombre del track ("screen" identifica la pantalla compartida). */
    trackName?: string;
  }

  interface Room {
    name: string;
    sid: string;
    state: string;
    localParticipant: LocalParticipant;
    participants: Map<string, Participant>;
    disconnect(): void;
    on(event: "participantConnected", listener: (participant: Participant) => void): Room;
    on(event: "participantDisconnected", listener: (participant: Participant) => void): Room;
    on(event: "disconnected", listener: (room: Room, error?: Error) => void): Room;
    on(event: "reconnecting", listener: (error: Error) => void): Room;
    on(event: "reconnected", listener: () => void): Room;
    on(event: "trackUnpublished", listener: (publication: TrackPublication, participant: Participant) => void): Room;
  }

  interface LocalParticipant {
    identity: string;
    tracks: Map<string, TrackPublication>;
    publishTrack(
      track: LocalTrack,
      options?: { priority?: "low" | "medium" | "high" },
    ): Promise<TrackPublication>;
    unpublishTrack(track: LocalTrack): Promise<TrackPublication | undefined>;
    on(event: "trackPublished", listener: (publication: TrackPublication) => void): LocalParticipant;
    on(event: "trackUnpublished", listener: (publication: TrackPublication) => void): LocalParticipant;
  }

  interface Video {
    connect(token: string, options?: ConnectOptions): Promise<Room>;
    isSupported: boolean;
    /** Adquiere el track de pantalla compartida (nombre "screen"). */
    createLocalScreenTracks(options?: {
      audio?: boolean;
      video?: boolean;
    }): Promise<LocalVideoTrack[]>;
  }
}
