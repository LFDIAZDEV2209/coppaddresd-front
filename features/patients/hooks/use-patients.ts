"use client";

import { useCallback, useEffect, useState } from "react";
import { createPatient, deletePatient, fetchPatients, updatePatient } from "../services/patients-service";
import type { Patient, PatientFilters, PatientInput, PaginatedResult } from "../types";

export function usePatients(pageSize = 6) {
  const [result, setResult] = useState<PaginatedResult<Patient> | null>(null);
  const [filters, setFiltersState] = useState<PatientFilters>({ search: "", status: "all", insurer: "all" });
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchPatients(page, pageSize, filters));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    void fetchPatients(page, pageSize, filters).then((data) => {
      if (!cancelled) setResult(data);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Ocurrió un error inesperado.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [filters, page, pageSize]);

  const setFilters = useCallback((partial: Partial<PatientFilters>) => {
    setFiltersState((current) => ({ ...current, ...partial }));
    setPageState(1);
    setLoading(true);
    setError(null);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
    setLoading(true);
    setError(null);
  }, []);

  const save = useCallback(async (input: PatientInput, id?: string) => {
    setActionLoading(true);
    try {
      if (id) await updatePatient(id, input);
      else await createPatient(input);
      await load();
    } finally {
      setActionLoading(false);
    }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setActionLoading(true);
    try { await deletePatient(id); await load(); }
    finally { setActionLoading(false); }
  }, [load]);

  return { result, filters, loading, error, actionLoading, setFilters, setPage, save, remove, retry: load };
}
