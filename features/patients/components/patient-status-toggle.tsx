"use client";

import { useId, useRef, useState } from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { LoaderCircle, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { updatePatientStatus } from "../services/patients-service";
import type { PatientListItem } from "../types";

type TargetStatus = "Activo" | "Inactivo";
type Phase = "saving" | "uncertain" | "rejected";

interface StatusChange {
  status: TargetStatus;
  phase: Phase;
  message?: string;
}

/**
 * Toggle Activo↔Inactivo del paciente (patrón Profesionales): solo con
 * `Patients.Update`, confirmación al desactivar, bloqueo anti doble clic y
 * «Por confirmar» con Reintentar cuando el resultado es desconocido. Usa el
 * endpoint dedicado de estado — nunca el PUT del agregado.
 */
export function PatientStatusToggle({
  patient,
  onChanged,
}: {
  patient: Pick<PatientListItem, "id" | "firstName" | "lastName" | "status">;
  onChanged: () => Promise<boolean>;
}) {
  const t = useT();
  const { can } = useAppContext();
  const descriptionId = useId();
  const [change, setChange] = useState<StatusChange | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = useRef(false);

  // «Pendiente» no se cambia desde el toggle (solo Activo/Inactivo).
  if (!can("Patients.Update") || patient.status === "Pendiente") {
    return null;
  }

  const saving = change?.phase === "saving";
  const uncertain = change?.phase === "uncertain";
  const current: TargetStatus =
    change?.status ?? (patient.status === "Inactivo" ? "Inactivo" : "Activo");

  async function apply(target: TargetStatus) {
    if (busy.current) return;
    busy.current = true;
    setChange({ status: target, phase: "saving" });
    try {
      await updatePatientStatus(patient.id, target);
      const refreshed = await onChanged();
      if (!refreshed) {
        setChange({ status: target, phase: "uncertain" });
      } else {
        setChange(null);
      }
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 403, 404, 409, 422, 429].includes(cause.status);
      setChange({
        status: target,
        phase: rejected ? "rejected" : "uncertain",
        message: rejected
          ? t(
              "No se pudo cambiar el estado. Actualiza el listado e inténtalo de nuevo.",
            )
          : t("No pudimos confirmar el cambio. Reintenta para comprobarlo."),
      });
    } finally {
      busy.current = false;
    }
  }

  return (
    <div
      className="patient-status-toggle flex min-w-28 flex-col items-start gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-11 items-center gap-2.5">
        <SwitchPrimitive.Root
          checked={current === "Activo"}
          disabled={saving || uncertain}
          aria-label={t("Estado de {name}", {
            name: `${patient.firstName} ${patient.lastName}`,
          })}
          aria-describedby={descriptionId}
          aria-busy={saving}
          onCheckedChange={(checked) => {
            const target: TargetStatus = checked ? "Activo" : "Inactivo";
            if (target === "Inactivo") setConfirmOpen(true);
            else void apply(target);
          }}
          className="patient-status-switch relative inline-flex shrink-0 rounded-full"
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            className="block rounded-full"
          />
        </SwitchPrimitive.Root>
        <span
          className="text-sm font-medium text-foreground"
          aria-live="polite"
        >
          {saving
            ? t("Guardando…")
            : uncertain
              ? t("Por confirmar")
              : current === "Activo"
                ? t("Activo")
                : t("Inactivo")}
        </span>
        {saving ? (
          <LoaderCircle
            aria-hidden
            className="size-3.5 animate-spin text-primary motion-reduce:animate-none"
          />
        ) : null}
      </div>
      <span id={descriptionId} className="sr-only">
        {t(
          "Desactivar bloquea el acceso del paciente al ERP; conserva su historial clínico.",
        )}
      </span>
      {change?.message ? (
        <div
          className="flex max-w-56 flex-col items-start gap-1 whitespace-normal text-xs text-destructive"
          role="alert"
        >
          <span>{change.message}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() => void apply(change.status)}
          >
            <RotateCcw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("¿Desactivar a {name}?", {
                name: `${patient.firstName} ${patient.lastName}`,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "El paciente quedará Inactivo en el directorio. Su historial clínico y asignaciones se conservan; puedes reactivarlo cuando quieras.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                void apply("Inactivo");
              }}
            >
              {t("Desactivar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
