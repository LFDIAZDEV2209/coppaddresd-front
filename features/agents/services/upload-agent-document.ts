import { getAccessToken, apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { KnowledgeBaseRequest } from "../types";

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

/**
 * Sube un documento de instrucciones (.md/.txt) a la knowledge base del
 * agente (creándola si no existe) y lo registra para indexación RAG.
 * Devuelve la KB + storageKey para vincularla a la config de la versión.
 */
export async function uploadInstructionsDocument(
  file: File,
  ctx: {
    agentId: string;
    agentName: string;
    findAgentBase: () => { id: string } | null;
    createAgentBase: (input: KnowledgeBaseRequest) => Promise<{ id: string } | void>;
    registerDocument: (kbId: string, input: {
      storageKey: string;
      fileName: string;
      contentType?: string | null;
      fileSizeBytes?: number | null;
    }) => Promise<void>;
  },
): Promise<{ knowledgeBaseId: string; storageKey: string; fileName: string }> {
  let kb = ctx.findAgentBase();
  if (!kb) {
    const created = await ctx.createAgentBase({
      name: `Instrucciones de ${ctx.agentName}`,
      description: "Instrucciones del agente cargadas como documento (RAG).",
      scope: "Agent",
      agentTypeId: ctx.agentId,
      status: "Activo",
    });
    // El hook refresca sus bases tras crear; se re-busca por nombre.
    kb = created ?? ctx.findAgentBase();
    if (!kb) {
      throw new Error("No se pudo crear la knowledge base de instrucciones.");
    }
  }
  const storageKey = `agents/docs/${kb.id}/${crypto.randomUUID()}-${file.name}`;
  await uploadDocumentToStorage(storageKey, file);
  await ctx.registerDocument(kb.id, {
    storageKey,
    fileName: file.name,
    contentType: file.type || "text/markdown",
    fileSizeBytes: file.size,
  });
  return { knowledgeBaseId: kb.id, storageKey, fileName: file.name };
}
