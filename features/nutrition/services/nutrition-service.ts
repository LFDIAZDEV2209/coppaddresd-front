import { apiFetch, ApiError } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  NutritionAction,
  NutritionActionOptions,
  NutritionCycle,
  NutritionFood,
  NutritionPatientDetail,
  NutritionQueueQuery,
  NutritionServiceIssue,
  NutritionWorkspace,
  NutritionCurrentSummary,
} from "../types/nutrition";
import type {
  NutritionEventWire,
  NutritionFoodWire,
  NutritionQueueWire,
  NutritionViewWire,
  NutritionWorkspaceWire,
} from "../types/nutrition-wire";
import {
  mapNutritionCycle,
  mapNutritionFoods,
  mapNutritionHistory,
  mapNutritionQueue,
  mapNutritionWorkspaceIdentity,
  toNutritionEdit,
} from "../types/nutrition-mappers";

const ROOT = "/api/v1/nutrition";
const prescriptions = (patientId: string) =>
  `${ROOT}/patients/${encodeURIComponent(patientId)}/prescriptions`;
export class NutritionRequestError extends Error {
  constructor(readonly issue: NutritionServiceIssue) {
    super("nutrition-request-failed");
  }
}
export function nutritionIssue(error: unknown): NutritionServiceIssue {
  return error instanceof NutritionRequestError
    ? error.issue
    : {
        kind: "request",
        endpoint: ROOT,
        status: error instanceof ApiError ? error.status : 0,
        detail: error instanceof ApiError ? error.message : undefined,
      };
}

/** Cliente único: Bearer/refresh/clínica se mantienen en apiFetch. */
async function request<T, R>(
  path: string,
  init: RequestInit,
  map: (wire: T) => R,
): Promise<R> {
  const endpoint = `${init.method ?? "GET"} ${path.split("?")[0]}`;
  try {
    const wire = await apiFetch<T>(`${env.apiUrl}${path}`, {
      ...init,
      cache: "no-store",
      timeoutMs: init.method === "POST" ? 120_000 : 30_000,
    });
    try {
      return map(wire);
    } catch {
      throw new NutritionRequestError({
        kind: "contract",
        endpoint,
        status: 502,
      });
    }
  } catch (error) {
    if (error instanceof NutritionRequestError) throw error;
    const status = error instanceof ApiError ? error.status : 0;
    throw new NutritionRequestError({
      kind: [404, 501, 503].includes(status)
        ? "endpoint"
        : [409, 412].includes(status)
          ? "conflict"
          : "request",
      endpoint,
      status,
      detail: error instanceof ApiError ? error.message : undefined,
    });
  }
}

function fetchNutritionPage(query: NutritionQueueQuery, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.state !== "all") params.set("state", query.state);
  // Una proyección de pacientes por página, nunca detalle por tarjeta.
  return request<NutritionQueueWire, ReturnType<typeof mapNutritionQueue>>(
    `${ROOT}/inbox?${params}`,
    { signal },
    (wire) => mapNutritionQueue(wire, query.state),
  );
}
/** Ventana acotada de un estado: como máximo dos páginas, nunca el listado completo. */
async function fetchNutritionWindow(
  query: NutritionQueueQuery,
  offset: number,
  take: number,
  signal?: AbortSignal,
) {
  const first = Math.floor(offset / query.pageSize) + 1;
  const last = Math.floor((offset + take - 1) / query.pageSize) + 1;
  const pages = await Promise.all(
    Array.from({ length: last - first + 1 }, (_, index) =>
      fetchNutritionPage({ ...query, page: first + index }, signal),
    ),
  );
  const start = offset % query.pageSize;
  return pages.flatMap(page => page.items).slice(start, start + take);
}

