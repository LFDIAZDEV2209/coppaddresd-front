"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/providers/context-provider";

export function useAssignmentResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const { activeClinicId } = useAppContext();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; clinicId: string | null; data?: T; error?: boolean }>();
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ load, revision, clinicId: activeClinicId, data }); },
      () => { if (!controller.signal.aborted) setResult({ load, revision, clinicId: activeClinicId, error: true }); },
    );
    return () => controller.abort();
  }, [load, revision, activeClinicId]);
  const current = result?.load === load && result.revision === revision && result.clinicId === activeClinicId ? result : undefined;
  return { data: current?.data, error: current?.error, loading: !current, retry: () => setRevision((value) => value + 1) };
}
