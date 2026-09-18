import { apiFetch, getAccessToken } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { MediaInput, MediaItem } from "../types";

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
 * Pide al backend una clave determinística + URL firmada para subir el archivo.
 * Con el proveedor Local la URL apunta a PUT /api/v1/storage/{key} (con firma HMAC);
 * con S3 será un presigned URL real del bucket de AWS. El front consume el mismo contrato.
 *
 * purpose: "content" (default) sube audio/video a su carpeta; "thumbnail"
 * sube la imagen de portada a media/thumbnails/.
 */
export async function requestUploadIntent(
  fileName: string,
  contentType: string,
  purpose: "content" | "thumbnail" = "content",
): Promise<UploadIntentResponse> {
  return apiFetch<UploadIntentResponse>(`${env.apiUrl}/api/v1/media/upload-intent`, {
    method: "POST",
    body: JSON.stringify({ fileName, contentType, purpose }),
  });
}

/**
 * Sube el archivo directo al presignedUrl (PUT) con barra de progreso.
 * onProgress recibe 0..100.
 *
 * Estrategia de autorización:
 * - Si el destino es AWS S3 (o almacenamiento en nube externo con firma en query params),
 *   NO se adjunta el header Authorization: Bearer, ya que S3 SigV4 lo rechaza si no fue firmado.
 * - Si el destino es un endpoint del backend o gateway (localhost, IP local, proxy interno, o /api/v1/storage/),
 *   se adjunta Authorization: Bearer ${token} si está disponible.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);

    if (shouldAttachAuthToken(presignedUrl, env.apiUrl)) {
      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
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

/**
 * Sube archivo de contenido y miniatura (si existen) y devuelve el input con
 * las claves de storage definitivas. Compartido por la creación (/media/new)
 * y la edición (modal): misma lógica, sin duplicar.
 */
export async function resolveStorageKeys(
  input: MediaInput,
  file?: File,
  thumbnailFile?: File | null,
  onProgress?: (percent: number) => void,
): Promise<MediaInput> {
  let storageKey = input.storageKey;
  let thumbnailKey = input.thumbnailKey ?? null;

  if (file) {
    onProgress?.(1);
    const intent = await requestUploadIntent(
      file.name,
      input.contentType ?? "application/octet-stream",
    );
    onProgress?.(3);
    await uploadToPresignedUrl(intent.presignedUrl, file, onProgress);
    storageKey = intent.storageKey;
  }

  // Miniatura: si hay archivo nuevo se sube a storage y la metadata apunta
  // a la clave nueva; si no, se conserva lo que trae el input (null si se
  // quitó). El objeto viejo lo limpia el back al detectar el cambio de clave.
  if (thumbnailFile) {
    const thumbIntent = await requestUploadIntent(
      thumbnailFile.name,
      thumbnailFile.type,
      "thumbnail",
    );
    await uploadToPresignedUrl(thumbIntent.presignedUrl, thumbnailFile);
    thumbnailKey = thumbIntent.storageKey;
  }

  return { ...input, storageKey, thumbnailKey };
}

/**
 * Determina si la URL de subida es un destino interno del backend/gateway
 * que admite o requiere el header Bearer, o si es un bucket S3 de AWS.
 */
function shouldAttachAuthToken(url: string, baseApiUrl: string): boolean {
  try {
    const parsedUrl = new URL(url, baseApiUrl);
    const host = parsedUrl.hostname.toLowerCase();

    // Si es un bucket S3 de AWS o almacenamiento externo de nube con AWS SigV4:
    const isAwsS3 =
      host.endsWith(".amazonaws.com") ||
      parsedUrl.searchParams.has("X-Amz-Signature") ||
      parsedUrl.searchParams.has("AWSAccessKeyId") ||
      parsedUrl.searchParams.has("x-amz-signature");

    if (isAwsS3) {
      return false;
    }

    // Si es localhost, IP loopback, comparte origen con env.apiUrl o apunta a /api/v1/storage/
    const baseHost = new URL(baseApiUrl).hostname.toLowerCase();
    const isLocalOrInternal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === baseHost ||
      parsedUrl.pathname.includes("/api/v1/storage/");

    return isLocalOrInternal;
  } catch {
    // Si la URL es relativa, es una ruta interna del backend
    return url.startsWith("/");
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
