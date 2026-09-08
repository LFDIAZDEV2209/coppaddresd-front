/**
 * Paso de profesión — extraído del monolito ProfessionalWizard (paso 3,
 * líneas 959–1098). Solo se muestra en modo profesional.
 * Tipo de profesional + especialidades por categoría.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Info,
  Loader2,
  Stethoscope,
  X,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "@/features/professionals/services/professional-catalogs-service";
import { cn } from "@/lib/utils";
import { SPECIALTY_CATEGORIES } from "../wizard-state";

interface ProfessionStepProps {
  professionalTypeId: string;
  specialtyIds: string[];
  setProfessionalTypeId: (id: string) => void;
  setSpecialtyIds: (ids: string[]) => void;
  types: ProfessionalTypeDto[];
  specialties: SpecialtyDto[];
  loading?: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function ProfessionStep({
  professionalTypeId,
  specialtyIds,
  setProfessionalTypeId,
  setSpecialtyIds,
  types,
  specialties,
  loading = false,
  onNext,
  onBack,
}: ProfessionStepProps) {
  const t = useT();

  const selectedType = useMemo(
    () => types.find((tp) => tp.id === professionalTypeId) ?? null,
    [types, professionalTypeId],
  );

  const validSpecialtyIds = useMemo(
    () => new Set(selectedType?.validSpecialtyIds ?? []),
    [selectedType],
  );

  const specialtiesByCategory = useMemo(() => {
    const valid = specialties.filter((s) => validSpecialtyIds.has(s.id));
    return SPECIALTY_CATEGORIES.map((category) => ({
      category,
      items: valid.filter((s) => s.category === category),
    })).filter((g) => g.items.length > 0);
  }, [specialties, validSpecialtyIds]);

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Profesión y especialidades")}
        description={t("Tipo de profesional y áreas que puede atender")}
        icon={Stethoscope}
        variant="primary"
      />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-[12.5px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          {t(
            "Opcional: si lo dejas vacío, el profesional lo completará al aceptar la invitación (perfil autogestionable).",
          )}
        </p>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-semibold text-muted-foreground">
            {t("Tipo de profesional")}
            <span className="ml-1.5 text-[11px] font-normal">
              {t("{count} disponibles", {
                count: String(types.length),
              })}
            </span>
          </p>
          {professionalTypeId && (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => {
                setProfessionalTypeId("");
                setSpecialtyIds([]);
              }}
            >
              <X data-icon="inline-start" />
              {t("Sin tipo")}
            </Button>
          )}
        </div>

        {loading && types.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center text-[12.5px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("Cargando...")}
          </div>
        )}
        <div className="stagger-children grid grid-cols-1 gap-2 sm:grid-cols-2">
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setProfessionalTypeId(type.id);
                setSpecialtyIds([]);
              }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                professionalTypeId === type.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  professionalTypeId === type.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Stethoscope className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">
                  {type.name}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
                  {type.description}
                </span>
              </span>
            </button>
          ))}
        </div>

        {selectedType && (
          <div>
            <h3 className="text-[13.5px] font-semibold">
              {t("Especialidades válidas para {name}", {
                name: selectedType.name,
              })}
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t("Puedes seleccionar una o varias.")}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {specialtiesByCategory.map((group) => (
                <div key={group.category}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {group.category}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.items.map((s) => {
                      const active = specialtyIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSpecialtyIds(
                              active
                                ? specialtyIds.filter((x) => x !== s.id)
                                : [...specialtyIds, s.id],
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          {active && (
                            <BadgeCheck className="size-3.5" />
                          )}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          <Button onClick={onNext}>
            {t("Continuar")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
