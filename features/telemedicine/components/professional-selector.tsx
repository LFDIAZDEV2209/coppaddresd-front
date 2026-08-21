"use client";

import { useEffect, useState } from "react";
import { fetchProfessionalsCatalog } from "../services/reference-service";

export interface ProfessionalOption {
  id: string;
  fullName: string;
  professionalTypeName: string | null;
}

/**
 * Selector de profesional clínico (catálogo del backend) para la vista global
 * del administrador: agenda y calendario de cualquier profesional. Reutilizado
 * por todas las vistas "todas las agendas" (declarativo, sin duplicación).
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
        if (!result.data.some((p) => p.id === value) && result.data.length > 0) {
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

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || professionals.length === 0}
        className="h-9 min-w-56 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Profesional"
      >
        {loading && <option value="">Cargando profesionales...</option>}
        {!loading &&
          professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.fullName}
              {professional.professionalTypeName
                ? ` · ${professional.professionalTypeName}`
                : ""}
            </option>
          ))}
      </select>
      {selected && (
        <span className="text-[12px] text-muted-foreground">
          {selected.fullName}
        </span>
      )}
    </div>
  );
}