"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createExerciseRoutine } from "../services/exercise-routines-service";
import { ExerciseRoutineFormFields } from "./exercise-routine-form";
import type {
  CreateExerciseRoutineInput,
  UpdateExerciseRoutineInput,
} from "../types";

/**
 * Página dedicada de creación de rutinas de ejercicio
 * (/wellness/exercise-routines/new): reemplaza al antiguo modal
 * "Nueva rutina". Reutiliza ExerciseRoutineFormFields y el servicio
 * existente; tras crear navega al listado con feedback.
 */
export function ExerciseRoutineNewPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (
    input: CreateExerciseRoutineInput | UpdateExerciseRoutineInput,
  ) => {
    setServerError(null);
    setSaving(true);
    try {
      await createExerciseRoutine(input as CreateExerciseRoutineInput);
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/wellness/exercise-routines?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error ? err.message : t("No se pudo crear la rutina."),
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
        onClick={() => router.push("/wellness/exercise-routines")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a rutinas")}
      </Button>

      <PageHeader
        title={t("Nueva rutina de ejercicio")}
        description={t("Crea una nueva rutina con sus ejercicios.")}
        icon={Dumbbell}
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
        <ExerciseRoutineFormFields
          key="new"
          saving={saving}
          onCancel={() => router.push("/wellness/exercise-routines")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
