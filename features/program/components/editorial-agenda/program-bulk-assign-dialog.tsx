"use client";

// Diálogo de asignación masiva de podcasts (REQ-PCA-04): aplica un podcast
// publicado sobre un rango de semanas (1..12) y días (lunes a domingo),
// contra una plantilla o una inscripción. El resumen visual distingue las
// semanas futuras que se actualizarán de las congeladas que el backend
// omitirá (o forzará, con la bandera explícita auditada).

import { useMemo, useState } from "react";
import {
  CalendarRange,
  Check,
  Info,
  Loader2,
  Mic,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  bulkAssignProgramContent,
  type BulkAssignProgramContentResult,
} from "../../services/program-content-service";
import { PodcastPickerDialog } from "../podcast-picker-dialog";
import type { MediaItem } from "@/features/media/types";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

/** Días ISO 1..7 con etiqueta corta y completa (render traducido). */
const BULK_DAY_KEYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const BULK_DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

interface ProgramBulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "Template" | "Enrollment";
  targetId: string;
  /** Nombre visible del objetivo (plantilla o paciente). */
  targetLabel?: string;
  /** Semanas del programa (12 en el programa de 83 días). */
  totalWeeks: number;
  /** Fecha de cierre por semana (yyyy-mm-dd), para estimar congeladas. */
  weekEndDates?: Record<number, string>;
  /** Semana actual de la inscripción (referencia del resumen). */
  currentWeekNumber?: number;
  /** Callback tras una asignación exitosa (recargar datos). */
  onAssigned?: (result: BulkAssignProgramContentResult) => void;
}

/**
 * Calcula el hoy local como yyyy-mm-dd para estimar qué semanas del rango ya
 * cerraron (weekEndDate < hoy). Es solo una estimación visual: la decisión
 * real de congelamiento la toma el backend (estado Completed o fecha pasada
 * del hoy local del paciente).
 */
