/**
 * Helper compartido de sincronización de asignaciones (roles y permisos)
 * contra el Auth Service.
 *
 * Se usa en el guardado de usuarios (roles y permisos directos) y de roles
 * (permisos del rol). Refetchea el baseline ACTUAL en el momento de
 * sincronizar (evita diffs contra snapshots stale que re-emiten DELETEs ya
 * aplicados) y reporta errores individuales sin abortar el resto: un fallo
 * parcial queda visible y el reintento converge porque el baseline fresco ya
 * incluye lo aplicado.
 */

export interface AssignmentSyncError {
  type: "assign" | "remove";
  id: string;
  message: string;
}

export interface AssignmentSyncResult {
  /** Cantidad de operaciones aplicadas con éxito. */
  applied: number;
  /** Operaciones que fallaron (no aplicadas). */
  errors: AssignmentSyncError[];
}

/**
 * Sincroniza un conjunto deseado de asignaciones contra el estado real del
 * servidor:
 *
 * 1. `fetchCurrentIds()` — obtiene los ids actualmente asignados (FRESCO,
 *    nunca un snapshot de la UI).
 * 2. Calcula qué asignar (wanted - current) y qué quitar (current - wanted).
 * 3. Ejecuta cada operación; los errores individuales se recolectan en
 *    `result.errors` sin interrumpir el resto.
 *
 * Lanza solo si `fetchCurrentIds` falla (no hay baseline: nada se aplicó).
 */
export async function syncAssignments(
  fetchCurrentIds: () => Promise<string[]>,
  wantedIds: string[],
  assign: (id: string) => Promise<void>,
  remove: (id: string) => Promise<void>,
): Promise<AssignmentSyncResult> {
  const current = await fetchCurrentIds();
  const currentSet = new Set(current);
  const wantedSet = new Set(wantedIds);

  const toAssign = [...wantedSet].filter((id) => !currentSet.has(id));
  const toRemove = [...currentSet].filter((id) => !wantedSet.has(id));

  const errors: AssignmentSyncError[] = [];
  let applied = 0;

  for (const id of toAssign) {
    try {
      await assign(id);
      applied += 1;
    } catch (err) {
      errors.push({
        type: "assign",
        id,
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }
  for (const id of toRemove) {
    try {
      await remove(id);
      applied += 1;
    } catch (err) {
      errors.push({
        type: "remove",
        id,
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return { applied, errors };
}
