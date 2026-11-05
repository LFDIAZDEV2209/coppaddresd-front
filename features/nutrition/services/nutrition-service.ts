import { apiFetch, ApiError } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { NutritionAction, NutritionActionOptions, NutritionCycle, NutritionFood, NutritionPatientDetail, NutritionQueueQuery, NutritionServiceIssue, NutritionWorkspace } from "../types/nutrition";
import type { NutritionEventWire, NutritionFoodWire, NutritionPatientWire, NutritionQueueWire, NutritionViewWire } from "../types/nutrition-wire";
import { mapNutritionCycle, mapNutritionFoods, mapNutritionHistory, mapNutritionPatient, mapNutritionQueue, toNutritionEdit } from "../types/nutrition-mappers";

const ROOT = "/api/v1/nutrition";
const prescriptions = (patientId: string) => `${ROOT}/patients/${encodeURIComponent(patientId)}/prescriptions`;
export class NutritionRequestError extends Error {
  constructor(readonly issue: NutritionServiceIssue) { super("nutrition-request-failed"); }
}
export function nutritionIssue(error: unknown): NutritionServiceIssue {
  return error instanceof NutritionRequestError ? error.issue : { kind: "request", endpoint: ROOT, status: error instanceof ApiError ? error.status : 0 };
}

/** Cliente único: Bearer/refresh/clínica se mantienen en apiFetch. */
async function request<T, R>(path: string, init: RequestInit, map: (wire: T) => R): Promise<R> {
  const endpoint = `${init.method ?? "GET"} ${path.split("?")[0]}`;
  try {
    const wire = await apiFetch<T>(`${env.apiUrl}${path}`, { ...init, cache: "no-store", timeoutMs: init.method === "POST" ? 120_000 : 30_000 });
    try { return map(wire); }
    catch { throw new NutritionRequestError({ kind: "contract", endpoint, status: 502 }); }
  } catch (error) {
    if (error instanceof NutritionRequestError) throw error;
    const status = error instanceof ApiError ? error.status : 0;
    throw new NutritionRequestError({ kind: [404, 501, 503].includes(status) ? "endpoint" : [409, 412].includes(status) ? "conflict" : "request", endpoint, status });
  }
}

export function fetchNutritionQueue(query: NutritionQueueQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({ search: query.search, state: query.state, page: String(query.page), pageSize: String(query.pageSize) });
  // Pendiente de confirmar en backend: una sola proyección global, jamás N+1.
  return request<NutritionQueueWire, ReturnType<typeof mapNutritionQueue>>(`${ROOT}/patients?${params}`, { signal }, mapNutritionQueue);
}
export async function fetchNutritionPendingCount(signal?: AbortSignal) {
  const queue = await fetchNutritionQueue({ search: "", state: "en_aprobacion", page: 1, pageSize: 1 }, signal);
  return { count: queue.total };
}

export async function fetchNutritionWorkspace(patientId: string, signal: AbortSignal): Promise<NutritionWorkspace> {
  // Rutas agregadas de ficha y catálogo pendientes; ausencia => error visible.
  const path = `${ROOT}/patients/${encodeURIComponent(patientId)}`;
  const profile = await request<NutritionPatientWire, NutritionPatientWire>(path, { signal }, (wire) => {
    if (wire?.patientId !== patientId || !("prescriptionId" in wire) || !("publishedPrescriptionId" in wire)) throw new Error("nutrition-patient-contract");
    return wire;
  });
  const catalog = await request<NutritionFoodWire[], NutritionFood[]>(`${ROOT}/foods`, { signal }, mapNutritionFoods);
  const read = (id: string) => request<NutritionViewWire, { cycle: NutritionCycle; revision: number }>(`${prescriptions(patientId)}/${encodeURIComponent(id)}`, { signal }, (wire) => {
    if (wire?.patientId !== patientId) throw new Error("nutrition-patient-mismatch");
    return { cycle: mapNutritionCycle(wire, catalog), revision: wire.revision };
  });
  const current = profile.prescriptionId ? await read(profile.prescriptionId) : null;
  const published = profile.publishedPrescriptionId ? profile.publishedPrescriptionId === profile.prescriptionId ? current : await read(profile.publishedPrescriptionId) : null;
  let patient: NutritionPatientDetail;
  try { patient = mapNutritionPatient(profile, current?.cycle ?? null, published?.cycle ?? null, current?.revision ?? 0); }
  catch { throw new NutritionRequestError({ kind: "contract", endpoint: `GET ${path}`, status: 502 }); }
  if (patient.cycle) return { patient: await withHistory(patient, signal), catalog };
  return { patient, catalog };
}

