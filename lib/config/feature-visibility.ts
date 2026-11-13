/** Citas se conserva para reactivación explícita; no se expone por defecto. */
export const APPOINTMENTS_ENABLED =
  process.env.NEXT_PUBLIC_APPOINTMENTS_ENABLED === "true";

/**
 * Módulos/ítems ocultados del sidebar por la reorganización del ERP
 * (2026-11-13, ver docs/erp-reorganizacion-2026-11.md). Las rutas y permisos
 * se conservan intactos: solo desaparecen de la navegación. Reactivación
 * explícita vía variable de entorno NEXT_PUBLIC_*_ENABLED=true (en Next 16
 * las NEXT_PUBLIC_* se hornean en el build, no se leen en runtime).
 */
export const INVENTORY_ENABLED =
  process.env.NEXT_PUBLIC_INVENTORY_ENABLED === "true";

export const STORE_ENABLED = process.env.NEXT_PUBLIC_STORE_ENABLED === "true";

/** Planes de alimentación legacy: sustituido por el módulo Nutrición. */
export const WELLNESS_NUTRITION_PLANS_ENABLED =
  process.env.NEXT_PUBLIC_WELLNESS_NUTRITION_PLANS_ENABLED === "true";

/** Asignaciones legacy de bienestar: sustituido por Nutrición. */
export const WELLNESS_ASSIGNMENTS_ENABLED =
  process.env.NEXT_PUBLIC_WELLNESS_ASSIGNMENTS_ENABLED === "true";

/** Clínica del Programa: pendiente de reorganización del módulo Programa. */
export const PROGRAM_CLINICA_ENABLED =
  process.env.NEXT_PUBLIC_PROGRAM_CLINICA_ENABLED === "true";
