"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";
import {
  fetchExerciseRoutines,
  getExerciseRoutine,
} from "../services/exercise-routines-service";
import type {
  ExerciseRoutine,
  ExerciseRoutineListItem,
  PaginatedResult,
  RoutineExercise,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exercise: RoutineExercise) => void;
}

/** Catálogo derivado de las rutinas existentes: lista paginada y un solo detalle bajo demanda. */
export function RoutineExerciseCatalog({
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Elegir de la biblioteca")}</DialogTitle>
          <DialogDescription>{t("Rutinas y ejercicios")}</DialogDescription>
        </DialogHeader>
        {open && <CatalogContent onSelect={onSelect} />}
      </DialogContent>
    </Dialog>
  );
}

function CatalogContent({ onSelect }: Pick<Props, "onSelect">) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<ExerciseRoutineListItem | null>(
    null,
  );
  const key = JSON.stringify([query, page, attempt]);
  const [result, setResult] = useState<{
    key: string;
    data: PaginatedResult<ExerciseRoutineListItem> | null;
  } | null>(null);
  const loading = result?.key !== key;
  const data = loading ? null : result?.data;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void fetchExerciseRoutines(
          page,
          10,
          { search: query, status: "all", category: "all" },
          controller.signal,
        )
          .then((data) => {
            if (!controller.signal.aborted) setResult({ key, data });
          })
          .catch(() => {
            if (!controller.signal.aborted) setResult({ key, data: null });
          });
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, key]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div hidden={selected !== null} className="flex flex-col gap-3">
        <Label htmlFor="catalog-routine-search">{t("Rutina")}</Label>
        <Input
          id="catalog-routine-search"
          placeholder={t("Buscar rutina por nombre...")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        {loading ? (
          <CatalogSkeleton />
        ) : !data ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-lg border border-destructive p-4"
          >
            <p className="text-sm text-destructive">
              {t("Error al cargar rutinas de ejercicio.")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t("Reintentar")}
            </Button>
          </div>
        ) : (
          <>
            {data.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("Sin resultados")}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {data.data.map((routine) => (
                <li key={routine.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full justify-between gap-3 px-4 py-3 text-left whitespace-normal"
                    onClick={() => setSelected(routine)}
                  >
                    <span className="min-w-0 break-words">{routine.name}</span>
                    <ChevronRight
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t("Anterior")}
              </Button>
              <span className="text-sm tabular-nums">
                {page} / {Math.max(1, data.totalPages)}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("Siguiente")}
              </Button>
            </div>
          </>
        )}
      </div>
      {selected && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setSelected(null)}
            >
              {t("Rutinas")}
            </Button>
            <h3 className="min-w-0 break-words text-sm font-semibold">
              {selected.name}
            </h3>
          </div>
          <RoutineExercises
            key={selected.id}
            routineId={selected.id}
            onSelect={onSelect}
          />
        </>
      )}
    </div>
  );
}

function RoutineExercises({
  routineId,
  onSelect,
}: { routineId: string } & Pick<Props, "onSelect">) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getExerciseRoutine(routineId)
      .then((data) => {
        if (active) setRoutine(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [routineId, attempt]);
  if (error)
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-destructive p-4"
      >
        <p className="text-sm text-destructive">
          {t("No se pudo cargar el detalle de la rutina")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          {t("Reintentar")}
        </Button>
      </div>
    );
  if (!routine) return <CatalogSkeleton />;
  const exercises = [...routine.exercises]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((exercise) =>
      `${exercise.name} ${exercise.targetMuscle ?? ""} ${exercise.equipment ?? ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    );
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="catalog-exercise-search">
        {t("Ejercicios de la rutina")}
      </Label>
      <Input
        id="catalog-exercise-search"
        placeholder={t("Buscar por nombre...")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {exercises.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {routine.exercises.length === 0
            ? t("Esta rutina no tiene ejercicios configurados aún.")
            : t("Sin resultados")}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-11 w-full justify-between gap-3 px-4 py-3 text-left whitespace-normal"
              aria-label={t("Seleccionar {name}", { name: exercise.name })}
              onClick={() => onSelect(exercise)}
            >
              <span className="min-w-0">
                <span className="block break-words font-semibold">
                  {exercise.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {[exercise.targetMuscle, exercise.equipment]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Plus className="size-4 shrink-0" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}
