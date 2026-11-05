"use client";

import { useRef, useState } from "react";
import type { NutritionActor, NutritionCycle, NutritionPatientDetail, NutritionScope } from "../types/nutrition";
import { performNutritionAction, saveNutritionDraft } from "../services/nutrition-service";
import type { NutritionMockAction } from "../services/nutrition-mock-workspace";

/** Guardado serial: una respuesta anterior nunca sustituye una edición nueva. */
export function useNutritionEditor(initial: NutritionPatientDetail, scope: NutritionScope, actor: NutritionActor, canManage: boolean, canApprove: boolean) {
  const [patient, setPatient] = useState(initial);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const current = useRef(initial);
  const revision = useRef(initial.revision);
  const generation = useRef(0);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const saved = useRef(true);
  const inAction = useRef(false);
  const editable = canManage && !!patient.cycle && ["borrador_ia", "devuelto"].includes(patient.cycle.state) && !busy;

  function persist(next: NutritionPatientDetail, version: number) {
    if (!next.cycle) return;
    const snapshot = structuredClone(next.cycle);
    saved.current = false;
    setSaveStatus("saving");
    pending.current = pending.current.then(async () => {
      const result = await saveNutritionDraft(next.patientId, snapshot, revision.current, scope);
      revision.current = result.revision;
      if (version === generation.current) {
        current.current = result; setPatient(result); saved.current = true; setSaveStatus("saved");
      }
    }).catch(() => { saved.current = false; setSaveStatus("error"); });
  }

  function updateCycle(transform: (cycle: NutritionCycle) => NutritionCycle) {
    if (!editable || inAction.current || !current.current.cycle) return;
    const next = { ...current.current, cycle: transform(structuredClone(current.current.cycle)) };
    current.current = next; setPatient(next); setActionError(false);
    persist(next, ++generation.current);
  }

  async function act(action: NutritionMockAction, options: { comment?: string; criticalConfirmed?: boolean } = {}) {
    const reviewAction = action === "approve" || action === "return";
    if (inAction.current || (reviewAction ? !canApprove : !canManage)) return false;
    inAction.current = true; setBusy(true); setActionError(false);
    try {
      await pending.current;
      if (!saved.current) throw new Error("nutrition-save-failed");
      const result = await performNutritionAction(initial.patientId, action, revision.current, actor, scope, options);
      current.current = result; revision.current = result.revision; setPatient(result); setSaveStatus("saved");
      return true;
    } catch { setActionError(true); return false; }
    finally { inAction.current = false; setBusy(false); }
  }

  function retrySave() { persist(current.current, generation.current); }

  return { patient, editable, updateCycle, saveStatus, busy, actionError, act, retrySave };
}
