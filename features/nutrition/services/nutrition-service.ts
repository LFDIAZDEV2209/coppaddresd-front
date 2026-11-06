import { apiFetch, ApiError } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { NutritionAction, NutritionActionOptions, NutritionCycle, NutritionFood, NutritionPatientDetail, NutritionQueueQuery, NutritionServiceIssue, NutritionWorkspace } from "../types/nutrition";
import type { NutritionEventWire, NutritionFoodWire, NutritionIdentityWire, NutritionQueueWire, NutritionViewWire } from "../types/nutrition-wire";
import { mapNutritionCycle, mapNutritionFoods, mapNutritionHistory, mapNutritionIdentity, mapNutritionPatient, mapNutritionQueue, toNutritionEdit } from "../types/nutrition-mappers";

const ROOT = "/api/v1/nutrition";
const prescriptions = (patientId: string) => `${ROOT}/patients/${encodeURIComponent(patientId)}/prescriptions`;
export class NutritionRequestError extends Error {
  constructor(readonly issue: NutritionServiceIssue) { super("nutrition-request-failed"); }
}
export function nutritionIssue(error: unknown): NutritionServiceIssue {
  return error instanceof NutritionRequestError ? error.issue : { kind: "request", endpoint: ROOT, status: error instanceof ApiError ? error.status : 0, detail: error instanceof ApiError ? error.message : undefined };
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
    throw new NutritionRequestError({ kind: [404, 501, 503].includes(status) ? "endpoint" : [409, 412].includes(status) ? "conflict" : "request", endpoint, status, detail: error instanceof ApiError ? error.message : undefined });
  }
}

function fetchNutritionPage(query: NutritionQueueQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.state !== "all") params.set("state", query.state);
  // Una proyección de pacientes por página, nunca detalle por tarjeta.
  return request<NutritionQueueWire, ReturnType<typeof mapNutritionQueue>>(`${ROOT}/inbox?${params}`, { signal }, (wire) => mapNutritionQueue(wire, query.state));
}
export async function fetchNutritionQueue(query: NutritionQueueQuery, signal?: AbortSignal) {
  const filters: NutritionQueueQuery["state"][] = ["all", "borrador_ia", "en_aprobacion", "aprobado", "devuelto", "por_renovar", "sin_plan"];
  // El contrato no incluye counts. Lote fijo de agregados, independiente del
  // número de pacientes; comparte búsqueda/alcance/cancelación con la página.
  const [page, ...counts] = await Promise.all([
    fetchNutritionPage(query, signal),
    ...filters.filter((state) => state !== query.state).map(async (state) => ({ state, total: (await fetchNutritionPage({ ...query, state, page: 1, pageSize: 1 }, signal)).total })),
  ] as const);
  for (const count of counts) page.counts[count.state] = count.total;
  return page;
}
export async function fetchNutritionPendingCount(signal?: AbortSignal) {
  const queue = await fetchNutritionPage({ search: "", state: "en_aprobacion", page: 1, pageSize: 1 }, signal);
  return { count: queue.total };
}

