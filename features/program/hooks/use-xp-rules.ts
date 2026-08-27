"use client";

import { useState, useCallback, useEffect } from "react";
import type { XpRule, UpdateXpRuleInput } from "../types";
import { fetchXpRules, updateXpRule } from "../services/program-xp-rules-service";

interface UseXpRulesReturn {
  rules: XpRule[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  updateRule: (code: string, input: UpdateXpRuleInput) => Promise<void>;
  retry: () => void;
}

export function useXpRules(): UseXpRulesReturn {
  const [rules, setRules] = useState<XpRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchXpRules();
      setRules(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar reglas de XP.",
      );
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const updateRule = useCallback(
    async (code: string, input: UpdateXpRuleInput) => {
      setActionLoading(true);
      try {
        await updateXpRule(code, input);
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
    rules,
    loading,
    actionLoading,
    error,
    updateRule,
    retry,
  };
}
