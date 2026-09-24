/**
 * Servicios del módulo Redes: radicaciones de autorizaciones.
 * Endpoints reales del backend (`/api/v1/redes`), espejo de
 * coppAddresdBack/src/CoppAddresd.Api/Controllers/RedesController.cs.
 * El "análisis" de cotización sigue en cliente (plantillas locales): la
 * extracción real de documentos queda para el backend.
 */
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { CupLine, Radicacion, RadicacionInput, RedPrestador } from "../types";

const PATH = `${env.apiUrl}/api/v1/redes`;

interface RedPrestadoraDto {
  nit: string;
  razonSocial: string;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
  codigoPrestador: string | null;
  habilitacion: string;
  naturaleza: string;
}

function toRedPrestador(dto: RedPrestadoraDto): RedPrestador {
  return {
    nit: dto.nit,
    razonSocial: dto.razonSocial,
    direccion: dto.direccion ?? "",
    ciudad: dto.ciudad ?? "",
    departamento: dto.departamento ?? "",
    telefono: dto.telefono ?? "",
    email: dto.email ?? "",
    codigoPrestador: dto.codigoPrestador ?? "",
    habilitacion: dto.habilitacion === "no-habilitado" ? "no-habilitado" : "habilitado",
    naturaleza: (dto.naturaleza as RedPrestador["naturaleza"]) ?? "privada",
  };
}

/** Búsqueda de red por NIT (el backend resuelve con y sin dígito de verificación). */
export async function lookupRedByNit(nitQuery: string): Promise<RedPrestador | null> {
  const nit = nitQuery.trim();
  if (!nit) return null;
  const hits = await apiFetch<RedPrestadoraDto[]>(
    `${PATH}/redes?nit=${encodeURIComponent(nit)}`,
  );
  return hits.length > 0 ? toRedPrestador(hits[0]) : null;
}

/** Diagnósticos CIE-10 de ejemplo (catálogo backend existe en /catalogs/icd10-codes). */
export function lookupCie10(codigo: string): string | null {
  const norm = codigo.trim().toUpperCase();
  const local: Record<string, string> = {
    "S72.0": "Fractura del cuello del fémur",
    "S06.0": "Conmoción cerebral",
    "K35.2": "Apendicitis aguda con peritonitis localizada",
    "J18.9": "Neumonía, organismo no especificado",
    "I21.0": "Infarto agudo de miocardio con elevación del ST",
    "K80.2": "Colecistitis aguda sin cálculos",
    "N39.0": "Infección de vías urinarias, sitio no especificado",
    "R10.4": "Otros dolores abdominales y los no especificados",
    "L03.1": "Celulitis de otras partes de la pierna",
    "S09.9": "Traumatismo de la cabeza, parte no especificada",
  };
  return local[norm] ?? null;
}

