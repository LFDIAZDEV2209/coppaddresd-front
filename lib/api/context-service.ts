/**
 * Contexto del usuario autenticado en el ERP (switcher de clínica).
 *
 * GET /api/v1/me/context devuelve la organización del usuario, sus clínicas
 * asignadas (con sedes) y, por clínica, los permisos efectivos (globales +
 * scoped). El frontend usa esto para mostrar el selector de contexto y para
 * gatear la UI según la clínica activa.
 */

import { env } from "@/lib/config/env";
import { apiFetch } from "@/lib/api/http";

export interface MyLocation {
  id: string;
  name: string;
  cityName: string | null;
  stateCode: string | null;
}

export interface MyClinic {
  id: string;
  name: string;
  isPrimary: boolean;
  locations: MyLocation[];
  /** Permisos efectivos del usuario EN ESTA clínica (globales ∪ scoped). */
  permissions: string[];
}

export interface MyOrganization {
  id: string;
  name: string;
}

export interface MyContext {
  userId: string;
  employeeId: string | null;
  professionalId: string | null;
  organization: MyOrganization | null;
  isProfessional: boolean;
  professionalTypeName: string | null;
  clinics: MyClinic[];
  activeClinicId: string | null;
}

export async function fetchMyContext(): Promise<MyContext> {
  return apiFetch<MyContext>(`${env.apiUrl}/api/v1/me/context`);
}
