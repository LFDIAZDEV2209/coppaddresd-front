"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Título dinámico de la hoja del breadcrumb (F9). Una page de detalle lo
 * define con `useBreadcrumbTitle(título)` una vez que conoce el nombre del
 * registro; el Topbar lo consume para reemplazar la hoja genérica
 * ("Detalle de X") por el nombre real. El override se limpia al desmontar
 * o cuando el título cambia, nunca filtra a otras rutas.
 */

interface BreadcrumbTitleValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const BreadcrumbTitleContext = createContext<BreadcrumbTitleValue | null>(null);

export function BreadcrumbTitleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return (
    <BreadcrumbTitleContext.Provider value={value}>
      {children}
    </BreadcrumbTitleContext.Provider>
  );
}

function useBreadcrumbTitleContext(): BreadcrumbTitleValue {
  const ctx = useContext(BreadcrumbTitleContext);
  if (!ctx) {
    throw new Error(
      "useBreadcrumbTitle solo puede usarse dentro de <BreadcrumbTitleProvider>.",
    );
  }
  return ctx;
}

/**
 * Registro declarativo del título de la hoja: se aplica al montar/cambiar
 * y se limpia al desmontar (evita fugas a la ruta anterior).
 */
export function useBreadcrumbTitle(title: string | null) {
  const { setTitle } = useBreadcrumbTitleContext();
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}

/** Reader del Topbar (sin setter para no encimar estados). */
export function useBreadcrumbOverride(): string | null {
  return useBreadcrumbTitleContext().title;
}

/** Setter directo (por si una vista necesita limpiarlo manualmente). */
export function useBreadcrumbTitleSetter(): (title: string | null) => void {
  return useBreadcrumbTitleContext().setTitle;
}
