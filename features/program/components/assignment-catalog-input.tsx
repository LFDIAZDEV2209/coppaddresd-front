"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { useT } from "@/providers/i18n-provider";
import { fetchNutritionPlans } from "@/features/wellness/services/nutrition-plans-service";
import { fetchExerciseRoutines } from "@/features/wellness/services/exercise-routines-service";
import { useAssignmentResource } from "../hooks/use-assignment-resource";

export function AssignmentCatalogInput({ kind, value, onChange, disabled }: { kind: "nutrition" | "routine"; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const t = useT();
  const id = useId();
  const [search, setSearch] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(value), 350);
    return () => clearTimeout(timer);
  }, [value]);
  const load = useCallback(async (signal: AbortSignal) => {
    const result = kind === "nutrition"
      ? await fetchNutritionPlans(1, 100, { search, isTemplate: "all", status: "Active" }, signal)
      : await fetchExerciseRoutines(1, 100, { search, category: "all", status: "Active" }, signal);
    return result.data;
  }, [search, kind]);
  const { data, error, loading } = useAssignmentResource(load);
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{t(kind === "nutrition" ? "Ajustar plan nutricional" : "Ajustar rutina")}</label><Input id={id} list={`${id}-options`} value={value} maxLength={200} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-hint`} className="h-10" /><datalist id={`${id}-options`}>{data?.map((item) => <option key={item.id} value={item.name} />)}</datalist><p id={`${id}-hint`} role="status" className="text-xs text-muted-foreground">{t(error ? "No pudimos consultar el catálogo. Escribe el nombre exacto; se validará al aplicar." : loading ? "Buscando en el catálogo…" : "Escribe para buscar contenido activo del catálogo.")}</p></div>;
}
