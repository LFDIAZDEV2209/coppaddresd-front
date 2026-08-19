"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { PaginatedProducts, ProductListItem } from "@/features/inventory/types";
import type {
  CreateStoreItemInput,
  PaginatedStoreItems,
  StoreFilters,
  UpdateStoreItemInput,
} from "../types";
import {
  createStoreItem,
  fetchStoreItems,
  hideStoreItem,
  restoreStoreItem,
  updateStoreItem,
} from "../services/store-service";

export function useStore() {
  const [result, setResult] = useState<PaginatedStoreItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StoreFilters>({ status: "all" });
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchStoreItems(filters, page, 20, controller.signal);
        if (mountedRef.current) setResult(data);
      } catch (err) {
        if (mountedRef.current && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Error al cargar tienda");
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void run();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [filters, page, reload]);

  const retry = useCallback(() => setReload((v) => v + 1), []);

  const addItem = useCallback(
    async (input: CreateStoreItemInput) => {
      await createStoreItem(input);
      retry();
    },
    [retry],
  );

  const editItem = useCallback(
    async (id: string, input: UpdateStoreItemInput) => {
      await updateStoreItem(id, input);
      retry();
    },
    [retry],
  );

  const hideItem = useCallback(
    async (id: string) => {
      await hideStoreItem(id);
      retry();
    },
    [retry],
  );

  const restoreItem = useCallback(
    async (id: string) => {
      await restoreStoreItem(id);
      retry();
    },
    [retry],
  );

  return {
    result,
    loading,
    error,
    filters,
    page,
    setFilters,
    setPage,
    retry,
    addItem,
    editItem,
    hideItem,
    restoreItem,
  };
}

/** Fetch inventory products for the "add to store" dialog. */
export async function fetchAvailableProducts(): Promise<ProductListItem[]> {
  const data = await apiFetch<PaginatedProducts>(
    `${env.apiUrl}/api/v1/inventory/products?pageSize=200`,
  );
  return data.data;
}
