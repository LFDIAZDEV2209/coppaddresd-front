"use client";

import { useState, useCallback, useEffect } from "react";
import type { ClinicalReview, PaginatedResult } from "../types";
import {
  fetchClinicalReviews,
  decideClinicalReview,
} from "../services/program-clinical-reviews-service";

interface UseClinicalReviewsReturn {
  result: PaginatedResult<ClinicalReview> | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  decide: (id: string, approve: boolean) => Promise<void>;
  retry: () => void;
}

export function useClinicalReviews(
  initialPage = 1,
  initialPageSize = 20,
): UseClinicalReviewsReturn {
  const [result, setResult] =
    useState<PaginatedResult<ClinicalReview> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClinicalReviews(page, pageSize);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar revisiones clínicas.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const decide = useCallback(
    async (id: string, approve: boolean) => {
      setActionLoading(true);
      try {
        await decideClinicalReview(id, approve);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    result,
    loading,
    actionLoading,
    error,
    setPage,
    setPageSize,
    decide,
    retry,
  };
}
