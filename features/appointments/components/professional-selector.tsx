"use client";

import { CatalogCombobox } from "@/features/patients/components/catalog-combobox";
import { useT } from "@/providers/i18n-provider";
import {
  useProfessionalOptions,
  type ProfessionalOptions,
} from "../hooks/use-professional-options";

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
  catalog,
  open,
  onOpenChange,
}: {
  value: string;
  onChange: (professionalId: string) => void;
  specialtyId?: string | null;
  ariaLabel?: string;
  catalog?: ProfessionalOptions;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const fallback = useProfessionalOptions(specialtyId, !catalog);
  const { items: professionals, loading } = catalog ?? fallback;

  const selected = professionals.find((p) => p.id === value) ?? null;
  const disabled = loading || professionals.length === 0;

  return (
    <CatalogCombobox<ProfessionalOption>
      open={open}
      onOpenChange={onOpenChange}
      value={selected}
      onSelect={(item) => onChange(item?.id ?? "")}
      items={professionals}
      getLabel={professionalLabel}
      placeholder={
        loading ? t("Cargando profesionales…") : t("Buscar profesional…")
      }
      searchPlaceholder={t("Buscar por nombre…")}
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
