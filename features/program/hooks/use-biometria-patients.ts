"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  PaginatedBiometriaPatients,
} from "../types/erp";
import { fetchBiometriaPatients } from "../services/program-biometria-service";

export interface BiometriaPatientsFilters {
  page: number;
  pageSize: number;
  search: string;
  gender: string;
  imcCategory: string;
  glucosaCategory: string;
  grasaCategory: string;
  trend: string;
  cityId: string | null;
  stateAbbr: string | null;
}

export function useBiometriaPatients(initialFilters?: Partial<BiometriaPatientsFilters>) {
  const [filters, setFilters] = useState<BiometriaPatientsFilters>({
    page: 1,
    pageSize: 5,
    search: "",
    gender: "",
    imcCategory: "",
    glucosaCategory: "",
    grasaCategory: "",
    trend: "",
    cityId: null,
    stateAbbr: null,
    ...initialFilters,
  });

  const [data, setData] = useState<PaginatedBiometriaPatients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBiometriaPatients({
        page: filters.page,
        pageSize: filters.pageSize,
        search: filters.search,
        gender: filters.gender,
        imcCategory: filters.imcCategory,
        glucosaCategory: filters.glucosaCategory,
        grasaCategory: filters.grasaCategory,
        trend: filters.trend,
        cityId: filters.cityId,
        stateAbbr: filters.stateAbbr,
      });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar pacientes de biometría.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, reloadKey]);

  useEffect(() => {
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const retry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const updateFilters = useCallback((patch: Partial<BiometriaPatientsFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? (
        patch.search !== prev.search ||
        patch.gender !== prev.gender ||
        patch.imcCategory !== prev.imcCategory ||
        patch.glucosaCategory !== prev.glucosaCategory ||
        patch.grasaCategory !== prev.grasaCategory ||
        patch.trend !== prev.trend ||
        patch.cityId !== prev.cityId ||
        patch.stateAbbr !== prev.stateAbbr
          ? 1
          : prev.page
      ),
    }));
  }, []);

  return { data, loading, error, filters, updateFilters, retry };
}
