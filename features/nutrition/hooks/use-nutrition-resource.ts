"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";

/** Patrón revision + AbortController del ERP, aislado por sesión y clínica. */
export function useNutritionResource<T>(load: (signal: AbortSignal) => Promise<T>, refreshKey = "") {
  const { user } = useAuth();
  const { activeClinicId, can, loading: contextLoading } = useAppContext();
  const enabled = !contextLoading && (can("Nutrition.Manage") || can("Nutrition.Approve"));
  const identity = `${user?.id ?? ""}:${activeClinicId ?? ""}`;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; identity: string; revision: number; refreshKey: string; data?: T; error?: boolean }>();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ load, identity, revision, refreshKey, data }); },
      () => { if (!controller.signal.aborted) setResult({ load, identity, revision, refreshKey, error: true }); },
    );
    return () => controller.abort();
  }, [load, enabled, identity, revision, refreshKey]);

  const current = enabled && result?.load === load && result.identity === identity && result.revision === revision && result.refreshKey === refreshKey ? result : undefined;
  return { data: current?.data, error: current?.error, loading: enabled && !current, retry: () => setRevision((value) => value + 1) };
}