/** Autocompletado de línea CUPS/CUM por código de catálogo local (mock de conveniencia). */
export function lookupCupsOrCum(
  codigo: string,
): { tipo: CupLine["tipo"]; descripcion: string } | null {
  const catalogo: Record<string, { tipo: CupLine["tipo"]; descripcion: string }> = {
    "8690201": { tipo: "CUPS", descripcion: "Valoración por medicina general en urgencias" },
    "890312": { tipo: "CUPS", descripcion: "Valoración por medicina interna en urgencias" },
    "869012": { tipo: "CUPS", descripcion: "Aplicación de medicamentos en urgencias" },
    "870201": { tipo: "CUPS", descripcion: "Hemograma completo automatizado" },
    "890301": { tipo: "CUPS", descripcion: "Química sanguínea 4 componentes" },
    "871710": { tipo: "CUPS", descripcion: "Radiografía de tórax dos proyecciones" },
    "881522": { tipo: "CUPS", descripcion: "Electrocardiografía en reposo 12 derivaciones" },
    "891006": { tipo: "CUPS", descripcion: "Sutura de herida superficial" },
    "870404": { tipo: "CUPS", descripcion: "TAC de cráneo simple" },
    "891004": { tipo: "CUPS", descripcion: "Inmovilización de fractura de miembro superior" },
    "I-451": { tipo: "CUM", descripcion: "Dexketoprofeno 25 mg solución inyectable x 2 mL" },
    "I-302": { tipo: "CUM", descripcion: "Cloruro de sodio 0,9 % solución inyectable 500 mL" },
    "I-385": { tipo: "CUM", descripcion: "Ondansetrón 8 mg/4 mL solución inyectable" },
    "I-577": { tipo: "CUM", descripcion: "Paracetamol 10 mg/mL solución inyectable 100 mL" },
  };
  return catalogo[codigo.trim()] ?? null;
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

export async function listRadicaciones(): Promise<Radicacion[]> {
  return apiFetch<Radicacion[]>(`${PATH}/radicaciones`);
}

export async function createRadicacion(
  input: RadicacionInput,
): Promise<Radicacion> {
  const body = {
    nit: input.nit,
    nivel: input.nivel,
    diagnosticoCie10: input.diagnosticoCie10,
    diagnosticoDescripcion: input.diagnosticoDescripcion || null,
    prioridad: input.prioridad,
    observaciones: input.observaciones || null,
    cups: input.cups.map((c) => ({
      tipo: c.tipo,
      codigo: c.codigo,
      descripcion: c.descripcion || null,
      cantidad: c.cantidad,
      valorUnitario: c.valorUnitario,
    })),
    cotizacion: input.cotizacion
      ? {
          nombreArchivo: input.cotizacion.nombreArchivo,
          numero: input.cotizacion.numero,
          fecha: input.cotizacion.fecha,
          monto: input.cotizacion.monto,
        }
      : null,
  };
  return apiFetch<Radicacion>(`${PATH}/radicaciones`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* --------- Cotización "analizable" (mock en cliente hasta que el backend ------- */
/* ------------------------- expose el análisis de documentos ------------------- */

export interface PlantillaCotizacion {
  clave: string;
  nombreArchivo: string;
  numero: string;
  fecha: string;
  monto: number;
  cups: { codigo: string; cantidad: number; valorUnitario: number }[];
}

export const COTIZACION_PLANTILLAS: PlantillaCotizacion[] = [
  {
    clave: "cot-1",
    nombreArchivo: "COTIZACION-URGENCIAS-2026-0912.pdf",
    numero: "COT-2026-0912",
    fecha: "2026-09-12",
    monto: 1_482_500,
    cups: [
      { codigo: "8690201", cantidad: 1, valorUnitario: 128_000 },
      { codigo: "890312", cantidad: 1, valorUnitario: 210_000 },
      { codigo: "870201", cantidad: 1, valorUnitario: 62_000 },
      { codigo: "890301", cantidad: 1, valorUnitario: 88_000 },
      { codigo: "871710", cantidad: 1, valorUnitario: 95_000 },
      { codigo: "I-451", cantidad: 2, valorUnitario: 12_500 },
      { codigo: "I-302", cantidad: 1, valorUnitario: 18_000 },
      { codigo: "I-385", cantidad: 2, valorUnitario: 9_800 },
    ],
  },
  {
    clave: "cot-2",
    nombreArchivo: "cotizacion_servicios_845.png",
    numero: "COT-2026-0845",
    fecha: "2026-09-05",
    monto: 2_634_000,
    cups: [
      { codigo: "870404", cantidad: 1, valorUnitario: 780_000 },
      { codigo: "891004", cantidad: 1, valorUnitario: 340_000 },
      { codigo: "869012", cantidad: 3, valorUnitario: 45_000 },
      { codigo: "870201", cantidad: 2, valorUnitario: 62_000 },
      { codigo: "I-577", cantidad: 2, valorUnitario: 14_000 },
      { codigo: "I-302", cantidad: 2, valorUnitario: 18_000 },
    ],
  },
  {
    clave: "cot-3",
    nombreArchivo: "cotizacion-clinica-santa-barbara.pdf",
    numero: "COT-2026-0733",
    fecha: "2026-08-28",
    monto: 986_500,
    cups: [
      { codigo: "8690201", cantidad: 1, valorUnitario: 128_000 },
      { codigo: "881522", cantidad: 1, valorUnitario: 118_500 },
      { codigo: "891006", cantidad: 1, valorUnitario: 160_000 },
      { codigo: "871710", cantidad: 1, valorUnitario: 95_000 },
      { codigo: "870201", cantidad: 1, valorUnitario: 62_000 },
      { codigo: "I-451", cantidad: 1, valorUnitario: 12_500 },
    ],
  },
];

/**
 * "Análisis" de cotización en cliente: selecciona una plantilla según el
 * nombre del archivo (determinista) y devuelve las líneas CUPS/CUM.
 */
export async function analizarCotizacion(file: File): Promise<{
  plantilla: PlantillaCotizacion;
  lines: CupLine[];
} | null> {
  const name = file.name.toLowerCase();
  const idx =
    COTIZACION_PLANTILLAS.findIndex((p) =>
      name.includes(p.nombreArchivo.toLowerCase().replace(/[-_.]/g, "")),
    ) % COTIZACION_PLANTILLAS.length;
  const plantilla =
    COTIZACION_PLANTILLAS[idx >= 0 ? idx : Math.abs(name.length) % COTIZACION_PLANTILLAS.length];
  const lines = plantilla.cups.map((c) => {
    const meta = lookupCupsOrCum(c.codigo);
    return buildCupLine(
      meta?.tipo ?? "CUPS",
      c.codigo,
      meta?.descripcion ?? "",
      c.cantidad,
      c.valorUnitario,
    );
  });
  return { plantilla, lines };
}
