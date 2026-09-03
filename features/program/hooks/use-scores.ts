"use client";

import { useState, useCallback, useRef } from "react";
import type { ScoresResponse } from "../types/scores";
import { calculateScores } from "../services/program-scores-service";

interface UseScoresReturn {
  result: ScoresResponse | null;
  loading: boolean;
  error: string | null;
  calculate: (patientId: string, periodEndLocalDate?: string) => Promise<void>;
  clear: () => void;
}

export function useScores(): UseScoresReturn {
  const [result, setResult] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const calculate = useCallback(
    async (patientId: string, periodEndLocalDate?: string) => {
      // Cancelar petición anterior si existe
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const data = await calculateScores(
          patientId,
          periodEndLocalDate,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setResult(data);
      } catch (err) {
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError") ||
          controller.signal.aborted
        ) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Error al calcular los scores del paciente.",
        );
        setResult(null);
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, calculate, clear };
}
