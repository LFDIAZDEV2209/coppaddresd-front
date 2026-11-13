"use client";

import { useCallback, useId } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { useNutritionResource } from "../hooks/use-nutrition-resource";
import { fetchNutritionCurrentSummary } from "../services/nutrition-service";
import { NutritionError } from "./nutrition-feedback";
import { useNutritionDate, useNutritionNumber } from "./nutrition-shared";

interface Props {
  patientId: string;
  cycle?: { number: number; startDate: string; endDate: string } | null;
}

/** La lectura de Nutrición se autoriza antes de montar la consulta. */
export function NutritionPatientSummary(props: Props) {
  const { can, loading } = useAppContext();
  const t = useT();
  if (loading) return <SummarySkeleton />;
  if (
    !can("Nutrition.View") &&
    !can("Nutrition.Manage") &&
    !can("Nutrition.Approve")
  ) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t("No tienes permiso para consultar la nutrición de este paciente.")}
      </p>
    );
  }
  return <SummaryCard {...props} />;
}

function SummaryCard({ patientId, cycle }: Props) {
  const t = useT();
  const format = useNutritionNumber();
  const date = useNutritionDate();
  const titleId = useId();
  const load = useCallback(
    (signal: AbortSignal) => fetchNutritionCurrentSummary(patientId, signal),
    [patientId],
  );
  const { data, loading, error, retry } = useNutritionResource(load, "", true);
  if (loading) return <SummarySkeleton />;
  if (error || !data) return <NutritionError retry={retry} issue={error} />;
  const current = data.current;
  // El ordinal ya viene del overview; no inventar C1 si falta o cambió el ciclo.
  const number =
    current &&
    cycle?.startDate === current.startDate &&
    cycle.endDate === current.endDate &&
    Number.isInteger(cycle.number) &&
    cycle.number > 0
      ? cycle.number
      : null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {t("Nutrición vigente")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Metas del plan publicado. Los cambios se realizan en la ficha de Nutrición.",
          )}
        </p>
      </div>
      {current ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">
              {number !== null
                ? t("Ciclo {cycle} · día {day} de {total}", {
                    cycle: String(number),
                    day: String(current.day),
                    total: String(current.of),
                  })
                : t("Día {day} de {total}", {
                    day: String(current.day),
                    total: String(current.of),
                  })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Vigencia: {start} a {end}", {
                start: date(current.startDate),
                end: date(current.endDate),
              })}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
            {(
              [
                ["Meta diaria", current.targets.kcal, "kcal"],
                ["Carbohidratos", current.targets.carbsG, "g"],
                ["Proteínas", current.targets.proteinG, "g"],
                ["Grasas", current.targets.fatG, "g"],
                ["Fibra", current.targets.fiberG, "g"],
                ["Agua", current.targets.waterGlasses, "vasos"],
              ] as const
            ).map(([label, value, unit]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-muted-foreground">{t(label)}</dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">
                  {format(value)} {t(unit)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("Este paciente no tiene un plan nutricional publicado vigente.")}
        </p>
      )}
      <Link
        href={`/nutrition/${encodeURIComponent(patientId)}`}
        className={buttonVariants({
          variant: "outline",
          className: "min-h-11 self-start",
        })}
      >
        {t("Abrir ficha de Nutrición")}
      </Link>
    </section>
  );
}

function SummarySkeleton() {
  const t = useT();
  return (
    <div
      role="status"
      aria-label={t("Cargando resumen de nutrición")}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
    >
      <span className="sr-only">{t("Cargando resumen de nutrición")}</span>
      <Skeleton aria-hidden="true" className="h-6 w-40" />
      <Skeleton aria-hidden="true" className="h-12 w-full" />
      <Skeleton aria-hidden="true" className="h-28 w-full" />
    </div>
  );
}
