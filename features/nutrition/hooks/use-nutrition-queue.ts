"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNutritionQueue } from "../services/nutrition-service";
import type { NutritionFilter, NutritionQueueQuery } from "../types/nutrition";
import { useNutritionResource } from "./use-nutrition-resource";

export function useNutritionQueue() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<NutritionQueueQuery>({ search: "", state: "all", page: 1, pageSize: 10 });
  useEffect(() => {
    const timer = setTimeout(() => setQuery((prev) => prev.search === search.trim() ? prev : { ...prev, search: search.trim(), page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback((signal: AbortSignal) => fetchNutritionQueue(query, signal), [query]);
  const resource = useNutritionResource(load);
  return {
    ...resource, search, setSearch, query,
    setState: (state: NutritionFilter) => setQuery((prev) => ({ ...prev, state, page: 1 })),
    setPage: (page: number) => setQuery((prev) => ({ ...prev, page })),
  };
}
