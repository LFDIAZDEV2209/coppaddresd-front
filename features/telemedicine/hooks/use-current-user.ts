"use client";

import { useState, useCallback, useEffect } from "react";
import type { CurrentUserContextDto } from "../types";
import { fetchCurrentUserContext } from "../services/telemedicine-service";

interface UseCurrentUserReturn {
  context: CurrentUserContextDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Contexto del usuario autenticado para Telemedicina (profesional y/o paciente
 * resueltos por el JWT en /me). Es la base del dashboard y de "mi agenda".
 */
export function useCurrentUser(): UseCurrentUserReturn {
  const [context, setContext] = useState<CurrentUserContextDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchCurrentUserContext();
        if (!active) return;
        setContext(result);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudo resolver el perfil de telemedicina.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return { context, loading, error, refetch };
}
