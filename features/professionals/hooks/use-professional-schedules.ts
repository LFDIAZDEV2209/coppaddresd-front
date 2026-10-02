"use client";

/**
 * Estado de horarios semanales del profesional: lectura (skeleton/error/
 * data) y edición inline con guardado y rollback.
 * Fetch al montar con AbortController; save envía el set completo (PUT
 * total-replace del contrato). El retorno usa los datos que ya responde el
 * backend (203/204 sin cuerpo) tras re-lectura para mantener la fuente
 * de verdad en el servidor.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSchedules,
  updateSchedules,
} from "@/features/professionals/services/schedules-service";
import type {
  ProfessionalScheduleDto,
  ScheduleFormRow,
} from "@/features/professionals/types/schedule";

/** Mensaje de error genérico cuando el backend no da detalle legible. */
const FALLBACK_ERROR = "Ocurrió un error inesperado.";

export function useProfessionalSchedules(
  professionalId: string | null | undefined,
) {
  const [schedules, setSchedules] = useState<ProfessionalScheduleDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  /** Borrador en edición (null = modo lectura); antes de guardar se restaura. */
  const [draft, setDraft] = useState<ScheduleFormRow[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** Mensaje del último fallo de guardado (lo muestra el toast del componente). */
  const [saveError, setSaveError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  /**
   * Lectura (re)ejecutable. Los setState van diferidos en un timer porque la
   * regla react-hooks/set-state-in-effect prohíbe setState síncrono dentro
   * del efecto; el patrón es el mismo de use-professionals.ts.
   */
  const load = useCallback(async (professionalId: string, version: number) => {
    try {
      const data = await getSchedules(professionalId);
      if (requestVersion.current !== version) return;
      setSchedules(data);
      setError(null);
      setIsLoading(false);
    } catch (cause: unknown) {
      if (requestVersion.current !== version) return;
      if (cause instanceof Error && cause.name !== "AbortError") {
        setError(cause instanceof Error ? cause.message : FALLBACK_ERROR);
      }
      setIsLoading(false);
    }
  }, []);

  // Lectura al montar / retry.
  useEffect(() => {
    const prime = (hasId: boolean) => {
      if (hasId) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoading(false);
      }
    };
    if (!professionalId) {
      const skip = setTimeout(() => prime(false), 0);
      return () => clearTimeout(skip);
    }
    const controller = new AbortController();
    const version = ++requestVersion.current;
    const timer = setTimeout(() => {
      prime(true);
      void load(professionalId, version);
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [professionalId, load]);

  /** Reintenta la lectura (botón Reintentar del estado de error). */
  const retry = useCallback(() => {
    if (!professionalId) return;
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    void load(professionalId, version);
  }, [professionalId, load]);

  const startEdit = useCallback(() => {
    setSaveError(null);
    setDraft(schedules.map((slot) => ({ ...slot })));
    setIsEditing(true);
  }, [schedules]);

  const updateDraft = useCallback((rows: ScheduleFormRow[]) => {
    setDraft(rows);
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
    setSaveError(null);
  }, []);

  /**
   * Guarda el borrador con el PUT total-replace. Devuelve true si el backend
   * aceptó; en error devuelve false y restaura el borrador anterior (la
   * vista queda en edición para corregir).
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!professionalId || !draft) return false;
    setIsSaving(true);
    setSaveError(null);
    const previousDraft = draft;
    try {
      await updateSchedules(
        professionalId,
        draft.map((slot) => ({
          weekday: slot.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
      );
      // El PUT reemplaza y no devuelve cuerpo: re-lectura para quedar en la
      // fuente de verdad del backend (incluye el sort por weekday).
      const data = await getSchedules(professionalId);
      setSchedules(data);
      setIsEditing(false);
      setDraft(null);
      setIsSaving(false);
      return true;
    } catch (cause: unknown) {
      // Rollback: restaura el estado previo y permanece en edición.
      setDraft(previousDraft.map((slot) => ({ ...slot })));
      setSaveError(cause instanceof Error ? cause.message : FALLBACK_ERROR);
      setIsSaving(false);
      return false;
    }
  }, [professionalId, draft]);

  return {
    schedules,
    isLoading,
    error,
    isEditing,
    /** Borrador actual en edición (solo cuando isEditing). */
    draft,
    updateDraft,
    isSaving,
    saveError,
    /** Limpia el error de guardado (al cerrar el toast, p. ej.). */
    clearSaveError: useCallback(() => setSaveError(null), []),
    startEdit,
    cancelEdit,
    save,
    retry,
  };
}
