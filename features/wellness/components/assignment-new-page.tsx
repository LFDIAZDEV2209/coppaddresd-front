"use client";

import { useEffect, useState } from "react";
import { getExerciseRoutine } from "../services/exercise-routines-service";
import type { ExerciseRoutine } from "../types";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { AssignmentFormFields } from "./assignment-form";

/**
 * Página dedicada de creación de asignaciones (/wellness/assignments/new):
 * reemplaza al antiguo modal "Nueva asignación". Reutiliza
 * AssignmentFormFields (que llama a los servicios del módulo); tras crear
 * navega al listado con feedback.
 */
export function AssignmentNewPage({ routineId }: { routineId?: string }) {
  const t = useT();
  const router = useRouter();
  const [initialRoutine, setInitialRoutine] = useState<ExerciseRoutine | null>(null);
  const [loading, setLoading] = useState(Boolean(routineId));
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!routineId) return;
    getExerciseRoutine(routineId).then(routine => {
      if (cancelled) return;
      if (routine.status === "Active") setInitialRoutine(routine);
      else setError(true);
    }).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [routineId]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/wellness/assignments")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a asignaciones")}
      </Button>

      <PageHeader
        title={t("Nueva asignación")}
        description={t("Asigna una rutina de ejercicio a un paciente.")}
        icon={CalendarCheck}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? <p role="status" className="p-6">{t("Cargando...")}</p> : <>
        {error && <p role="alert" className="px-6 pt-6 text-destructive">{t("No se pudo preseleccionar una rutina activa. Busca una rutina para continuar.")}</p>}
        <AssignmentFormFields
          key={initialRoutine?.id ?? "new"}
          initialRoutine={initialRoutine ?? undefined}
          onCancel={() => router.push("/wellness/assignments")}
          onCreated={() => router.push("/wellness/assignments?creado=1")}
        />
        </>}
      </div>
    </div>
  );
}
