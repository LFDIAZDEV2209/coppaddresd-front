"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  ProgramEnrollment,
  ProgramEnrollmentFilters,
  EnrollPatientInput,
  PaginatedResult,
} from "../types";
import {
  fetchProgramEnrollments,
  enrollPatient,
  pauseEnrollment,
  resumeEnrollment,
  withdrawEnrollment,
} from "../services/program-enrollments-service";

interface UseProgramEnrollmentsReturn {
  result: PaginatedResult<ProgramEnrollment> | null;
  loading: boolean;
  actionLoading: boolean;
  filters: ProgramEnrollmentFilters;
  error: string | null;
  setFilters: (filters: Partial<ProgramEnrollmentFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  enroll: (input: EnrollPatientInput) => Promise<void>;
  pause: (id: string, reason?: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  withdraw: (id: string, reason?: string) => Promise<void>;
  retry: () => void;
}

export function useProgramEnrollments(
  initialPage = 1,
  initialPageSize = 10,
): UseProgramEnrollmentsReturn {
  const [result, setResult] =
    useState<PaginatedResult<ProgramEnrollment> | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [filters, setFiltersState] = useState<ProgramEnrollmentFilters>({
    status: "all",
    patientId: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProgramEnrollments(page, pageSize, filters);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar inscripciones del programa.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const setFilters = useCallback(
    (partial: Partial<ProgramEnrollmentFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...partial }));
      setPageState(1);
    },
    [],
  );

  const setPage = useCallback((p: number) => {
    setPageState(p);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const enroll = useCallback(
    async (input: EnrollPatientInput) => {
      setActionLoading(true);
      try {
        await enrollPatient(input);
        setPageState(1);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const pause = useCallback(
    async (id: string, reason?: string) => {
      setActionLoading(true);
      try {
        await pauseEnrollment(id, reason);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const resume = useCallback(
    async (id: string) => {
      setActionLoading(true);
      try {
        await resumeEnrollment(id);
        await loadData();
      } finally {
        setActionLoading(false);
      }
    },
    [loadData],
  );

  const withdraw = useCallback(
    async (id: string, reason?: string) => {
      setActionLoading(true);
      try {
        await withdrawEnrollment(id, reason);
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
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    enroll,
    pause,
    resume,
    withdraw,
    retry,
  };
}
