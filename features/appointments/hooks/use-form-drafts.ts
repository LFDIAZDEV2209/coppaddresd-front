"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Borradores de formularios médicos de una consulta (orden de laboratorio,
 * medicamentos, procedimientos). Se persisten en localStorage por cita para
 * que sobrevivan a recargas sin tocar el esquema clínico del backend; el
 * encuentro clínico (historia SOAP) sigue viviendo en el backend.
 */

export interface LabTestItem {
  id: string;
  test: string;
  priority: "Rutina" | "Urgente" | "Prioritaria";
}

export interface LabOrderDraft {
  sampleType: string;
  tests: LabTestItem[];
  notes: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
}

export interface MedicationDraft {
  items: MedicationItem[];
  notes: string;
}

export interface ProcedureItem {
  id: string;
  name: string;
  site: string;
  notes: string;
}

export interface ProcedureDraft {
  items: ProcedureItem[];
}

export interface FormDrafts {
  labOrder: LabOrderDraft;
  medications: MedicationDraft;
  procedures: ProcedureDraft;
}

export const EMPTY_LAB_ORDER: LabOrderDraft = {
  sampleType: "Sangre",
  tests: [],
  notes: "",
};
export const EMPTY_MEDICATIONS: MedicationDraft = { items: [], notes: "" };
export const EMPTY_PROCEDURES: ProcedureDraft = { items: [] };

const EMPTY_DRAFTS: FormDrafts = {
  labOrder: EMPTY_LAB_ORDER,
  medications: EMPTY_MEDICATIONS,
  procedures: EMPTY_PROCEDURES,
};

const storageKey = (appointmentId: string) =>
  `teleconsult:forms:${appointmentId}`;

function loadDrafts(appointmentId: string): FormDrafts {
  if (typeof window === "undefined") return EMPTY_DRAFTS;
  try {
    const raw = window.localStorage.getItem(storageKey(appointmentId));
    if (!raw) return EMPTY_DRAFTS;
    const parsed = JSON.parse(raw) as Partial<FormDrafts>;
    return {
      labOrder: { ...EMPTY_LAB_ORDER, ...parsed.labOrder },
      medications: { ...EMPTY_MEDICATIONS, ...parsed.medications },
      procedures: { ...EMPTY_PROCEDURES, ...parsed.procedures },
    };
  } catch {
    return EMPTY_DRAFTS;
  }
}

export function useFormDrafts(appointmentId: string) {
  const [drafts, setDrafts] = useState<FormDrafts>(() =>
    loadDrafts(appointmentId),
  );

  const persist = useCallback(
    (next: FormDrafts) => {
      setDrafts(next);
      try {
        window.localStorage.setItem(
          storageKey(appointmentId),
          JSON.stringify(next),
        );
      } catch {
        // Almacenamiento no disponible (modo privado): el borrador queda en memoria.
      }
    },
    [appointmentId],
  );

  const updateLabOrder = useCallback(
    (patch: Partial<LabOrderDraft>) => {
      setDrafts((prev) => {
        const next = { ...prev, labOrder: { ...prev.labOrder, ...patch } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateMedications = useCallback(
    (patch: Partial<MedicationDraft>) => {
      setDrafts((prev) => {
        const next = {
          ...prev,
          medications: { ...prev.medications, ...patch },
        };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateProcedures = useCallback(
    (patch: Partial<ProcedureDraft>) => {
      setDrafts((prev) => {
        const next = { ...prev, procedures: { ...prev.procedures, ...patch } };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearForm = useCallback(
    (form: keyof FormDrafts) => {
      setDrafts((prev) => {
        const next = { ...prev, [form]: EMPTY_DRAFTS[form] };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return useMemo(
    () => ({
      drafts,
      updateLabOrder,
      updateMedications,
      updateProcedures,
      clearForm,
    }),
    [drafts, updateLabOrder, updateMedications, updateProcedures, clearForm],
  );
}

export function newItemId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
