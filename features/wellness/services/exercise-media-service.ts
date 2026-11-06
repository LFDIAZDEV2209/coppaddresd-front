import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { MediaItem } from "@/features/media/types";

export interface ExerciseMediaCandidate {
  id: number; exerciseId: number; kind: "Video" | "Image"; title: string;
  author: string; sourceUrl: string; licenseName: string; licenseUrl: string; previewUrl?: string | null;
}
export interface ExerciseMediaPage { items: ExerciseMediaCandidate[]; page: number; hasMore: boolean }
const path = `${env.apiUrl}/api/v1/wellness/exercise-media/wger`;
export const searchExerciseMedia = (search: string, page: number, signal: AbortSignal) =>
  apiFetch<ExerciseMediaPage>(`${path}?search=${encodeURIComponent(search)}&page=${page}`, { signal });
interface ImportStatus { jobId: string; status: "queued" | "processing" | "completed" | "failed"; media?: MediaItem | null; error?: string | null }
export async function importExerciseMedia(item: ExerciseMediaCandidate, signal: AbortSignal): Promise<MediaItem> {
  let job = await apiFetch<ImportStatus>(`${path}/import`, { method: "POST", body: JSON.stringify({ id: item.id, kind: item.kind }), signal });
  const deadline = Date.now() + 6 * 60_000;
  while (job.status !== "completed" && job.status !== "failed") {
    if (Date.now() > deadline) throw new Error("La copia sigue preparándose. Revisa Mis archivos en unos minutos.");
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1500);
      if (signal.aborted) abort(); else signal.addEventListener("abort", abort, {once: true});
    });
    job = await apiFetch<ImportStatus>(`${path}/imports/${job.jobId}`, { signal });
  }
  if (job.status === "failed" || !job.media) throw new Error(job.error || "No se pudo preparar la demostración.");
  return job.media;
}

/** No acepta sufijos de dominio, credenciales, puertos ni HTML arbitrario. */
export function canonicalYouTubeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    let id: string | null = null;
    if (url.hostname === "youtu.be" && parts.length === 1) id = parts[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (parts.length === 2 && ["embed", "shorts", "live"].includes(parts[0])) id = parts[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

export async function uploadExerciseMedia(file: File, title: string): Promise<MediaItem> {
  const body = new FormData(); body.append("file", file); body.append("title", title);
  return apiFetch<MediaItem>(`${env.apiUrl}/api/v1/wellness/exercise-media/uploads`, {
    method: "POST", body, timeoutMs: 120_000,
  });
}
