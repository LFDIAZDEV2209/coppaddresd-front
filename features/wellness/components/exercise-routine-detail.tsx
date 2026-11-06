"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Clock3, Dumbbell, ExternalLink, Pencil, Play, ShieldCheck } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getMediaItemById } from "@/features/media/services/media-service";
import { ExerciseMediaCredits } from "./exercise-media-credits";
import { ExerciseYouTubePlayer } from "./exercise-youtube-player";
import { MediaPlayer } from "@/features/media/components/media-player";
import type { MediaItem } from "@/features/media/types";
import type { ExerciseRoutine, RoutineExercise } from "../types";
import { PLAN_STATUS_LABELS } from "../services/nutrition-plans-service";
import { DIFFICULTY_COLORS } from "../services/exercise-routines-service";

interface Props {
  routineId: string | null;
  onClose: () => void;
  getRoutine: (id: string) => Promise<ExerciseRoutine | null>;
  onAssign?: (routine: ExerciseRoutine) => void;
  onEdit?: (routine: ExerciseRoutine) => void;
}

export function ExerciseRoutineDetailDialog({ routineId, onClose, getRoutine, onAssign, onEdit }: Props) {
  const t = useT();
  const [routine, setRoutine] = useState<ExerciseRoutine | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!routineId) return;
    let cancelled = false;
    getRoutine(routineId).then(data => {
      if (!cancelled) { setRoutine(data); setSelected(0); setLoadedId(routineId); }
    }).catch(() => { if (!cancelled) { setRoutine(null); setLoadedId(routineId); } });
    return () => { cancelled = true; };
  }, [routineId, getRoutine, attempt]);
  if (!routineId) return null;
  const waiting = loadedId !== routineId;
  const exercises = [...(routine?.exercises ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const exercise = exercises[selected];
  return <Dialog open onOpenChange={open => !open && onClose()}>
    <DialogContent size="xl" className="gap-0 overflow-hidden p-0">
      <DialogHeader className="px-6 pt-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Dumbbell className="size-4" />{t("Rutina de ejercicio")}</p>
        <DialogTitle>{waiting ? t("Cargando...") : routine?.name ?? t("Rutina")}</DialogTitle>
        <DialogDescription>{t("Revisa el movimiento, la técnica y la indicación antes de asignar.")}</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-6">
        {waiting ? <Skeleton className="h-80 w-full rounded-xl" /> : !routine ? <div className="space-y-3 py-8 text-center">
          <p role="alert">{t("No se pudo cargar la rutina.")}</p>
          <Button variant="outline" onClick={() => { setLoadedId(null); setAttempt(value => value + 1); }}>{t("Reintentar")}</Button>
        </div> : <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t(routine.category)}</Badge>
            <Badge className={DIFFICULTY_COLORS[routine.difficulty]}>{t(routine.difficulty === "Facil" ? "Fácil" : routine.difficulty === "Dificil" ? "Difícil" : "Moderado")}</Badge>
            <Badge variant="secondary">{t(PLAN_STATUS_LABELS[routine.status])}</Badge>
            {routine.estimatedMinutes != null && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock3 className="size-4" />{t("{minutes} minutos", { minutes: String(routine.estimatedMinutes) })}</span>}
          </div>
          {routine.description && <p className="max-w-3xl leading-relaxed text-muted-foreground">{routine.description}</p>}
          {(routine.targetMuscles || routine.equipment) && <dl className="grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
            {routine.targetMuscles && <div><dt className="text-xs text-muted-foreground">{t("Músculos objetivo")}</dt><dd className="mt-1 font-medium">{routine.targetMuscles}</dd></div>}
            {routine.equipment && <div><dt className="text-xs text-muted-foreground">{t("Equipamiento")}</dt><dd className="mt-1 font-medium">{routine.equipment}</dd></div>}
          </dl>}
          {routine.warmupNotes && <section className="space-y-1 border-l-2 border-primary pl-4"><h3 className="font-semibold">{t("Antes de comenzar")}</h3><p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{routine.warmupNotes}</p></section>}
          {exercise ? <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.7fr)]">
            <nav aria-label={t("Ejercicios de la rutina")} className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
              <h3 className="sr-only text-sm font-semibold lg:not-sr-only lg:mb-3">{t("Ejercicios ({count})", { count: String(exercises.length) })}</h3>
              {exercises.map((item, index) => <button key={item.id} type="button" aria-current={selected === index ? "step" : undefined} onClick={() => setSelected(index)}
                className={`flex min-h-16 w-44 shrink-0 items-start gap-3 lg:w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring ${selected === index ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${selected === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
                <span className="min-w-0"><span className="block break-words font-medium">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{item.sets != null ? t("{count} series", { count: String(item.sets) }) : t("Ver indicaciones")}{item.repetitions != null ? ` · ${item.repetitions} reps` : ""}</span></span>
              </button>)}
            </nav>
            <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-5" aria-label={exercise.name}>
              <div><p className="mb-1 text-xs font-medium text-muted-foreground">{t("Técnica y movimiento")}</p><h3 className="text-lg font-semibold">{exercise.name}</h3></div>
              <ExercisePreview key={`${exercise.id}:${exercise.mediaId ?? "reference"}`} exercise={exercise} />
              <div><h4 className="mb-3 font-semibold">{t("Indicación del ejercicio")}</h4><dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([["Series", exercise.sets], ["Repeticiones", exercise.repetitions], ["Duración", exercise.durationSecs != null ? `${exercise.durationSecs} s` : null], ["Descanso", exercise.restSeconds != null ? `${exercise.restSeconds} s` : null], ["Peso indicado", exercise.weightKg != null ? `${exercise.weightKg} kg` : null], ["Tempo", exercise.tempo], ["Esfuerzo percibido", exercise.rpe != null ? `${exercise.rpe}/10` : null]] as const).filter(([, value]) => value != null).map(([label, value]) => <div key={label} className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{t(label)}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}
              </dl></div>
              {(exercise.targetMuscle || exercise.equipment) && <div className="flex flex-wrap gap-2">{exercise.targetMuscle && <Badge variant="outline">{exercise.targetMuscle}</Badge>}{exercise.equipment && <Badge variant="outline">{exercise.equipment}</Badge>}</div>}
              {exercise.description && <div><h4 className="mb-2 font-semibold">{t("Cómo realizarlo")}</h4><p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{exercise.description}</p></div>}
              {exercise.tips && <section className="rounded-xl bg-primary-soft p-4"><h4 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" />{t("Cuida tu técnica")}</h4><p className="whitespace-pre-wrap leading-relaxed">{exercise.tips}</p></section>}
            </section>
          </div> : <p className="py-6 text-muted-foreground">{t("Esta rutina no tiene ejercicios configurados aún.")}</p>}
          {routine.cooldownNotes && <section className="space-y-1 border-l-2 border-primary pl-4"><h3 className="font-semibold">{t("Al terminar")}</h3><p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{routine.cooldownNotes}</p></section>}
        </>}
      </DialogBody>
      <DialogFooter className="m-0 rounded-none px-6 py-4">
        {routine && !waiting && onEdit && <Button variant="outline" onClick={() => onEdit(routine)}><Pencil className="size-4" />{t("Editar rutina")}</Button>}
        {routine && !waiting && onAssign && routine.status === "Active" && <Button onClick={() => onAssign(routine)}><CalendarPlus className="size-4" />{t("Asignar a paciente")}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function ExercisePreview({ exercise }: { exercise: RoutineExercise }) {
  const t = useT();
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!exercise.mediaId) return;
    let cancelled = false;
    getMediaItemById(exercise.mediaId).then(item => {
      if (!cancelled) { setMedia(item); setFailed(false); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [exercise.mediaId, attempt]);
  if (exercise.youTubeUrl) return <ExerciseYouTubePlayer url={exercise.youTubeUrl} title={exercise.name} />;
  if (exercise.mediaId) {
    if (failed) return <div role="alert" className="space-y-3 rounded-xl border p-4"><p>{t("No se pudo cargar la demostración.")}</p><Button variant="outline" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>{t("Reintentar")}</Button></div>;
    if (!media) return <Skeleton className="aspect-video w-full rounded-xl" />;
    if (media.status !== "Published" || (media.mediaType !== "Video" && media.mediaType !== "Image")) return <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">{t("Publica una imagen o un vídeo para que el paciente pueda verlo.")}</p>;
    return <figure className="overflow-hidden rounded-xl border"><MediaPlayer storageKey={media.storageKey} thumbnailKey={media.thumbnailKey} mediaType={media.mediaType} alt={exercise.name} className="aspect-video max-h-none" /><figcaption className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">{media.provenance ? <ExerciseMediaCredits provenance={media.provenance} /> : t("Demostración de tu equipo clínico")}</figcaption></figure>;
  }
  const reference = exercise.referenceVideo;
  if (!reference) return <div className="rounded-xl border border-dashed bg-muted/30 p-5"><p className="font-medium">{t("Demostración no disponible")}</p><p className="mt-1 text-sm text-muted-foreground">{t("Añade una imagen o un vídeo al editar este ejercicio.")}</p></div>;
  return <figure className="overflow-hidden rounded-xl border">
    <div className="aspect-video bg-muted">
      {opened ? <iframe title={t("Demostración de {exercise}", { exercise: exercise.name })} src={reference.embedUrl} className="h-full w-full" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button type="button" onClick={() => setOpened(true)} className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-primary hover:bg-muted/70"><span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="size-6" /></span><span className="font-semibold">{t("Reproducir video de referencia")}</span></button>}
    </div>
    <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 px-4 py-3 text-xs"><span><span className="block text-muted-foreground">{t("Video de referencia")}</span><span>{reference.author}</span></span><a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 font-medium text-primary underline underline-offset-4">{t("Abrir video en origen")}<ExternalLink className="size-3" /></a></figcaption>
  </figure>;
}
