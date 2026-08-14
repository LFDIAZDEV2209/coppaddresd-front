import { getAccessToken, apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";

/**
 * Sube el documento al storage (PUT /api/v1/storage/{key}) y devuelve la
 * metadata que el backend necesita para registrarlo en la knowledge base.
 * El backend dispara la indexación (chunking + embeddings) al registrarlo.
 */
export async function uploadDocumentToStorage(
  storageKey: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const token = getAccessToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${env.apiUrl}/api/v1/storage/${encodeURIComponent(storageKey)}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
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
        reject(new Error(`No se pudo subir el archivo (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo."));
    xhr.send(file);
  });
}

export async function getDocumentDownloadUrl(storageKey: string): Promise<string> {
  const data = await apiFetch<{ url: string }>(
    `${env.apiUrl}/api/v1/storage/sign?key=${encodeURIComponent(storageKey)}`,
  );
  return data.url;
}
