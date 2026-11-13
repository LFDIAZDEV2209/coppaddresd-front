"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import type { NutritionScope, NutritionServiceIssue } from "../types/nutrition";
import { nutritionIssue } from "../services/nutrition-service";

/** Patrón revision + AbortController del ERP, aislado por sesión y clínica. */
export function useNutritionResource<T>(load: (signal: AbortSignal, scope: NutritionScope) => Promise<T>, refreshKey = "", listenChanges = false) {
  const { user } = useAuth();
  const { activeClinicId, can, loading: contextLoading } = useAppContext();
  const enabled = !contextLoading && (can("Nutrition.View") || can("Nutrition.Manage") || can("Nutrition.Approve"));
  const identity = `${user?.id ?? ""}:${activeClinicId ?? ""}`;
  const userId = user?.id ?? "";
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; identity: string; revision: number; refreshKey: string; data?: T; error?: NutritionServiceIssue }>();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal, { userId, clinicId: activeClinicId }).then(
      (data) => { if (!controller.signal.aborted) setResult({ load, identity, revision, refreshKey, data }); },
      (error) => { if (!controller.signal.aborted) setResult({ load, identity, revision, refreshKey, error: nutritionIssue(error) }); },
    );
    return () => controller.abort();
  }, [load, enabled, identity, revision, refreshKey, userId, activeClinicId]);

  useEffect(() => {
    if (!listenChanges) return;
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("nutrition-changed", refresh);
    return () => window.removeEventListener("nutrition-changed", refresh);
  }, [listenChanges]);

  const current = enabled && result?.load === load && result.identity === identity && result.revision === revision && result.refreshKey === refreshKey ? result : undefined;
  return { data: current?.data, error: current?.error, loading: enabled && !current, scope: { userId, clinicId: activeClinicId }, retry: () => setRevision((value) => value + 1) };
}
