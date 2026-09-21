"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createNutritionPlan } from "../services/nutrition-plans-service";
import { NutritionPlanFormFields } from "./nutrition-plan-form";
import type {
  CreateNutritionPlanInput,
  UpdateNutritionPlanInput,
} from "../types";

/**
 * Página dedicada de creación de planes de alimentación
 * (/wellness/nutrition-plans/new): reemplaza al antiguo modal "Nuevo plan".
 * Reutiliza NutritionPlanFormFields y el servicio existente; tras crear
 * navega al listado con feedback.
 */
export function NutritionPlanNewPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (
    input: CreateNutritionPlanInput | UpdateNutritionPlanInput,
  ) => {
    setServerError(null);
    setSaving(true);
    try {
      await createNutritionPlan(input as CreateNutritionPlanInput);
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/wellness/nutrition-plans?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error ? err.message : t("No se pudo crear el plan."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/wellness/nutrition-plans")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a planes")}
      </Button>

      <PageHeader
        title={t("Nuevo plan de alimentación")}
        description={t("Crea un nuevo plan nutricional con sus días y comidas.")}
        icon={Apple}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {serverError && (
          <p
            className="rounded-none bg-destructive-soft px-6 py-3 text-sm text-destructive"
            role="alert"
          >
            {serverError}
          </p>
        )}
        <NutritionPlanFormFields
          key="new"
          saving={saving}
          onCancel={() => router.push("/wellness/nutrition-plans")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
