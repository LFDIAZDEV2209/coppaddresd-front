"use client";

import { useEffect, useState } from "react";
import { fetchClinicalBoard } from "../services/patients-service";
import { DEFAULT_CLINICAL_BOARD_FILTERS } from "./use-clinical-board";
import type { ClinicalBoardSummary } from "../types";

/**
 * Resumen clínico del alcance para la Vista general: mismo endpoint del
 * tablero clínico con `pageSize=1` (solo interesa el resumen) y el estado
 * geográfico compartido con el mapa. Si falla, la Vista general sigue
 * funcionando: el resumen es complementario.
 */
export function useClinicalBoardSummary(
  stateCode: string | null,
): ClinicalBoardSummary | null {
  const [entry, setEntry] = useState<{
    stateCode: string | null;
    summary: ClinicalBoardSummary;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchClinicalBoard(
      1,
      1,
      DEFAULT_CLINICAL_BOARD_FILTERS,
      stateCode,
      controller.signal,
    )
      .then((data) => {
        if (active) setEntry({ stateCode, summary: data.summary });
      })
      .catch(() => {
        // Silencioso a propósito: no bloquea la Vista general.
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [stateCode]);

  // Derivado en render: un resumen de otro alcance no se muestra.
  return entry && entry.stateCode === stateCode ? entry.summary : null;
}
