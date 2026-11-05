"use client";

import { useEffect, useRef, useState } from "react";
import type { NutritionAction, NutritionActionOptions, NutritionCycle, NutritionFood, NutritionPatientDetail, NutritionServiceIssue } from "../types/nutrition";
import { nutritionIssue, performNutritionAction, saveNutritionDraft } from "../services/nutrition-service";

/** Guarda en serie y agrupa ediciones mientras espera al servidor. */
export function useNutritionEditor(initial: NutritionPatientDetail, catalog: NutritionFood[], canManage: boolean, canApprove: boolean) {
  const [patient, setPatient] = useState(initial);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveError, setSaveError] = useState<NutritionServiceIssue | null>(null);
  const [actionError, setActionError] = useState<NutritionServiceIssue | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useRef(initial);
  const server = useRef(initial);
  const generation = useRef(0);
  const desired = useRef<{ cycle: NutritionCycle; generation: number } | null>(null);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const running = useRef(false);
  const saved = useRef(true);
  const inAction = useRef(false);
  const lifetime = useRef<AbortController | null>(null);
  const uncertain = (issue: NutritionServiceIssue | null) => !!issue && (issue.kind === "contract" || issue.kind === "conflict" || issue.status === 0 || issue.status >= 500);
  const reloadRequired = uncertain(saveError) || uncertain(actionError);
  const editable = canManage && !!patient.cycle && ["borrador_ia", "devuelto"].includes(patient.cycle.state) && !busy && !reloadRequired;

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!saved.current) event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { controller.abort(); window.removeEventListener("beforeunload", beforeUnload); };
  }, []);

  function persist(next: NutritionPatientDetail, version: number) {
    if (!next.cycle || !lifetime.current || lifetime.current.signal.aborted) return;
    desired.current = { cycle: structuredClone(next.cycle), generation: version };
    saved.current = false; setSaveStatus("saving"); setSaveError(null);
    if (running.current) return;
    running.current = true;
    const signal = lifetime.current.signal;
    pending.current = (async () => {
      while (desired.current && !signal.aborted) {
        const job = desired.current; desired.current = null;
        try {
          const result = await saveNutritionDraft(server.current, job.cycle, server.current.cycle!, server.current.revision, catalog, signal);
          server.current = result;
          if (signal.aborted) return;
          if (job.generation === generation.current) {
            current.current = result; setPatient(result); saved.current = true; setSaveStatus("saved");
          }
        } catch (error) {
          desired.current = null;
          if (!signal.aborted) { saved.current = false; setSaveStatus("error"); setSaveError(nutritionIssue(error)); }
          break;
        }
      }
    })().finally(() => { running.current = false; });
  }

  function updateCycle(transform: (cycle: NutritionCycle) => NutritionCycle) {
    if (!editable || inAction.current || !current.current.cycle) return;
    const next = { ...current.current, cycle: transform(structuredClone(current.current.cycle)) };
    current.current = next; setPatient(next); setActionError(null);
    persist(next, ++generation.current);
  }

  async function act(action: NutritionAction, options: NutritionActionOptions = {}) {
    const reviewAction = action === "approve" || action === "return";
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted || inAction.current || reloadRequired || (reviewAction ? !canApprove : !canManage)) return false;
    inAction.current = true; setBusy(true); setActionError(null);
    try {
      await pending.current;
      if (!saved.current || signal.aborted) return false;
      const result = await performNutritionAction(server.current, action, server.current.revision, catalog, options, signal);
      if (signal.aborted) return false;
      current.current = result; server.current = result; setPatient(result); setSaveStatus("saved");
      return true;
    } catch (error) { if (!signal.aborted) setActionError(nutritionIssue(error)); return false; }
    finally { inAction.current = false; if (!signal.aborted) setBusy(false); }
  }

  function retrySave() { if (!reloadRequired) persist(current.current, generation.current); }
  return { patient, editable, updateCycle, saveStatus, saveError, busy, actionError, reloadRequired, act, retrySave };
}
