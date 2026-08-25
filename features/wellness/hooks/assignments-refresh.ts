// Canal de refresco para las asignaciones unificadas.
//
// Los hooks de guardado (use-exercise-routines, use-nutrition-plans) notifican
// tras crear un ítem (el backend crea la asignación de forma atómica cuando
// llega patientId). use-unified-assignments se suscribe y recarga su listado.
// Si el hook de asignaciones no está montado, la notificación es un no-op.
type AssignmentsRefreshListener = () => void;

const listeners = new Set<AssignmentsRefreshListener>();

export function subscribeAssignmentsRefresh(
  listener: AssignmentsRefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyAssignmentsRefresh(): void {
  listeners.forEach((listener) => listener());
}