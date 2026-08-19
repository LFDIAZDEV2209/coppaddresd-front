"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchMyContext, type MyClinic, type MyContext } from "@/lib/api/context-service";
import { getActiveClinicId, setActiveClinicId } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";

interface ContextValue {
  /** Contexto del ERP (org, clínicas, permisos por clínica). null si sin empleado o sin datos. */
  context: MyContext | null;
  loading: boolean;
  /** Clínica activa del switcher (null = contexto global). */
  activeClinicId: string | null;
  /** Clínica activa con sus datos, o null si no hay clínica seleccionada. */
  activeClinic: MyClinic | null;
  setActiveClinic: (clinicId: string | null) => void;
  /**
   * ¿Tiene el permiso en el contexto actual? Combina el permiso global del
   * usuario (claims JWT, vía AuthSession) con el permiso scoped de la clínica
   * activa. Sin clínica activa, solo aplica el global.
   */
  can: (permissionCode: string) => boolean;
}

const ContextCtx = createContext<ContextValue | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [context, setContext] = useState<MyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClinicIdState, setActiveClinicIdState] = useState<string | null>(() =>
    getActiveClinicId(),
  );

  // Carga el contexto del ERP cuando hay sesión. En recarga, la clínica activa
  // no persiste (se restaura con el default del backend o se deja global).
  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const ctx = await fetchMyContext();
        if (cancelled) return;
        setContext(ctx);
        const firstClinic = ctx.clinics.find((c) => c.isPrimary) ?? ctx.clinics[0];
        if (firstClinic && !getActiveClinicId()) {
          setActiveClinicId(firstClinic.id);
          setActiveClinicIdState(firstClinic.id);
        }
      } catch {
        // Sin contexto (usuario sin empleado o servicio caído): se deja vacío.
        if (!cancelled) setContext(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const setActiveClinic = useCallback((clinicId: string | null) => {
    setActiveClinicId(clinicId);
    setActiveClinicIdState(clinicId);
  }, []);

  const activeClinic = useMemo(
    () => context?.clinics.find((c) => c.id === activeClinicIdState) ?? null,
    [context, activeClinicIdState],
  );

  const can = useCallback(
    (permissionCode: string) => {
      // Permiso global del token (aplica en cualquier contexto).
      if (user?.permissions.includes(permissionCode)) return true;
      // Permiso scoped de la clínica activa.
      if (activeClinic?.permissions.includes(permissionCode)) return true;
      return false;
    },
    [user, activeClinic],
  );

  const value = useMemo(
    () => ({
      context,
      loading,
      activeClinicId: activeClinicIdState,
      activeClinic,
      setActiveClinic,
      can,
    }),
    [context, loading, activeClinicIdState, activeClinic, setActiveClinic, can],
  );

  return <ContextCtx.Provider value={value}>{children}</ContextCtx.Provider>;
}

export function useAppContext() {
  const ctx = useContext(ContextCtx);
  if (!ctx) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return ctx;
}
