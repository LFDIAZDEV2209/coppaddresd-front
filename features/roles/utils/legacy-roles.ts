import type { Role } from "@/features/roles/types";

/**
 * Nombres de roles legado que fueron reemplazados por el rol consolidado
 * "Professional". Estos alias ya no se muestran en los selectores de
 * asignación para usuarios nuevos, pero siguen existiendo en el catálogo
 * (aparecen como Inactivo).
 */
export const LEGACY_ROLE_NAMES = [
  "Physician",
  "Nutritionist",
  "Psychologist",
];

/**
 * Filtra la lista de roles excluyendo los alias legado, dejando solo los
 * roles seleccionables para UI (asignación de roles en el wizard de usuario).
 * La resolución interna (p. ej. people-wizard) debe seguir buscando en
 * TODOS los roles del catálogo.
 */
export function listSelectableRoles(roles: Role[]): Role[] {
  const legacy = new Set(
    LEGACY_ROLE_NAMES.map((name) => name.toLowerCase()),
  );
  return roles.filter((role) => !legacy.has(role.name.toLowerCase()));
}