export async function fetchNutritionQueue(
  query: NutritionQueueQuery,
  signal?: AbortSignal,
) {
  if (query.state === "all") {
    // Compatible con la API desplegada que aún coloca sin_plan al principio.
    // Se pagina sobre estados disjuntos; no se ordena una página ya recortada.
    const priority = ["aprobado", "por_renovar", "en_aprobacion", "borrador_ia", "devuelto", "sin_plan"] as const;
    const states = ["all", ...priority] as const;
    const counts = await Promise.all(states.map(state =>
      fetchNutritionPage({ ...query, state, page: 1, pageSize: 1 }, signal),
    ));
    const result = counts[0];
    states.forEach((state, index) => { result.counts[state] = counts[index].total; });
    let offset = (query.page - 1) * query.pageSize;
    let remaining = query.pageSize;
    const windows: ReturnType<typeof fetchNutritionWindow>[] = [];
    for (const state of priority) {
      const total = result.counts[state] ?? 0;
      if (offset >= total) {
        offset -= total;
        continue;
      }
      const take = Math.min(remaining, total - offset);
      windows.push(fetchNutritionWindow({ ...query, state }, offset, take, signal));
      remaining -= take;
      offset = 0;
      if (remaining === 0) break;
    }
    return {
      ...result,
      items: (await Promise.all(windows)).flat(),
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }
  const filters: NutritionQueueQuery["state"][] = [
    "all",
    "borrador_ia",
    "en_aprobacion",
    "aprobado",
    "devuelto",
    "por_renovar",
    "sin_plan",
  ];
  // El contrato no incluye counts. Lote fijo de agregados, independiente del
  // número de pacientes; comparte búsqueda/alcance/cancelación con la página.
  const [page, ...counts] = await Promise.all([
    fetchNutritionPage(query, signal),
    ...filters
      .filter((state) => state !== query.state)
      .map(async (state) => ({
        state,
        total: (
          await fetchNutritionPage(
            { ...query, state, page: 1, pageSize: 1 },
            signal,
          )
        ).total,
      })),
  ] as const);
  for (const count of counts) page.counts[count.state] = count.total;
  return page;
}
export async function fetchNutritionPendingCount(signal?: AbortSignal) {
  const queue = await fetchNutritionPage(
    { search: "", state: "en_aprobacion", page: 1, pageSize: 1 },
    signal,
  );
  return { count: queue.total };
}

/** El resumen consulta solo el workspace; nunca sustituye lo vigente por el borrador. */
export function fetchNutritionCurrentSummary(
  patientId: string,
  signal: AbortSignal,
): Promise<NutritionCurrentSummary> {
  return request<NutritionWorkspaceWire, NutritionCurrentSummary>(
    `${ROOT}/patients/${encodeURIComponent(patientId)}/workspace`,
    { signal },
    (wire) => {
      const civilDate = (value: string) => {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
          throw new Error("nutrition-date-contract");
        const time = Date.parse(`${value}T00:00:00Z`);
        if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value)
          throw new Error("nutrition-date-contract");
        return time;
      };
      if (wire?.patientId !== patientId)
        throw new Error("nutrition-patient-mismatch");
      const today = civilDate(wire.today);
      if (wire.currentPublished === null) return { current: null };
      const current = wire.currentPublished;
      if (
        !current || current.patientId !== patientId || current.isPublished !== true ||
        !current.startDate || !current.endDate || !current.targets
      ) throw new Error("nutrition-current-contract");
      const start = civilDate(current.startDate);
      const end = civilDate(current.endDate);
      const day = (today - start) / 86_400_000 + 1;
      const of = (end - start) / 86_400_000 + 1;
      const target = current.targets;
      if (
        of !== 30 || day < 1 || day > of ||
        ![target.k, target.c, target.p, target.f, target.fi, target.vasos].every(
          (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
        ) || target.k <= 0
      ) throw new Error("nutrition-current-contract");
      return { current: {
        startDate: current.startDate,
        endDate: current.endDate,
        day,
        of,
        targets: { kcal: target.k, carbsG: target.c, proteinG: target.p, fatG: target.f, fiberG: target.fi, waterGlasses: target.vasos },
      } };
    },
  );
}

export async function fetchNutritionWorkspace(
  patientId: string,
  signal: AbortSignal,
  prescriptionId?: string,
): Promise<NutritionWorkspace> {
  // CONTRACT §19: el workspace consolidado aporta identidad (+timezone), perfil
  // medido, faltantes, la vista de la prescripción a revisar y la bitácora.
  // Las cabeceras del calendario siguen en §4 (GET prescriptions, sin menús).
  const path = prescriptions(patientId);
  const headers = await request<NutritionViewWire[], NutritionViewWire[]>(
    `${path}?page=1&pageSize=100`,
    { signal },
    (wire) => {
      if (
        !Array.isArray(wire) ||
        wire.some(
          (row) =>
            row?.patientId !== patientId ||
            typeof row.id !== "string" ||
            typeof row.cycleId !== "string" ||
            !Number.isInteger(row.revision) ||
            row.revision < 1 ||
            typeof row.isPublished !== "boolean",
        )
      )
        throw new Error("nutrition-list-contract");
      // La API no incluye total; no asumir que una página llena es el historial entero.
      if (wire.length === 100)
        throw new Error("nutrition-history-pagination-required");
      return wire;
    },
  );
  const catalog = await request<NutritionFoodWire[], NutritionFood[]>(
    `${ROOT}/foods`,
    { signal },
    mapNutritionFoods,
  );
  const query = new URLSearchParams({
    historyPage: "1",
    historyPageSize: "50",
  });
  if (prescriptionId) query.set("prescriptionId", prescriptionId);
  const workspace = await request<
    NutritionWorkspaceWire,
    ReturnType<typeof mapNutritionWorkspaceIdentity>
  >(
    `${ROOT}/patients/${encodeURIComponent(patientId)}/workspace?${query}`,
    { signal },
    mapNutritionWorkspaceIdentity,
  );
  const { patient: row, revision, audit, review: cycleWire } = workspace;
  const head = cycleWire
    ? {
        id: cycleWire.id,
        cycleId: cycleWire.cycleId,
        version: cycleWire.version,
        state: cycleWire.state,
        isPublished: cycleWire.isPublished,
        startDate: cycleWire.startDate,
        endDate: cycleWire.endDate,
      }
    : null;
  if (prescriptionId && prescriptionId !== cycleWire?.id)
    throw new NutritionRequestError({
      kind: "endpoint",
      endpoint: `GET ${path}/${encodeURIComponent(prescriptionId)}`,
      status: 404,
    });
  // Copia publicada del MISMO ciclo que se está revisando (alimenta la comparación del borrador).
  const publishedHead = head
    ? (headers.find(
        (entry) => entry.isPublished && entry.cycleId === head.cycleId,
      ) ?? null)
    : null;
  const read = (id: string) =>
    request<NutritionViewWire, { cycle: NutritionCycle; revision: number }>(
      `${prescriptions(patientId)}/${encodeURIComponent(id)}`,
      { signal },
      (wire) => {
        if (wire?.patientId !== patientId || wire.id !== id)
          throw new Error("nutrition-patient-mismatch");
        return {
          cycle: mapNutritionCycle(wire, catalog),
          revision: wire.revision,
        };
      },
    );
  const cycle = cycleWire ? mapNutritionCycle(cycleWire, catalog) : null;
  // La copia publicada del ciclo EN REVISIÓN: cuando el propio review es la
  // copia publicada, la ficha muestra este ciclo como publicado (antes: `current`).
  const published =
    !publishedHead || !head
      ? null
      : publishedHead.id === head.id
        ? cycle
        : await read(publishedHead.id)
            .then((entry) => entry.cycle)
            .catch((error) => {
              if (signal.aborted) throw error;
              return null;
            });
  // La configuración llega del workspace (§19); su vista referencia lo publicado HOY,
  // que puede pertenecer a otro ciclo (concepto "vigente": bandeja §20.2).
  const patient: NutritionPatientDetail = {
    ...row,
    cycle,
    publishedCycle: published,
    revision,
    audit,
    auditIssue: null,
  };
  patient.cycleHeaders = headers.map((entry) => {
    if (
      !entry.targets ||
      ![
        entry.targets.k,
        entry.targets.c,
        entry.targets.p,
        entry.targets.f,
      ].every(Number.isFinite)
    )
      throw new NutritionRequestError({
        kind: "contract",
        endpoint: `GET ${path}`,
        status: 502,
      });
    return {
      id: entry.id,
      cycleId: entry.cycleId,
      version: entry.version,
      state: entry.state,
      isPublished: entry.isPublished,
      startDate: entry.startDate,
      endDate: entry.endDate,
      targets: {
        kcal: entry.targets.k,
        carbsG: entry.targets.c,
        proteinG: entry.targets.p,
        fatG: entry.targets.f,
      },
    };
  });
  // El historial llega en el workspace (§19); sin segunda llamada por ficha.
  return { patient, catalog };
}

async function withHistory(
  patient: NutritionPatientDetail,
  signal?: AbortSignal,
): Promise<NutritionPatientDetail> {
  if (!patient.cycle) return patient;
  const version = patient.cycle.version;
  try {
    const audit = await request<
      NutritionEventWire[],
      ReturnType<typeof mapNutritionHistory>
    >(
      `${prescriptions(patient.patientId)}/${encodeURIComponent(patient.cycle.id)}/history`,
      { signal },
      (wire) => mapNutritionHistory(wire, version),
    );
    return { ...patient, audit, auditIssue: null };
  } catch (error) {
    if (signal?.aborted) throw error;
    // Una lectura fallida nunca transforma una escritura confirmada en "fallida".
    return { ...patient, audit: [], auditIssue: nutritionIssue(error) };
  }
}

async function mutate(
  patient: NutritionPatientDetail,
  catalog: NutritionFood[],
  path: string,
  body: unknown,
  signal?: AbortSignal,
  identity?: NutritionCycle,
) {
  const result = await request<
    NutritionViewWire,
    {
      cycle: NutritionCycle;
      revision: number;
      published: boolean;
      cycleId: string;
    }
  >(path, { method: "POST", body: JSON.stringify(body), signal }, (wire) => {
    if (wire?.patientId !== patient.patientId)
      throw new Error("nutrition-patient-mismatch");
    return {
      cycle: mapNutritionCycle(wire, catalog, identity),
      revision: wire.revision,
      published: wire.isPublished,
      cycleId: wire.cycleId,
    };
  });
  const cycle = {
    ...result.cycle,
    patientTimeZone: patient.timeZone ?? patient.cycle?.patientTimeZone ?? "",
    publishedVersionId: result.published
      ? result.cycle.id
      : (patient.publishedCycle?.id ?? null),
  };
  const publishedCycle = result.published ? cycle : patient.publishedCycle;
  const cycleHeaders = [
    {
      id: cycle.id,
      cycleId: result.cycleId,
      version: cycle.version,
      state: cycle.state,
      isPublished: result.published,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      targets: cycle.targets,
    },
    ...(patient.cycleHeaders ?? []).filter((header) => header.id !== cycle.id),
  ];
  const updated = {
    ...patient,
    cycle,
    publishedCycle,
    cycleHeaders,
    revision: result.revision,
  };
  const url = new URL(window.location.href);
  if (url.pathname === `/nutrition/${encodeURIComponent(patient.patientId)}`) {
    url.searchParams.set("prescriptionId", cycle.id);
    window.history.replaceState(null, "", url);
  }
  window.dispatchEvent(new Event("nutrition-changed"));
  return withHistory(updated, signal);
}

export function saveNutritionDraft(
  patient: NutritionPatientDetail,
  cycle: NutritionCycle,
  previous: NutritionCycle,
  revision: number,
  catalog: NutritionFood[],
  signal?: AbortSignal,
) {
  if (!Number.isInteger(revision) || revision < 1)
    throw new NutritionRequestError({
      kind: "contract",
      endpoint: `POST ${prescriptions(patient.patientId)}/${encodeURIComponent(cycle.id)}/save`,
      status: 422,
    });
  return mutate(
    patient,
    catalog,
    `${prescriptions(patient.patientId)}/${encodeURIComponent(cycle.id)}/save`,
    { revision, edit: toNutritionEdit(cycle, previous) },
    signal,
    cycle,
  );
}

export function performNutritionAction(
  patient: NutritionPatientDetail,
  action: NutritionAction,
  revision: number,
  catalog: NutritionFood[],
  options: NutritionActionOptions = {},
  signal?: AbortSignal,
) {
  const base = prescriptions(patient.patientId);
  if (action === "create")
    return mutate(patient, catalog, base, options.generate ?? {}, signal);
  if (!patient.cycle)
    throw new NutritionRequestError({
      kind: "contract",
      endpoint: `POST ${base}`,
      status: 422,
    });
  const verb = action === "new-version" ? "create-version" : action;
  if (
    !Number.isInteger(revision) ||
    revision < 1 ||
    (action === "apply-day" &&
      (!Number.isInteger(options.sourceDay) ||
        options.sourceDay! < 1 ||
        options.sourceDay! > 30))
  )
    throw new NutritionRequestError({
      kind: "contract",
      endpoint: `POST ${base}/${patient.cycle.id}/${verb}`,
      status: 422,
    });
  const body = {
    revision,
    ...(action === "apply-day"
      ? { edit: { sourceDay: options.sourceDay, confirmManualEdits: true } }
      : {}),
    ...(action === "approve" || action === "publish"
      ? {
          ...(action === "approve" ? { criticalConfirmed: options.criticalConfirmed === true } : {}),
          ...(options.startDate ? { startDate: options.startDate } : {}),
        }
      : {}),
    ...(action === "return" ? { comment: options.comment?.trim() } : {}),
    ...(action === "regenerate"
      ? { generate: options.generate ?? { preserveConfirmedEdits: true } }
      : {}),
  };
  // Comment pertenece al request común (§3); conservar la nota opcional de revisión.
  if (action === "approve" && options.comment?.trim())
    Object.assign(body, { comment: options.comment.trim() });
  // Actor y capacidades se resuelven en el backend desde JWT; no viajan en el cuerpo.
  return mutate(
    patient,
    catalog,
    `${base}/${encodeURIComponent(patient.cycle.id)}/${verb}`,
    body,
    signal,
  );
}
// GET /api/v1/me/nutrition-plan: DTO móvil congelado; solo referencia CONTRACT §14.
// El ERP no lo consume ni lo utiliza como alias de la ficha profesional.
