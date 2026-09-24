/**
 * Tipos del módulo Redes (acceso a redes): radicaciones de autorizaciones y
 * facturación RIPS. Mock en memoria — el backend aún no expone estos
 * contratos; los services simulan latencia y datos realistas.
 */

/* ----------------------------- Radicaciones ----------------------------- */

export interface RedPrestador {
  nit: string;
  razonSocial: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string;
  email: string;
  codigoPrestador: string;
  habilitacion: "habilitado" | "no-habilitado";
  naturaleza: "privada" | "publica" | "mixta";
}

export interface CupLine {
  id: string;
  tipo: "CUPS" | "CUM";
  codigo: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
}

export type RadicacionEstado =
  | "radicada"
  | "en-revision"
  | "aprobada"
  | "rechazada";

export interface CotizacionAdjunta {
  nombreArchivo: string;
  numero: string;
  fecha: string;
  monto: number;
}

export interface Radicacion {
  id: string;
  consecutivo: string;
  createdAt: string;
  nit: string;
  razonSocial: string;
  nivel: "urgencias" | "consulta-externa" | "hospitalizacion";
  diagnosticoCie10: string;
  diagnosticoDescripcion: string;
  prioridad: "alta" | "media" | "baja";
  observaciones: string;
  cups: CupLine[];
  cotizacion: CotizacionAdjunta | null;
  total: number;
  estado: RadicacionEstado;
}

export interface RadicacionInput {
  nit: string;
  nivel: Radicacion["nivel"];
  diagnosticoCie10: string;
  diagnosticoDescripcion: string;
  prioridad: Radicacion["prioridad"];
  observaciones: string;
  cups: CupLine[];
  cotizacion: CotizacionAdjunta | null;
}

/* --------------------------- Facturación RIPS --------------------------- */

export interface CuvValidation {
  cuv: string;
  prestadorNit: string;
  prestadorRazonSocial: string;
  facturaNumero: string;
  fechaExpedicion: string;
  valorTotal: number;
  valorCopago: number;
  valorCuotaModeradora: number;
  valorNeto: number;
  usuarioTipo: "cotizante" | "beneficiario";
  usuarioDocumento: string;
  usuarioNombre: string;
  numeroContrato: string;
  modalidadContrato: string;
  cobertura: string;
  periodoAtencion: string;
}

export type RipsArchivoTipo =
  | "AF"
  | "US"
  | "AP"
  | "AH"
  | "AN"
  | "AC"
  | "AU"
  | "AM"
  | "AT"
  | "FA";

export interface RipsArchivo {
  id: string;
  tipo: RipsArchivoTipo;
  nombre: string;
  registros: number;
  tamaño: string;
}

export type FacturaEstado =
  | "cargada"
  | "en-validacion"
  | "validada"
  | "rechazada";

export interface FacturaRips {
  id: string;
  cuv: string;
  facturaNumero: string;
  prestadorRazonSocial: string;
  prestadorNit: string;
  fechaRadicacion: string;
  valorTotal: number;
  valorNeto: number;
  usuarioNombre: string;
  cobertura: string;
  registros: Record<RipsArchivoTipo, number>;
  archivos: RipsArchivo[];
  estado: FacturaEstado;
}

export interface FacturaInput {
  cuv: string;
  facturaNumero: string;
  prestadorRazonSocial: string;
  prestadorNit: string;
  fechaRadicacion: string;
  valorTotal: number;
  valorCopago: number;
  valorCuotaModeradora: number;
  valorNeto: number;
  usuarioTipo: CuvValidation["usuarioTipo"];
  usuarioDocumento: string;
  usuarioNombre: string;
  numeroContrato: string;
  modalidadContrato: string;
  cobertura: string;
  periodoAtencion: string;
  registros: Record<RipsArchivoTipo, number>;
  archivos: Omit<RipsArchivo, "id">[];
}
