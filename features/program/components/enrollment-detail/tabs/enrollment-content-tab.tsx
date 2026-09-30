"use client";

// Tab "Contenido semanal" del panel del paciente (UC-C1 / UC-C2).
// Reutiliza la tabla extraída de ProgramContentPage — el paciente ya está
// seleccionado (enrollment), así que no hay picker. Incluye la asignación
// en bloque por rango de semanas (TASK-13) y la asignación masiva de
// podcasts con control de semanas congeladas (REQ-PCA-04).

import { useEffect, useCallback, useState } from "react";
import { Layers, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import { useProgramContent } from "../../../hooks/use-program-content";
import {
  ContentTable,
  ContentSkeleton,
  ContentErrorState,
} from "../../program-content-table";
import { BulkAssignDialog } from "../bulk-assign-dialog";
import { ProgramBulkAssignDialog } from "../../editorial-agenda/program-bulk-assign-dialog";
import { useProgramToast } from "../../../hooks/use-program-toast";
import { ProgramToastContainer } from "../../program-toast";
import { setWeekContentRange } from "../../../services/program-content-service";
import {
  fetchRoutinesForPicker,
  fetchNutritionPlansForPicker,
} from "@/features/wellness/services/assignments-service";
import type { ProgramEnrollment } from "../../../types";
import type {
  ExerciseRoutineListItem,
  NutritionPlanListItem,
} from "@/features/wellness/types";

interface Props {
  enrollment: ProgramEnrollment;
}

export function EnrollmentContentTab({ enrollment }: Props) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");
  const t = useT();

  const { toast, toasts, dismiss } = useProgramToast();

  const { content, loading, error, selectEnrollment, saveWeek, retry } =
    useProgramContent();

  // Catálogo de rutinas y planes para los Selects de la semana
  const [availableRoutines, setAvailableRoutines] = useState<
    ExerciseRoutineListItem[]
  >([]);
  const [availablePlans, setAvailablePlans] = useState<NutritionPlanListItem[]>(
    [],
  );
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPodcastOpen, setBulkPodcastOpen] = useState(false);
  /** Bump para recargar la columna "Podcast del día" tras asignación masiva. */
  const [podcastRefreshKey, setPodcastRefreshKey] = useState(0);

  // Cargar contenido de la inscripción + catálogo del paciente al montar
  useEffect(() => {
    let cancelled = false;
    // Sin setState síncrono: loadingCatalog arranca en true (regla
    // react-hooks/set-state-in-effect) y se apaga en el finally.
    selectEnrollment(enrollment.id).catch(() => {
      // El error se refleja en el estado del hook (error)
    });
    Promise.all([
      fetchRoutinesForPicker(1, 100, ""),
      fetchNutritionPlansForPicker(
        1,
        100,
        "",
        undefined,
        undefined,
        enrollment.patientId,
      ),
    ])
      .then(([routinesRes, plansRes]) => {
        if (cancelled) return;
        setAvailableRoutines(routinesRes.data);
        setAvailablePlans(plansRes.data);
      })
      .catch(() => {
        // Catálogo opcional: la tabla funciona sin él
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollment.id, enrollment.patientId, selectEnrollment]);

  // Asignación en bloque: PUT content/range y recarga del timeline
  const handleBulkAssign = useCallback(
    async (
      from: number,
      to: number,
      planId: string | null,
      routineId: string | null,
    ) => {
      await setWeekContentRange(enrollment.id, {
        fromWeek: from,
        toWeek: to,
        nutritionPlanId: planId,
        exerciseRoutineId: routineId,
      });
      // Recargar contenido para reflejar el rango actualizado
      await selectEnrollment(enrollment.id);
    },
    [enrollment.id, selectEnrollment],
  );

  /** Tras la asignación masiva de podcasts: refresca contenido y columna. */
  const handleBulkPodcastAssigned = useCallback(
    (result: { message: string }) => {
      setPodcastRefreshKey((key) => key + 1);
      void selectEnrollment(enrollment.id);
      toast(result.message || t("Asignación masiva aplicada."), "success");
    },
    [enrollment.id, selectEnrollment, toast, t],
  );

  /** Toast tras el cambio inline del podcast de una semana. */
  const handlePodcastUpdated = useCallback(
    (weekNumber: number, mediaId: string | null) => {
      toast(
        mediaId
          ? t("Podcast actualizado en la semana {week}.", {
              week: String(weekNumber),
            })
          : t("La semana {week} vuelve a la secuencia por defecto.", {
              week: String(weekNumber),
            }),
        "success",
      );
    },
    [toast, t],
  );

  if (loading) return <ContentSkeleton />;
  if (error) return <ContentErrorState message={error} onRetry={retry} />;
  if (!content) return null;

  // Fechas de cierre por semana para el resumen de congeladas (estimado)
  const weekEndDates = Object.fromEntries(
    content.weeks.map((week) => [week.weekNumber, week.weekEndDateLocal]),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Acciones de asignación en bloque (solo escritura) */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkPodcastOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Mic className="size-3.5" />
            {t("Podcast por rango")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Layers className="size-3.5" />
            Asignar en bloque
          </Button>
        </div>
      )}

      <ContentTable
        content={content}
        canEdit={canEdit}
        onSaveWeek={saveWeek}
        enrollmentId={enrollment.id}
        availableRoutines={availableRoutines}
        availablePlans={availablePlans}
        loadingCatalog={loadingCatalog}
        podcastRefreshKey={podcastRefreshKey}
        onPodcastUpdated={handlePodcastUpdated}
      />

      {canEdit && (
        <>
          <BulkAssignDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            totalWeeks={enrollment.totalWeeks}
            availablePlans={availablePlans}
            availableRoutines={availableRoutines}
            onSubmit={handleBulkAssign}
          />
          <ProgramBulkAssignDialog
            key={bulkPodcastOpen ? "open" : "closed"}
            open={bulkPodcastOpen}
            onOpenChange={setBulkPodcastOpen}
            targetType="Enrollment"
            targetId={enrollment.id}
            targetLabel={
              enrollment.patientFullName || enrollment.patientName || undefined
            }
            totalWeeks={content.totalWeeks}
            weekEndDates={weekEndDates}
            currentWeekNumber={enrollment.currentWeekNumber}
            onAssigned={handleBulkPodcastAssigned}
          />
        </>
      )}

      <ProgramToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