function todayLocalISO(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function ProgramBulkAssignDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
  totalWeeks,
  weekEndDates,
  currentWeekNumber,
  onAssigned,
}: ProgramBulkAssignDialogProps) {
  const t = useT();

  const [fromWeek, setFromWeek] = useState(1);
  const [toWeek, setToWeek] = useState(totalWeeks);
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [forceFrozen, setForceFrozen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkAssignProgramContentResult | null>(
    null,
  );

  const weeks = Math.max(1, Math.min(totalWeeks || 12, 83));

  const weekOptions = useMemo(
    () => Array.from({ length: weeks }, (_, i) => i + 1),
    [weeks],
  );

  const isEnrollment = targetType === "Enrollment";
  const today = todayLocalISO();

  // Estimación visual de semanas congeladas: solo aplica a inscripciones
  // (las plantillas no tienen historial de paciente). Semana congelada =
  // cerró antes de hoy (la decisión final la toma el backend).
  const { affectedCount, frozenEstimate } = useMemo(() => {
    const inRange = weekOptions.filter((w) => w >= fromWeek && w <= toWeek);
    if (!isEnrollment) {
      return { affectedCount: inRange.length, frozenEstimate: 0 };
    }
    const frozen = inRange.filter(
      (w) => weekEndDates?.[w] !== undefined && weekEndDates[w] < today,
    );
    return {
      affectedCount: inRange.length - frozen.length,
      frozenEstimate: frozen.length,
    };
  }, [weekOptions, fromWeek, toWeek, isEnrollment, weekEndDates, today]);

  const rangeInvalid = fromWeek > toWeek;
  const weekdaysInvalid = weekdays.length === 0;
  const canSubmit =
    !saving && !rangeInvalid && !weekdaysInvalid && Boolean(selectedMedia);

  const toggleWeekday = (weekday: number) => {
    setWeekdays((prev) =>
      prev.includes(weekday)
        ? prev.filter((d) => d !== weekday)
        : [...prev, weekday].sort((a, b) => a - b),
    );
  };

  const handleSubmit = async () => {
    if (!selectedMedia) return;
    setSaving(true);
    setError(null);
    try {
      const res = await bulkAssignProgramContent({
        targetType,
        targetId,
        fromWeek,
        toWeek,
        weekdays,
        mediaId: selectedMedia.id,
        forceFrozen,
      });
      setResult(res);
      onAssigned?.(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("No se pudo aplicar la asignación masiva."),
      );
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    onOpenChange(false);
  };

  // Reset visual al reabrir: el diálogo se monta con key en el padre, así
  // que basta con limpiar el resultado si el usuario cierra la vista final.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Pequeño delay para no desmontar el panel de resultado durante la
      // animación de cierre.
      setTimeout(() => setResult(null), 200);
    }
    onOpenChange(next);
  };

  const weekLabel = (week: number) => `${t("Sem")} ${week}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-xl">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {t("Asignación masiva de podcasts")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isEnrollment
                  ? t("Aplica un podcast a un rango de semanas del paciente")
                  : t("Aplica un podcast a los días de la plantilla")}
                {targetLabel ? ` · ${targetLabel}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {result ? (
          /* Panel de resultado transparente (contrato REQ-PCA-04) */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft/40 p-4">
              <div className="flex items-center gap-2 text-success-foreground">
                <Check className="size-5 shrink-0" />
                <p className="text-sm font-semibold">
                  {result.message || t("Asignación completada.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {t("{count} semanas objetivo", {
                    count: String(result.totalWeeksTargeted),
                  })}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-success-soft text-success-foreground"
                >
                  {t("{count} semanas actualizadas", {
                    count: String(result.updatedWeeks),
                  })}
                </Badge>
                {result.frozenWeeksSkipped > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-warning-soft text-warning-foreground"
                  >
                    {t("{count} semanas congeladas omitidas", {
                      count: String(result.frozenWeeksSkipped),
                    })}
                  </Badge>
                )}
                {isEnrollment && (
                  <Badge variant="secondary">
                    {t("{count} inscripciones afectadas", {
                      count: String(result.affectedEnrollments),
                    })}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={close}>{t("Listo")}</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Rango de semanas */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("Rango de semanas")}</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(fromWeek)}
                  onValueChange={(v) => setFromWeek(Number(v))}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {weekLabel(w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">{t("a")}</span>
                <Select
                  value={String(toWeek)}
                  onValueChange={(v) => setToWeek(Number(v))}
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((w) => (
                      <SelectItem key={w} value={String(w)}>
                        {weekLabel(w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {rangeInvalid && (
                <p className="text-xs text-destructive">
                  {t("La semana final debe ser mayor o igual a la inicial.")}
                </p>
              )}
            </div>

            {/* Días de la semana */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("Días de la semana")}</Label>
              <div
                role="group"
                aria-label={t("Días de la semana")}
                className="flex flex-wrap gap-1.5"
              >
                {BULK_DAY_SHORT.map((short, index) => {
                  const weekday = index + 1;
                  const active = weekdays.includes(weekday);
                  return (
                    <button
                      key={weekday}
                      type="button"
                      onClick={() => toggleWeekday(weekday)}
                      aria-pressed={active}
                      title={t(BULK_DAY_KEYS[index])}
                      className={cn(
                        "flex h-8 min-w-10 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
              {weekdaysInvalid && (
                <p className="text-xs text-destructive">
                  {t("Selecciona al menos un día.")}
                </p>
              )}
            </div>

            {/* Podcast objetivo */}
            <div className="flex flex-col gap-1.5">
              <Label>{t("Podcast a asignar")}</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
                className="h-9 justify-between font-normal hover:bg-muted"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Mic className="size-3.5 shrink-0 text-primary" />
                  <span
                    className={cn(
                      "truncate text-xs",
                      selectedMedia
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {selectedMedia
                      ? selectedMedia.title
                      : t("Buscar podcast publicado...")}
                  </span>
                </span>
                {selectedMedia ? (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={t("Quitar podcast")}
                    title={t("Quitar podcast")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedMedia(null);
                      }
                    }}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </span>
                ) : (
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Resumen visual de afectación */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="size-3.5 text-info" />
                {t("Resumen de la asignación")}
              </p>
              {isEnrollment ? (
                <div className="flex flex-col gap-1 text-muted-foreground">
                  {currentWeekNumber !== undefined && (
                    <span>
                      {t("La inscripción cursa la semana {week}.", {
                        week: String(currentWeekNumber),
                      })}
                    </span>
                  )}
                  <span>
                    {t("{count} semanas del rango serán actualizadas", {
                      count: String(Math.max(0, affectedCount)),
                    })}
                    .
                  </span>
                  {frozenEstimate > 0 && !forceFrozen && (
                    <span className="text-warning-foreground">
                      {t(
                        "≈ {count} semanas congeladas (pasadas) se omitirán para preservar el historial del paciente.",
                        { count: String(frozenEstimate) },
                      )}
                    </span>
                  )}
                  {frozenEstimate > 0 && forceFrozen && (
                    <span className="font-medium text-destructive">
                      {t(
                        "Se FORZARÁN ≈ {count} semanas congeladas: la acción queda registrada en auditoría.",
                        { count: String(frozenEstimate) },
                      )}
                    </span>
                  )}
                  {weekEndDates === undefined && (
                    <span>
                      {t(
                        "El desglose exacto de semanas congeladas lo confirma el backend al aplicar.",
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {t(
                    "Se actualizarán las filas de los días seleccionados de la plantilla (se aplica a todas las {count} semanas del rango).",
                    { count: String(Math.max(0, affectedCount)) },
                  )}
                </p>
              )}
            </div>

            {/* Forzar semanas congeladas (solo inscripciones) */}
            {isEnrollment && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft/40 p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {t("Forzar semanas congeladas")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t(
                        "Sobrescribe el historial de semanas completadas. Queda registrada como acción crítica en la auditoría.",
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={forceFrozen}
                  onCheckedChange={(checked) => setForceFrozen(checked)}
                  aria-label={t("Forzar semanas congeladas")}
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" onClick={close} disabled={saving}>
                {t("Cancelar")}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("Asignando...")}
                  </>
                ) : (
                  <>
                    <Check data-icon="inline-start" />
                    {isEnrollment
                      ? t("Asignar a {count} semanas", {
                          count: String(
                            Math.max(
                              0,
                              affectedCount +
                                (forceFrozen ? frozenEstimate : 0),
                            ),
                          ),
                        })
                      : t("Aplicar a la plantilla")}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {pickerOpen && (
          <PodcastPickerDialog
            open
            onOpenChange={setPickerOpen}
            currentMediaId={selectedMedia?.id ?? null}
            onSelect={(mediaId, mediaItem) => {
              setSelectedMedia(mediaItem ?? null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
