/**
 * Configuración del módulo de profesionales.
 *
 * PROFESSIONAL_CLINICS_ENABLED = false oculta todo lo relacionado con
 * clínicas en el frontend (wizard, directorio, detalle, importación) SIN
 * borrar código: los profesionales se crean sin asignaciones y con el rol
 * global Professional. El backend no se toca (acepta lista vacía y scope
 * Global) y los datos existentes con clínicas se conservan intactos.
 *
 * Para revertir (el cliente vuelve a pedir clínicas): poner en `true`.
 * Todo reaparece tal como estaba, incluyendo la gestión por clínica.
 */

/** Muestra/oculta el modelo de clínicas para staff (profesional + empleado). */
export const PROFESSIONAL_CLINICS_ENABLED = false;

/** Clave del horario único cuando las clínicas están ocultas. */
export const GENERAL_SCHEDULE_KEY = "general";
