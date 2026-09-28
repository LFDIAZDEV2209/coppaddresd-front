"use client";

import { useEffect, useState } from "react";
import { CatalogCombobox } from "@/features/patients/components/catalog-combobox";
import { useT } from "@/providers/i18n-provider";
import { fetchProfessionalsCatalog } from "../services/reference-service";

export interface ProfessionalOption {
  id: string;
  fullName: string;
  professionalTypeName: string | null;
  specialties: Array<{ id: string; name: string }>;
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
  specialtyId,
  ariaLabel,
}: {
  value: string;
  onChange: (professionalId: string) => void;
  specialtyId?: string | null;
  ariaLabel?: string;
}) {
  const t = useT();
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchProfessionalsCatalog({ pageSize: 100, status: "Active" })
      .then((result) => {
        if (!active) return;
        const filtered = specialtyId
          ? result.data.filter((professional) =>
              professional.specialties.some(
                (specialty) => specialty.id === specialtyId,
              ),
            )
          : result.data;
        setProfessionals(filtered);
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
  }, [specialtyId]);

  const selected = professionals.find((p) => p.id === value) ?? null;
  const disabled = loading || professionals.length === 0;

  return (
    <CatalogCombobox<ProfessionalOption>
      value={selected}
      onSelect={(item) => onChange(item?.id ?? "")}
      items={professionals}
      getLabel={professionalLabel}
      placeholder={loading ? t('Cargando profesionales…') : t('Buscar profesional…')}
      searchPlaceholder={t('Buscar por nombre…')}
      ariaLabel={ariaLabel ?? t("Profesional")}
      emptyText={
        specialtyId
          ? t("Sin profesionales activos para esta especialidad.")
          : t("Sin profesionales activos.")
      }
      disabled={disabled}
      className="min-w-56"
    />
  );
}