export async function fetchNutritionWorkspace(patientId: string, signal: AbortSignal, prescriptionId?: string): Promise<NutritionWorkspace> {
  // CONTRACT §4/§5: cabeceras de UN paciente, luego detalle con id explícito.
  // No existe GET /nutrition/patients/{id} ni alias current. No se usa para la bandeja.
  const path = prescriptions(patientId);
  const headers = await request<NutritionViewWire[], NutritionViewWire[]>(`${path}?page=1&pageSize=100`, { signal }, (wire) => {
    if (!Array.isArray(wire) || wire.some((row) => row?.patientId !== patientId || typeof row.id !== "string" || typeof row.cycleId !== "string" || !Number.isInteger(row.revision) || row.revision < 1 || typeof row.isPublished !== "boolean")) throw new Error("nutrition-list-contract");
    // La API no incluye total; no asumir que una página llena es el historial entero.
    if (wire.length === 100) throw new Error("nutrition-history-pagination-required");
    return wire;
  });
  const catalog = await request<NutritionFoodWire[], NutritionFood[]>(`${ROOT}/foods`, { signal }, mapNutritionFoods);
  let identityIssue: NutritionServiceIssue | undefined;
  const identity = await request<NutritionIdentityWire, NutritionIdentityWire>(`/api/v1/patients/${encodeURIComponent(patientId)}`, { signal }, (wire) => {
    if (wire?.id !== patientId) throw new Error("patient-identity-contract");
    return wire;
  }).catch((error) => {
    // Demografía opcional: Nutrition.* no concede Patients.View. No inventar datos.
    if (![403, 404].includes(nutritionIssue(error).status)) throw error;
    identityIssue = nutritionIssue(error);
    return null;
  });
  const read = (id: string) => request<NutritionViewWire, { cycle: NutritionCycle; revision: number }>(`${prescriptions(patientId)}/${encodeURIComponent(id)}`, { signal }, (wire) => {
    if (wire?.patientId !== patientId || wire.id !== id) throw new Error("nutrition-patient-mismatch");
    return { cycle: mapNutritionCycle(wire, catalog), revision: wire.revision };
  });
  const head = prescriptionId ? headers.find((row) => row.id === prescriptionId) ?? null : headers[0] ?? null;
  if (prescriptionId && !head) throw new NutritionRequestError({ kind: "endpoint", endpoint: `GET ${path}/${encodeURIComponent(prescriptionId)}`, status: 404 });
  const publishedHead = head ? headers.find((row) => row.isPublished && row.cycleId === head.cycleId) ?? null : null;
  const current = head ? await read(head.id) : null;
  const published = publishedHead ? publishedHead.id === head?.id ? current : await read(publishedHead.id) : null;
  let patient: NutritionPatientDetail;
  try { patient = { ...mapNutritionPatient(mapNutritionIdentity(patientId, identity, head, publishedHead), current?.cycle ?? null, published?.cycle ?? null, current?.revision ?? 0), identityIssue }; }
  catch { throw new NutritionRequestError({ kind: "contract", endpoint: `GET ${path}`, status: 502 }); }
  patient.cycleHeaders = headers.map((row) => {
    if (!row.targets || ![row.targets.k, row.targets.c, row.targets.p, row.targets.f].every(Number.isFinite)) throw new NutritionRequestError({ kind: "contract", endpoint: `GET ${path}`, status: 502 });
    return { id: row.id, cycleId: row.cycleId, version: row.version, state: row.state, isPublished: row.isPublished, startDate: row.startDate, endDate: row.endDate, targets: { kcal: row.targets.k, carbsG: row.targets.c, proteinG: row.targets.p, fatG: row.targets.f } };
  });
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
  const result = await request<NutritionViewWire, { cycle: NutritionCycle; revision: number; published: boolean; cycleId: string }>(path, { method: "POST", body: JSON.stringify(body), signal }, (wire) => {
    if (wire?.patientId !== patient.patientId) throw new Error("nutrition-patient-mismatch");
    return { cycle: mapNutritionCycle(wire, catalog, identity), revision: wire.revision, published: wire.isPublished, cycleId: wire.cycleId };
  });
  const cycle = { ...result.cycle, patientTimeZone: patient.timeZone ?? patient.cycle?.patientTimeZone ?? "", publishedVersionId: result.published ? result.cycle.id : patient.publishedCycle?.id ?? null };
  const publishedCycle = result.published ? cycle : patient.publishedCycle;
  const cycleHeaders = [{ id: cycle.id, cycleId: result.cycleId, version: cycle.version, state: cycle.state, isPublished: result.published, startDate: cycle.startDate, endDate: cycle.endDate, targets: cycle.targets }, ...(patient.cycleHeaders ?? []).filter((header) => header.id !== cycle.id)];
  const updated = { ...patient, cycle, publishedCycle, cycleHeaders, revision: result.revision };
  const url = new URL(window.location.href);
  if (url.pathname === `/nutrition/${encodeURIComponent(patient.patientId)}`) {
    url.searchParams.set("prescriptionId", cycle.id);
    window.history.replaceState(null, "", url);
  }
  window.dispatchEvent(new Event("nutrition-changed"));
  return withHistory(updated, signal);
}

export function saveNutritionDraft(patient: NutritionPatientDetail, cycle: NutritionCycle, previous: NutritionCycle, revision: number, catalog: NutritionFood[], signal?: AbortSignal) {
  if (!Number.isInteger(revision) || revision < 1) throw new NutritionRequestError({ kind: "contract", endpoint: `POST ${prescriptions(patient.patientId)}/${encodeURIComponent(cycle.id)}/save`, status: 422 });
  return mutate(patient, catalog, `${prescriptions(patient.patientId)}/${encodeURIComponent(cycle.id)}/save`, { revision, edit: toNutritionEdit(cycle, previous) }, signal, cycle);
}

export function performNutritionAction(patient: NutritionPatientDetail, action: NutritionAction, revision: number, catalog: NutritionFood[], options: NutritionActionOptions = {}, signal?: AbortSignal) {
  const base = prescriptions(patient.patientId);
  if (action === "create") return mutate(patient, catalog, base, options.generate ?? {}, signal);
  if (!patient.cycle) throw new NutritionRequestError({ kind: "contract", endpoint: `POST ${base}`, status: 422 });
  const verb = action === "new-version" ? "create-version" : action;
  if (!Number.isInteger(revision) || revision < 1 || action === "apply-day" && (!Number.isInteger(options.sourceDay) || options.sourceDay! < 1 || options.sourceDay! > 30)) throw new NutritionRequestError({ kind: "contract", endpoint: `POST ${base}/${patient.cycle.id}/${verb}`, status: 422 });
  const body = { revision, ...(action === "apply-day" ? { edit: { sourceDay: options.sourceDay, confirmManualEdits: true } } : {}), ...(action === "approve" ? { criticalConfirmed: options.criticalConfirmed === true, ...(options.startDate ? { startDate: options.startDate } : {}) } : {}), ...(action === "return" ? { comment: options.comment?.trim() } : {}), ...(action === "regenerate" ? { generate: options.generate ?? { preserveConfirmedEdits: true } } : {}) };
  // Comment pertenece al request común (§3); conservar la nota opcional de revisión.
  if (action === "approve" && options.comment?.trim()) Object.assign(body, { comment: options.comment.trim() });
  // Actor y capacidades se resuelven en el backend desde JWT; no viajan en el cuerpo.
  return mutate(patient, catalog, `${base}/${encodeURIComponent(patient.cycle.id)}/${verb}`, body, signal);
}
// GET /api/v1/me/nutrition-plan: DTO móvil congelado; solo referencia CONTRACT §14.
// El ERP no lo consume ni lo utiliza como alias de la ficha profesional.
