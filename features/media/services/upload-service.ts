import { getAccessToken } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { MediaItem } from "../types";

export interface UploadIntentResponse {
  storageKey: string;
  presignedUrl: string;
  expiresInSeconds: number;
}

export interface DetectedMediaMetadata {
  mediaType: MediaItem["mediaType"];
  contentType: string;
  fileSizeBytes: number;
  durationSecs: number | null;
}

/**
 * Pide al back una clave determinística + URL firmada para subir el archivo.
 * Con el proveedor Local la URL apunta a PUT /api/v1/storage/{key}; con S3
 * será un presigned URL real del bucket. El front no distingue.
 *
 * purpose: "content" (default) sube audio/video a su carpeta; "thumbnail"
 * sube la imagen de portada a media/thumbnails/.
 */
export async function requestUploadIntent(
  fileName: string,
  contentType: string,
  purpose: "content" | "thumbnail" = "content",
): Promise<UploadIntentResponse> {
  const token = getAccessToken();
  const response = await fetch(`${env.apiUrl}/api/v1/media/upload-intent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fileName, contentType, purpose }),
  });

  if (!response.ok) throw new Error("No se pudo iniciar la subida del archivo.");
  return (await response.json()) as UploadIntentResponse;
}

/**
 * Sube el archivo directo al presignedUrl (PUT) con barra de progreso.
 * onProgress recibe 0..100. El Bearer token solo se adjunta cuando la URL
 * apunta al backend (proveedor Local); con S3 la URL es del bucket y el
 * presigned URL ya la autoriza (un header Authorization rompería la firma).
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);

    const isBackendTarget = isSameOrigin(presignedUrl, env.apiUrl);
    const token = getAccessToken();
    if (isBackendTarget && token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`La subida falló (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo."));
    xhr.send(file);
  });
}

/** true si la URL comparte origen con la API del backend (mismo host). */
function isSameOrigin(url: string, base: string): boolean {
  try {
    return new URL(url).host === new URL(base).host;
  } catch {
    return false;
  }
}

const MIME_TO_TYPE: Record<string, MediaItem["mediaType"]> = {
  "audio/mpeg": "Podcast",
  "audio/mp3": "Podcast",
  "audio/ogg": "Podcast",
  "audio/wav": "Audio",
  "audio/mp4": "Audio",
  "audio/aac": "Audio",
  "audio/webm": "Audio",
  "video/mp4": "Video",
  "video/webm": "Video",
  "video/ogg": "Video",
  "video/quicktime": "Video",
};

function mediaTypeFromContentType(contentType: string): MediaItem["mediaType"] {
  if (contentType.startsWith("video/")) return "Video";
  if (contentType === "audio/mpeg" || contentType === "audio/mp3" || contentType === "audio/ogg")
    return "Podcast";
  return MIME_TO_TYPE[contentType] ?? "Podcast";
}

/**
 * Lee la metadata del archivo seleccionado: tipo (por MIME), tamaño (file.size)
 * y duración (elemento HTML5 audio/video). El usuario no tipea nada de esto.
 */
export async function detectMediaMetadata(
  file: File,
): Promise<DetectedMediaMetadata> {
  const contentType = file.type || "application/octet-stream";
  const mediaType = mediaTypeFromContentType(contentType);

  let durationSecs: number | null = null;
  const isAudio = contentType.startsWith("audio/");
  const isVideo = contentType.startsWith("video/");

  if (isAudio || isVideo) {
    try {
      durationSecs = await readMediaDuration(file, isVideo);
    } catch {
      durationSecs = null;
    }
  }

  return {
    mediaType,
    contentType,
    fileSizeBytes: file.size,
    durationSecs,
  };
}

function readMediaDuration(file: File, isVideo: boolean): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = isVideo
      ? document.createElement("video")
      : document.createElement("audio");
    element.preload = "metadata";

    const cleanup = () => URL.revokeObjectURL(url);

    element.onloadedmetadata = () => {
      const duration = element.duration;
      cleanup();
      resolve(Number.isFinite(duration) ? Math.round(duration) : 0);
    };
    element.onerror = () => {
      cleanup();
      reject(new Error("No se pudo leer la duración del archivo."));
    };
    element.src = url;
  });
}
