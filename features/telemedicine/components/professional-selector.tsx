"use client";

import { useEffect, useState } from "react";
import { CatalogCombobox } from "@/features/patients/components/catalog-combobox";
import { fetchProfessionalsCatalog } from "../services/reference-service";

export interface ProfessionalOption {
  id: string;
  fullName: string;
  professionalTypeName: string | null;
}

/** Etiqueta de cada opción: "Nombre · Tipo de profesional". Estable para el memo del combobox. */
function professionalLabel(professional: ProfessionalOption): string {
  return professional.professionalTypeName
    ? `${professional.fullName} · ${professional.professionalTypeName}`
    : professional.fullName;
}

/**
 * Selector de profesional clínico (catálogo del backend) para la vista global
 * del administrador: agenda y calendario de cualquier profesional. Reutilizado
 * por todas las vistas "todas las agendas" (declarativo, sin duplicación).
 * Combobox buscable con filtro local sobre la lista de profesionales activos.
 */
export function ProfessionalSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (professionalId: string) => void;
}) {
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchProfessionalsCatalog({ pageSize: 100, status: "Active" })
      .then((result) => {
        if (!active) return;
        setProfessionals(result.data);
        if (
          !result.data.some((p) => p.id === value) &&
          result.data.length > 0
        ) {
          onChange(result.data[0].id);
        }
      })
      .catch(() => {
        if (active) setProfessionals([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = professionals.find((p) => p.id === value) ?? null;
  const disabled = loading || professionals.length === 0;

  return (
    <CatalogCombobox<ProfessionalOption>
      value={selected}
      onSelect={(item) => onChange(item?.id ?? "")}
      items={professionals}
      getLabel={professionalLabel}
      placeholder={loading ? "Cargando profesionales…" : "Buscar profesional…"}
      searchPlaceholder="Buscar por nombre…"
      emptyText="Sin profesionales activos."
      disabled={disabled}
      className="min-w-56"
    />
  );
}
