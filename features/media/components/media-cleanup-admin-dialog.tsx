"use client";

// Panel administrativo de limpieza de huérfanos (REQ-PCA-08): detecta y
// purga (con confirmación) los blobs del storage sin medio registrado y
// con antigüedad mayor a la ventana de retención. Requiere el permiso
// System.AdminSettings; el dry-run nunca elimina nada.

import { useState } from "react";
import {
  BrushCleaning,
  CheckCircle2,
  FileWarning,
  Loader2,
  Play,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cleanupOrphanedBlobs,
  formatFileSize,
} from "../services/media-service";
import type { CleanupOrphanedBlobsResult } from "../types";
import { useT } from "@/providers/i18n-provider";

interface MediaCleanupAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se dispara tras una purga real (recarga la biblioteca por si acaso). */
  onPurged?: (result: CleanupOrphanedBlobsResult) => void;
}

export function MediaCleanupAdminDialog({
  open,
  onOpenChange,
  onPurged,
}: MediaCleanupAdminDialogProps) {
  const t = useT();

  /** Ventana de retención en días (1..365, default 7). */
  const [retentionDays, setRetentionDays] = useState(7);
  const [running, setRunning] = useState<"dry-run" | "purge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CleanupOrphanedBlobsResult | null>(null);

  const clampDays = (value: number) =>
    Math.min(365, Math.max(1, Number.isFinite(value) ? value : 7));

  const run = async (dryRun: boolean) => {
    setRunning(dryRun ? "dry-run" : "purge");
    setError(null);
    try {
      const result = await cleanupOrphanedBlobs({
        dryRun,
        retentionDays: clampDays(retentionDays),
      });
      setReport(result);
      if (!dryRun) onPurged?.(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("No se pudo completar el mantenimiento."),
      );
    } finally {
      setRunning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="flex items-center gap-2">
            <BrushCleaning className="size-4 text-primary" />
            {t("Mantenimiento: limpieza de huérfanos")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Detecta archivos del storage sin medio registrado (uploads abortados) y los purga tras la ventana de retención.",
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Ventana de retención */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cleanup-retention">
            {t("Ventana de retención (días)")}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="cleanup-retention"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value) || 0)}
              className="h-9 w-24"
            />
            <p className="text-[11px] text-muted-foreground">
              {t(
                "Los archivos con menos días de antigüedad nunca se eliminan (protege uploads en curso).",
              )}
            </p>
          </div>
        </div>

        {/* Botones de ejecución */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={running !== null}
            onClick={() => void run(true)}
          >
            {running === "dry-run" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {t("Simular (Dry-Run)")}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={running !== null || !report || report.dryRun === false}
            onClick={() => void run(false)}
            title={
              report
                ? t("Purga los huérfanos detectados por la simulación.")
                : t("Ejecuta primero una simulación para ver el reporte.")
            }
          >
            {running === "purge" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <TriangleAlert data-icon="inline-start" />
            )}
            {t("Purgar huérfanos")}
          </Button>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {t("Acción auditable · requiere System.AdminSettings")}
          </span>
        </div>

        {error && (
          <p
            className="rounded-lg bg-destructive-soft/40 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Reporte del recolector */}
        {report && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              {report.dryRun ? (
                <>
                  <FileWarning className="size-3.5 text-info" />
                  {t("Reporte de simulación")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 text-success" />
                  {t("Purga completada")}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t("{count} huérfanos detectados", {
                  count: String(report.orphanedObjects),
                })}
              </Badge>
              {report.dryRun ? (
                <Badge variant="secondary">
                  {t("0 eliminados (simulación)")}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-success-soft text-success-soft-foreground"
                >
                  {t("{count} purgados", {
                    count: String(report.purgedObjects),
                  })}
                </Badge>
              )}
              <Badge variant="secondary">
                {t("{bytes} liberables", {
                  bytes: formatFileSize(report.bytesFreed),
                })}
              </Badge>
            </div>
            {report.orphanedKeys.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("Claves huérfanas (máx. 200 de {count})", {
                    count: String(report.orphanedObjects),
                  })}
                </p>
                <ul className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card p-2 font-mono text-[10px] text-muted-foreground">
                  {report.orphanedKeys.map((key) => (
                    <li key={key} className="truncate" title={key}>
                      {key}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.orphanedObjects === 0 && (
              <p className="text-xs text-muted-foreground">
                {t(
                  "No se detectaron huérfanos: el storage está sincronizado con el catálogo.",
                )}
              </p>
            )}
            {!report.dryRun && report.purgedObjects > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Purga completada: {count} objetos eliminados y {bytes} liberados.",
                  {
                    count: String(report.purgedObjects),
                    bytes: formatFileSize(report.bytesFreed),
                  },
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cerrar")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
