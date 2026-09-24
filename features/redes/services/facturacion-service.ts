/**
 * Servicios mock del módulo Redes: facturación RIPS.
 * Validación de CUV + CRUD de cargues en memoria con latencia simulada.
 */
import type {
  CuvValidation,
  FacturaInput,
  FacturaRips,
  RipsArchivoTipo,
} from "../types";
import { FACTURAS_SEED, REDES_SEED } from "../data/mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const state: { facturas: FacturaRips[] } = {
  facturas: [...FACTURAS_SEED],
};

const PRESTADORES_CUV = REDES_SEED.filter((r) => r.habilitacion === "habilitado");

const USUARIOS = [
  { nombre: "Mariana Restrepo Vélez", documento: "1.038.442.117", tipo: "cotizante" as const },
  { nombre: "Carlos Mendoza Ruiz", documento: "80.012.345", tipo: "beneficiario" as const },
  { nombre: "Laura Gómez Álvarez", documento: "1.052.773.410", tipo: "cotizante" as const },
  { nombre: "Andrés Felipe Vargas", documento: "91.998.712", tipo: "beneficiario" as const },
];

const MODALIDADES = ["Evento", "Capitación", "Pago por servicio"];

/**
 * Validación mock de CUV: cualquier código con al menos 6 caracteres devuelve
 * una respuesta determinística derivada del hash del CUV (mismo CUV →
 * siempre los mismos datos, como haría la validación real).
 */
export async function validarCuv(cuv: string): Promise<CuvValidation | null> {
  await delay(800);
  const value = cuv.trim();
  if (value.length < 6) return null;

  // Hash simple y determinista a partir del código.
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  const prestador = PRESTADORES_CUV[h % PRESTADORES_CUV.length];
  const usuario = USUARIOS[h % USUARIOS.length];
  const modalidad = MODALIDADES[h % MODALIDADES.length];

  const valorTotal = 480_000 + (h % 420) * 11_500;
  const copago = valorTotal * 0.04;
  const cuota = valorTotal * 0.015;
  const hoy = new Date();
  const expedicion = new Date(hoy.getTime() - (h % 12) * 86_400_000);
  const inicio = new Date(expedicion.getTime() - 20 * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return {
    cuv: value,
    prestadorNit: prestador.nit,
    prestadorRazonSocial: prestador.razonSocial,
    facturaNumero: `FV-${(h % 90000) + 10000}`,
    fechaExpedicion: fmt(expedicion),
    valorTotal: Math.round(valorTotal),
    valorCopago: Math.round(copago),
    valorCuotaModeradora: Math.round(cuota),
    valorNeto: Math.round(valorTotal - copago - cuota),
    usuarioTipo: usuario.tipo,
    usuarioDocumento: usuario.documento,
    usuarioNombre: usuario.nombre,
    numeroContrato: `CTO-${(h % 900) + 100}`,
    modalidadContrato: modalidad,
    cobertura:
      modalidad === "Evento" ? "Urgencias y hospitalización" : "Plan Biohacking Integral",
    periodoAtencion: `${fmt(inicio)} a ${fmt(expedicion)}`,
  };
}

export async function listFacturas(): Promise<FacturaRips[]> {
  await delay(500);
  return [...state.facturas];
}

const totalRegistros = (r: Record<RipsArchivoTipo, number>) =>
  Object.values(r).reduce((a, b) => a + b, 0);

export async function createFactura(input: FacturaInput): Promise<FacturaRips> {
  await delay(700);
  const total = totalRegistros(input.registros);
  const archivos = input.archivos.map((a, i) => ({
    ...a,
    id: `fac-new-a${i}`,
  }));
  const factura: FacturaRips = {
    id: `fac-${Date.now()}`,
    cuv: input.cuv,
    facturaNumero: input.facturaNumero,
    prestadorRazonSocial: input.prestadorRazonSocial,
    prestadorNit: input.prestadorNit,
    fechaRadicacion: input.fechaRadicacion || new Date().toISOString().slice(0, 10),
    valorTotal: input.valorTotal,
    valorNeto: input.valorNeto,
    usuarioNombre: input.usuarioNombre,
    cobertura: input.cobertura,
    registros: input.registros,
    archivos,
    estado: total > 0 ? "cargada" : "cargada",
  };
  state.facturas = [factura, ...state.facturas];
  return factura;
}

/** Estructura de nombres esperados para la carga rápida. */
export function expectedFileNames(
  facturaNumero: string,
  nit: string,
  registros: Record<RipsArchivoTipo, number>,
): { tipo: RipsArchivoTipo; nombre: string; registros: number }[] {
  const clean = nit.replace(/[^0-9-]/g, "");
  const tipos: RipsArchivoTipo[] = ["AF", "US", "AP", "AH", "AU", "AM"];
  return tipos
    .filter(
      (tipo) => tipo === "AF" || tipo === "US" || registros[tipo] > 0,
    )
    .map((tipo) => ({
      tipo,
      nombre: `${tipo}-${clean}-${facturaNumero.replace(/[^0-9]/g, "")}.txt`,
      registros: tipo === "AF" || tipo === "US" ? registros[tipo] || 0 : registros[tipo],
    }));
}
