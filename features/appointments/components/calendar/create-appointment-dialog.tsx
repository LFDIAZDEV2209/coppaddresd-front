"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Loader2, Search, User } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchOrganizationTree,
  fetchPatients,
  fetchSpecialties,
} from "../../services/reference-service";
import { scheduleAppointment } from "../../services/appointments-service";
import type { AppointmentDto, SpecialtyDto } from "../../types";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Clave local YYYY-MM-DD para inputs de fecha (sin desfase UTC). */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Creación de cita desde el calendario: se abre con fecha, hora y duración
 * preseleccionadas (por selección de rango o botón "Nueva cita") y usa el
 * mismo endpoint de agendado del módulo — sin lógica paralela. El
 * `organizationId` se resuelve del árbol organizacional (patrón del wizard
 * de profesionales: primera organización activa).
 *
 * El formulario interno se remonta en cada apertura (key por preset) para
 * reiniciar el estado sin efectos síncronos.
 */
export function CreateAppointmentDialog({
  open,
  onOpenChange,
  presetStart,
  presetEnd,
  professionalId,
  professionalName,
  specialtyIds,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetStart: Date | null;
  presetEnd: Date | null;
  professionalId: string;
  professionalName: string | null;
  specialtyIds: string[] | null;
  onCreated: (appointment: AppointmentDto) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {open && (
          <CreateAppointmentForm
            key={`${presetStart?.getTime() ?? 0}-${presetEnd?.getTime() ?? 0}`}
            presetStart={presetStart}
            presetEnd={presetEnd}
            professionalId={professionalId}
            professionalName={professionalName}
            specialtyIds={specialtyIds}
            onCreated={onCreated}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateAppointmentForm({
  presetStart,
  presetEnd,
  professionalId,
  professionalName,
  specialtyIds,
  onCreated,
  onClose,
}: {
  presetStart: Date | null;
  presetEnd: Date | null;
  professionalId: string;
  professionalName: string | null;
  specialtyIds: string[] | null;
  onCreated: (appointment: AppointmentDto) => void;
  onClose: () => void;
}) {
  const t = useT();

  const start = useMemo(() => {
    if (presetStart) return presetStart;
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  }, [presetStart]);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<
    { id: string; label: string; sublabel: string | null }[]
  >([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);

  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");

  const [dateValue, setDateValue] = useState(() => toDateInput(start));
  const [timeValue, setTimeValue] = useState(() => toTimeInput(start));
  const [duration, setDuration] = useState(() => {
    const minutes = presetEnd
      ? Math.round((presetEnd.getTime() - start.getTime()) / 60000)
      : 30;
    return Math.min(120, Math.max(15, Math.round(minutes / 15) * 15));
  });

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const searchTimer = useRef<number | null>(null);

  // Catálogos: organizaciones (primera activa) + especialidades del profesional.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [orgs, allSpecialties] = await Promise.all([
          fetchOrganizationTree(),
          fetchSpecialties(),
        ]);
        if (!active) return;
        setOrganizationId(orgs[0]?.id ?? null);
        const allowed =
          specialtyIds && specialtyIds.length > 0
            ? allSpecialties.filter((s) => specialtyIds.includes(s.id))
            : allSpecialties;
        setSpecialties(allowed);
        if (allowed.length === 1) setSpecialtyId(allowed[0].id);
      } catch {
        if (active) setError(t("No se pudieron cargar los catálogos."));
      }
    })();
    return () => {
      active = false;
    };
  }, [specialtyIds, t]);

  // Búsqueda de pacientes con debounce + abort (patrón del módulo).
  useEffect(() => {
    if (!patientOpen || !patientQuery.trim()) return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    searchTimer.current = window.setTimeout(async () => {
      setPatientLoading(true);
      try {
        const result = await fetchPatients(patientQuery.trim());
        if (controller.signal.aborted) return;
        setPatientResults(
          result.data.slice(0, 8).map((p) => ({
            id: p.id,
            label: `${p.firstName} ${p.lastName}`,
            sublabel: p.mrn ?? p.email ?? null,
          })),
        );
      } catch {
        if (!controller.signal.aborted) setPatientResults([]);
      } finally {
        if (!controller.signal.aborted) setPatientLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
    };
  }, [patientQuery, patientOpen]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
      searchAbort.current?.abort();
    };
  }, []);

  const scheduledStart = useMemo(() => {
    if (!dateValue || !timeValue) return null;
    const date = new Date(`${dateValue}T${timeValue}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [dateValue, timeValue]);

  const showPatientResults = patientOpen && Boolean(patientQuery.trim());

  const canSubmit =
    Boolean(patientId) && Boolean(specialtyId) && scheduledStart !== null;

  const submit = async () => {
    if (!canSubmit || !organizationId || !scheduledStart) return;
    setBusy(true);
    setError(null);
    try {
      const appointment = await scheduleAppointment({
        patientId: patientId!,
        professionalId,
        specialtyId,
        organizationId,
        scheduledStart: scheduledStart.toISOString(),
        durationMinutes: duration,
      });
      onClose();
      onCreated(appointment);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t(
              "No se pudo agendar la cita. Revisa el horario e inténtalo de nuevo.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CalendarPlus className="size-4" />
          </span>
          {t("Nueva cita")}
        </DialogTitle>
        <DialogDescription>
          {professionalName
            ? t("Nueva cita de {name}", { name: professionalName })
            : t("Agenda una cita para el profesional")}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        {/* Paciente (obligatorio) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-patient">{t("Paciente")}</Label>
          {patientId ? (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3">
              <User className="size-3.5 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {patientLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPatientId(null);
                  setPatientLabel(null);
                  setPatientQuery("");
                }}
                className="text-[11px] font-semibold text-muted-foreground hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
              >
                {t("Cambiar")}
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="create-patient"
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                  setPatientOpen(true);
                }}
                onFocus={() => setPatientOpen(true)}
                placeholder={t("Buscá por nombre…")}
                autoComplete="off"
                className="pl-8"
              />
              {showPatientResults && (
                <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                  {patientLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      {t("Buscando…")}
                    </div>
                  ) : patientResults.length === 0 ? (
                    <p className="px-3 py-2.5 text-[12px] text-muted-foreground">
                      {t("Sin resultados")}
                    </p>
                  ) : (
                    patientResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setPatientId(patient.id);
                          setPatientLabel(patient.label);
                          setPatientOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                          {patient.label}
                        </span>
                        {patient.sublabel && (
                          <span className="shrink-0 truncate text-[11px] text-muted-foreground">
                            {patient.sublabel}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Especialidad (obligatoria, limitada al profesional) */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="create-specialty">{t("Especialidad")}</Label>
          <Select
            value={specialtyId}
            onValueChange={(value) => setSpecialtyId(value ?? "")}
          >
            <SelectTrigger id="create-specialty" className="w-full">
              <SelectValue placeholder={t("Elegí una especialidad")} />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((specialty) => (
                <SelectItem key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha, hora y duración (prellenadas desde el rango) */}
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-date">{t("Fecha")}</Label>
            <Input
              id="create-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-time">{t("Hora")}</Label>
            <Input
              id="create-time"
              type="time"
              step={900}
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-duration">{t("Duración")}</Label>
            <Select
              value={String(duration)}
              onValueChange={(value) => setDuration(Number(value ?? duration))}
            >
              <SelectTrigger id="create-duration" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!organizationId && !error && (
          <p className="text-[11.5px] text-muted-foreground">
            {t("Cargando organización…")}
          </p>
        )}
        {error && (
          <p
            className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {t("Cancelar")}
        </Button>
        <Button
          onClick={submit}
          disabled={busy || !canSubmit || !organizationId}
        >
          {busy ? (
            <>
              <Loader2
                className="size-3.5 animate-spin"
                data-icon="inline-start"
              />
              {t("Agendando…")}
            </>
          ) : (
            t("Agendar cita")
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
