"use client";

import { useState, useCallback, useRef } from "react";
import { fetchProgramContent, setWeekContent } from "../services/program-content-service";
import { fetchProgramEnrollments } from "../services/program-enrollments-service";
import type {
  ProgramContentResponse,
  ProgramEnrollment,
  SetWeekContentInput,
  PaginatedResult,
} from "../types";

interface UseProgramContentReturn {
  /** Inscripciones activas para el selector. */
  enrollments: ProgramEnrollment[];
  loadingEnrollments: boolean;

  /** Contenido cargado para la inscripción seleccionada. */
  content: ProgramContentResponse | null;
  loading: boolean;
  error: string | null;

  /** Cargar inscripciones activas. */
  loadEnrollments: () => Promise<void>;

  /** Seleccionar inscripción → cargar contenido. */
  selectEnrollment: (enrollmentId: string) => Promise<void>;

  /** Guardar contenido de una semana (PUT) y recargar el timeline. */
  saveWeek: (
    weekNumber: number,
    input: SetWeekContentInput,
  ) => Promise<void>;

  /** Reintentar carga de contenido. */
  retry: () => Promise<void>;

  /** Limpiar selección. */
  clear: () => void;
}

export function useProgramContent(): UseProgramContentReturn {
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const [content, setContent] = useState<ProgramContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrollmentIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    try {
      const result: PaginatedResult<ProgramEnrollment> =
        await fetchProgramEnrollments(1, 200, {
          status: "Active",
          patientId: "",
        });
      setEnrollments(result.data);
    } catch {
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  const selectEnrollment = useCallback(
    async (id: string) => {
      enrollmentIdRef.current = id;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setContent(null);

      try {
        const data = await fetchProgramContent(id, controller.signal);
        setContent(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar el contenido del programa.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const saveWeek = useCallback(
    async (weekNumber: number, input: SetWeekContentInput) => {
      const id = enrollmentIdRef.current;
      if (!id) throw new Error("No hay inscripción seleccionada.");

      await setWeekContent(id, weekNumber, input);

      // Recargar contenido completo para mantener consistencia
      const data = await fetchProgramContent(id);
      setContent(data);
    },
    [],
  );

  const retry = useCallback(async () => {
    const id = enrollmentIdRef.current;
    if (id) await selectEnrollment(id);
  }, [selectEnrollment]);

  const clear = useCallback(() => {
    enrollmentIdRef.current = null;
    abortRef.current?.abort();
    setContent(null);
    setError(null);
  }, []);

  return {
    enrollments,
    loadingEnrollments,
    content,
    loading,
    error,
    loadEnrollments,
    selectEnrollment,
    saveWeek,
    retry,
    clear,
  };
}
