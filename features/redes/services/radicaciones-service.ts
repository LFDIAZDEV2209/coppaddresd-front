/**
 * Servicios mock del módulo Redes: radicaciones de autorizaciones.
 * CRUD en memoria con latencia simulada; cuando el backend exponga los
 * endpoints se reemplaza el cuerpo de cada función por apiFetch.
 */
import type {
  CupLine,
  Radicacion,
  RadicacionInput,
  RedPrestador,
} from "../types";
import {
  CATALOGO_CIE10,
  CATALOGO_CUPS,
  COTIZACION_PLANTILLAS,
  RADICACIONES_SEED,
  REDES_SEED,
} from "../data/mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const state: { radicaciones: Radicacion[]; seq: number } = {
  radicaciones: [...RADICACIONES_SEED],
  seq: 185,
};

export function listRedes(): RedPrestador[] {
  return REDES_SEED;
}

/** Búsqueda de red por NIT (con o sin dígito de verificación). */
export function lookupRedByNit(
  nitQuery: string,
): RedPrestador | null {
  const norm = nitQuery.trim().toLowerCase().replace(/\s+/g, "");
  if (!norm) return null;
  return (
    REDES_SEED.find((r) => r.nit.toLowerCase() === norm) ??
    REDES_SEED.find((r) =>
      r.nit.toLowerCase().startsWith(norm.split("-")[0] ?? norm),
    ) ??
    null
  );
}

/** Resolución CIE-10 → descripción (catálogo mock). */
export function lookupCie10(codigo: string): string | null {
  const norm = codigo.trim().toUpperCase();
  const hit = CATALOGO_CIE10.find((d) => d.codigo.toUpperCase() === norm);
  return hit?.descripcion ?? null;
}

/** Autocompletado de línea CUPS/CUM por código de catálogo. */
export function lookupCupsOrCum(
  codigo: string,
): { tipo: CupLine["tipo"]; descripcion: string } | null {
  const norm = codigo.trim();
  const hit = CATALOGO_CUPS.find((c) => c.codigo === norm);
  return hit ? { tipo: hit.tipo, descripcion: hit.descripcion } : null;
}

let idCounter = 0;
const nextId = () => `cup-${Date.now()}-${idCounter++}`;

export function buildCupLine(
  tipo: CupLine["tipo"],
  codigo: string,
  descripcion: string,
  cantidad: number,
  valorUnitario: number,
): CupLine {
  return { id: nextId(), tipo, codigo, descripcion, cantidad, valorUnitario };
}

/**
 * "Análisis" de cotización: selecciona una plantilla según el nombre del
 * archivo (determinista) y devuelve las líneas CUPS/CUM extraídas.
 */
export async function analizarCotizacion(file: File): Promise<{
  plantilla: (typeof COTIZACION_PLANTILLAS)[number];
  lines: CupLine[];
} | null> {
  await delay(900);
  const name = file.name.toLowerCase();
  const idx =
    COTIZACION_PLANTILLAS.findIndex((p) =>
      name.includes(p.nombreArchivo.toLowerCase().replace(/[-_.]/g, "")),
    ) % COTIZACION_PLANTILLAS.length;
  const plantilla =
    COTIZACION_PLANTILLAS[idx >= 0 ? idx : Math.abs(name.length) % COTIZACION_PLANTILLAS.length];
  const lines = plantilla.cups.map((c) => {
    const cat = CATALOGO_CUPS.find((x) => x.codigo === c.codigo);
    return buildCupLine(
      cat?.tipo ?? "CUPS",
      c.codigo,
      cat?.descripcion ?? "",
      c.cantidad,
      c.valorUnitario,
    );
  });
  return { plantilla, lines };
}

export async function listRadicaciones(): Promise<Radicacion[]> {
  await delay(500);
  return [...state.radicaciones];
}

export async function createRadicacion(
  input: RadicacionInput,
): Promise<Radicacion> {
  await delay(600);
  const red = lookupRedByNit(input.nit);
  const consecutivo = `RAD-2026-${String(state.seq++).padStart(4, "0")}`;
  const radicacion: Radicacion = {
    id: `rad-${consecutivo}`,
    consecutivo,
    createdAt: new Date().toISOString().slice(0, 10),
    nit: red?.nit ?? input.nit,
    razonSocial: red?.razonSocial ?? "Red no encontrada",
    nivel: input.nivel,
    diagnosticoCie10: input.diagnosticoCie10,
    diagnosticoDescripcion: input.diagnosticoDescripcion,
    prioridad: input.prioridad,
    observaciones: input.observaciones,
    cups: input.cups,
    cotizacion: input.cotizacion,
    total: input.cups.reduce(
      (acc, c) => acc + c.cantidad * c.valorUnitario,
      0,
    ),
    estado: "radicada",
  };
  state.radicaciones = [radicacion, ...state.radicaciones];
  return radicacion;
}