async function withHistory(patient: NutritionPatientDetail, signal?: AbortSignal): Promise<NutritionPatientDetail> {
  if (!patient.cycle) return patient;
  const version = patient.cycle.version;
  try {
    const audit = await request<NutritionEventWire[], ReturnType<typeof mapNutritionHistory>>(`${prescriptions(patient.patientId)}/${encodeURIComponent(patient.cycle.id)}/history`, { signal }, (wire) => mapNutritionHistory(wire, version));
    return { ...patient, audit, auditIssue: null };
  } catch (error) {
    if (signal?.aborted) throw error;
    // Una lectura fallida nunca transforma una escritura confirmada en "fallida".
    return { ...patient, audit: [], auditIssue: nutritionIssue(error) };
  }
}

async function mutate(patient: NutritionPatientDetail, catalog: NutritionFood[], path: string, body: unknown, signal?: AbortSignal, identity?: NutritionCycle) {
  const result = await request<NutritionViewWire, { cycle: NutritionCycle; revision: number; published: boolean }>(path, { method: "POST", body: JSON.stringify(body), signal }, (wire) => {
    if (wire?.patientId !== patient.patientId) throw new Error("nutrition-patient-mismatch");
    return { cycle: mapNutritionCycle(wire, catalog, identity), revision: wire.revision, published: wire.isPublished };
  });
  const cycle = { ...result.cycle, patientTimeZone: patient.timeZone ?? patient.cycle?.patientTimeZone ?? "", publishedVersionId: result.published ? result.cycle.id : patient.publishedCycle?.id ?? null };
  const publishedCycle = result.published ? cycle : patient.publishedCycle;
  const updated = { ...patient, cycle, publishedCycle, revision: result.revision };
  window.dispatchEvent(new Event("nutrition-changed"));
  return withHistory(updated, signal);
}

export function saveNutritionDraft(patient: NutritionPatientDetail, cycle: NutritionCycle, previous: NutritionCycle, revision: number, catalog: NutritionFood[], signal?: AbortSignal) {
  return mutate(patient, catalog, `${prescriptions(patient.patientId)}/${encodeURIComponent(cycle.id)}/save`, { revision, edit: toNutritionEdit(cycle, previous) }, signal, cycle);
}

export function performNutritionAction(patient: NutritionPatientDetail, action: NutritionAction, revision: number, catalog: NutritionFood[], options: NutritionActionOptions = {}, signal?: AbortSignal) {
  const base = prescriptions(patient.patientId);
  if (action === "create") return mutate(patient, catalog, base, options.generate ?? {}, signal);
  if (!patient.cycle) throw new NutritionRequestError({ kind: "contract", endpoint: `POST ${base}`, status: 422 });
  const verb = action === "new-version" ? "create-version" : action;
  const body = { revision, ...(action === "approve" ? { criticalConfirmed: options.criticalConfirmed === true, comment: options.comment?.trim() || undefined } : {}), ...(action === "return" ? { comment: options.comment?.trim() } : {}), ...(action === "regenerate" ? { generate: options.generate ?? { preserveConfirmedEdits: true } } : {}) };
  // Actor y capacidades se resuelven en el backend desde JWT; no viajan en el cuerpo.
  return mutate(patient, catalog, `${base}/${encodeURIComponent(patient.cycle.id)}/${verb}`, body, signal);
}
