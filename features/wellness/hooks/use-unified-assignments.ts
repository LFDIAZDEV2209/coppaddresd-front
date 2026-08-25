"use client";

import { useState, useCallback, useEffect } from "react";
import type { UnifiedAssignment } from "../types";
import {
  fetchAllAssignments,
  deleteUnifiedAssignment,
} from "../services/assignments-service";
import { subscribeAssignmentsRefresh } from "./assignments-refresh";

interface UseUnifiedAssignmentsReturn {
  items: UnifiedAssignment[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  remove: (id: string, type: "routine" | "nutrition") => Promise<void>;
  retry: () => void;
}

export function useUnifiedAssignments(): UseUnifiedAssignmentsReturn {
  const [items, setItems] = useState<UnifiedAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllAssignments();
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar asignaciones.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  // Recargar cuando se crea un plan/rutina personalizado desde otro hook
  // (la creación genera una asignación atómica en el backend).
  useEffect(() => {
    return subscribeAssignmentsRefresh(() => {
      setReloadKey((key) => key + 1);
    });
  }, []);

  const remove = useCallback(
    async (id: string, type: "routine" | "nutrition") => {
      setActionLoading(true);
      try {
        await deleteUnifiedAssignment(id, type);
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
    items,
    loading,
    actionLoading,
    error,
    remove,
    retry,
  };
}
