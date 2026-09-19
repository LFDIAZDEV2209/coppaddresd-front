"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Sonda previa de cámara y micrófono para el prejoin: disponibilidad
 * (enumerateDevices), permisos (permissions.query cuando existe) y una prueba
 * real de getUserMedia que detiene los tracks de inmediato para no retener
 * dispositivos. Los estados son accionables por dispositivo.
 */

export type MediaDeviceStatus =
  | "checking"
  | "ready"
  | "absent"
  | "denied"
  | "in-use"
  | "unsupported"
  | "insecure";

export interface MediaPreflightState {
  camera: MediaDeviceStatus;
  microphone: MediaDeviceStatus;
  checking: boolean;
  /** true solo cuando cámara y micrófono quedaron listos. */
  ready: boolean;
  /** true cuando hay micrófono utilizable aunque la cámara falle. */
  canJoinAudioOnly: boolean;
  /** Vuelve a correr la sonda (p. ej. tras cambiar permisos). */
  retry: () => void;
}

/** Traduce el error de getUserMedia a un estado accionable. */
export function classifyMediaError(error: unknown): MediaDeviceStatus {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "absent";
    case "NotReadableError":
    case "TrackStartError":
      return "in-use";
    case "OverconstrainedError":
      return "absent";
    default:
      return "denied";
  }
}

async function queryPermissionState(
  name: "camera" | "microphone",
): Promise<PermissionState | null> {
  try {
    if (!navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({
      name: name as PermissionName,
    });
    return status.state;
  } catch {
    // Safari y Firefox no soportan "camera"/"microphone" en permissions.
    return null;
  }
}

/** Prueba getUserMedia y detiene los tracks en el acto. */
async function probeDevice(
  constraints: MediaStreamConstraints,
): Promise<MediaDeviceStatus> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => track.stop());
    return "ready";
  } catch (error) {
    return classifyMediaError(error);
  }
}

export function useMediaPreflight(): MediaPreflightState {
  const [camera, setCamera] = useState<MediaDeviceStatus>("checking");
  const [microphone, setMicrophone] = useState<MediaDeviceStatus>("checking");
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const setBoth = (status: MediaDeviceStatus) => {
      if (cancelled) return;
      setCamera(status);
      setMicrophone(status);
    };

    const run = async () => {
      setBoth("checking");

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setBoth("unsupported");
        return;
      }
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setBoth("insecure");
        return;
      }

      // enumerateDevices es best-effort: calienta la lista de dispositivos y
      // permite detectar ausencias, pero antes de otorgar permisos puede no
      // listar nada; la sonda real decide el estado final.
      try {
        await navigator.mediaDevices.enumerateDevices();
      } catch {
        // Sin lista de dispositivos: se decide solo con la sonda.
      }

      const [cameraPermission, microphonePermission] = await Promise.all([
        queryPermissionState("camera"),
        queryPermissionState("microphone"),
      ]);

      const mic =
        microphonePermission === "denied"
          ? "denied"
          : await probeDevice({ audio: true });
      const cam =
        cameraPermission === "denied"
          ? "denied"
          : await probeDevice({ video: true });

      if (cancelled) return;
      setMicrophone(mic);
      setCamera(cam);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [round]);

  const retry = useCallback(() => setRound((value) => value + 1), []);

  const checking = camera === "checking" || microphone === "checking";

  return {
    camera,
    microphone,
    checking,
    ready: camera === "ready" && microphone === "ready",
    canJoinAudioOnly: microphone === "ready" && camera !== "ready",
    retry,
  };
}
