/**
 * Servicios del módulo Redes: facturación RIPS.
 * Endpoints reales del backend (`/api/v1/redes`) + helper local de
 * estructura de archivos esperada (pure client-side).
 */
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { CuvValidation, FacturaInput, FacturaRips, RipsArchivoTipo } from "../types";

const PATH = `${env.apiUrl}/api/v1/redes`;

/**
 * Valida un CUV en el backend: 404 (código inválido) → null. Los datos
 * devueltos autocompletan la factura y son editables en el formulario.
 */
export async function validarCuv(cuv: string): Promise<CuvValidation | null> {
  const value = cuv.trim();
  if (value.length < 6) return null;
  try {
    return await apiFetch<CuvValidation>(`${PATH}/cuv/validar`, {
      method: "POST",
      body: JSON.stringify({ cuv: value }),
    });
  } catch {
    // 404 del validador → CUV inválido (el backend solo responde 404 aquí).
    return null;
  }
}

export async function listFacturas(): Promise<FacturaRips[]> {
  return apiFetch<FacturaRips[]>(`${PATH}/facturas`);
}

export async function createFactura(input: FacturaInput): Promise<FacturaRips> {
  const body = {
    cuv: input.cuv,
    facturaNumero: input.facturaNumero,
    prestadorNit: input.prestadorNit,
    prestadorRazonSocial: input.prestadorRazonSocial,
    fechaRadicacion: input.fechaRadicacion,
    valorTotal: input.valorTotal,
    valorCopago: input.valorCopago,
    valorCuotaModeradora: input.valorCuotaModeradora,
    valorNeto: input.valorNeto,
    usuarioTipo: input.usuarioTipo,
    usuarioDocumento: input.usuarioDocumento,
    usuarioNombre: input.usuarioNombre,
    numeroContrato: input.numeroContrato,
    modalidadContrato: input.modalidadContrato,
    cobertura: input.cobertura,
    periodoAtencion: input.periodoAtencion,
    registros: input.registros,
    archivos: input.archivos,
  };
  return apiFetch<FacturaRips>(`${PATH}/facturas`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Estructura de nombres esperados para la carga rápida (cliente puro). */
export function expectedFileNames(
  facturaNumero: string,
  nit: string,
  registros: Record<RipsArchivoTipo, number>,
): { tipo: RipsArchivoTipo; nombre: string; registros: number }[] {
  const clean = nit.replace(/[^0-9-]/g, "");
  const tipos: RipsArchivoTipo[] = ["AF", "US", "AP", "AH", "AU", "AM"];
  return tipos
    .filter((tipo) => tipo === "AF" || tipo === "US" || registros[tipo] > 0)
    .map((tipo) => ({
      tipo,
      nombre: `${tipo}-${clean}-${facturaNumero.replace(/[^0-9]/g, "")}.txt`,
      registros: tipo === "AF" || tipo === "US" ? registros[tipo] || 0 : registros[tipo],
    }));
}
