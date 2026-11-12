"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchProfessionalsCatalog } from "../services/reference-service";
import type { ProfessionalCatalogItemDto } from "../types";

export function useProfessionalOptions(
  specialtyId?: string | null,
  enabled = true,
) {
  const [revision, setRevision] = useState(0);
  const key = `${specialtyId ?? "all"}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    items: ProfessionalCatalogItemDto[];
    failed: boolean;
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void fetchProfessionalsCatalog({ pageSize: 100, status: "Active" })
      .then((response) => {
        if (!active) return;
        const items = specialtyId
          ? response.data.filter((p) =>
              p.specialties.some((s) => s.id === specialtyId),
            )
          : response.data;
        setResult({ key, items, failed: false });
      })
      .catch(() => {
        if (active) setResult({ key, items: [], failed: true });
      });
    return () => {
      active = false;
    };
  }, [enabled, key, specialtyId]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const loading = enabled && result?.key !== key;
  return {
    items: result?.key === key ? result.items : [],
    loading,
    error: !loading && !!result?.failed,
    retry,
  };
}
export type ProfessionalOptions = ReturnType<typeof useProfessionalOptions>;
