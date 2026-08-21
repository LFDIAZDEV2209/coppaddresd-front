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
  }

  interface RemoteTrack {
    kind: "audio" | "video" | "data";
    isEnabled: boolean;
    id: string;
    attach(element?: HTMLElement): HTMLElement;
    detach(): HTMLElement[];
  }

  interface Participant {
    sid: string;
    identity: string;
    state: string;
    tracks: Map<string, TrackPublication>;
    on(event: "trackSubscribed", listener: (track: RemoteTrack) => void): Participant;
    on(event: "trackUnsubscribed", listener: (track: RemoteTrack) => void): Participant;
    on(event: "trackPublicationFailed", listener: (track: RemoteTrack) => void): Participant;
  }

  interface TrackPublication {
    track: RemoteTrack | LocalTrack | null;
    isTrackEnabled: boolean;
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
  }

  interface LocalParticipant {
    identity: string;
    tracks: Map<string, TrackPublication>;
    on(event: "trackPublished", listener: (publication: TrackPublication) => void): LocalParticipant;
  }

  interface Video {
    connect(token: string, options?: ConnectOptions): Promise<Room>;
    isSupported: boolean;
  }
}