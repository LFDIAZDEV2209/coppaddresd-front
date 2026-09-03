"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type { EnrollPatientInput, PaginatedResult } from "../types";
import { fetchProgramTemplates } from "../services/program-templates-service";
import type { ProgramTemplateListItem } from "../types";

// --- Types locales ---

/** Paciente devuelto por GET /api/v1/patients?search=... para el picker. */
interface PatientPickerItem {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string | null;
  documentNumber: string | null;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

// --- Timezones comunes ---

const TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "America/Bogota (COT, UTC-5)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (CST, UTC-6)" },
  { value: "America/Lima", label: "America/Lima (PET, UTC-5)" },
  { value: "America/Santiago", label: "America/Santiago (CLT, UTC-4)" },
  { value: "America/Buenos_Aires", label: "America/Buenos_Aires (ART, UTC-3)" },
  { value: "America/New_York", label: "America/New_York (EST, UTC-5)" },
  { value: "America/Chicago", label: "America/Chicago (CST, UTC-6)" },
  { value: "America/Denver", label: "America/Denver (MST, UTC-7)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST, UTC-8)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET, UTC+1)" },
  { value: "UTC", label: "UTC" },
] as const;

// --- Props ---

interface ProgramEnrollDialogProps {
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: EnrollPatientInput) => Promise<void>;
}

// --- Componente ---

export function ProgramEnrollDialog({
  open,
  saving = false,
  onOpenChange,
  onSubmit,
}: ProgramEnrollDialogProps) {
  // Patient picker state
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Template picker state
  const [templateId, setTemplateId] = useState<string>("");
  const [templateResults, setTemplateResults] = useState<
    ProgramTemplateListItem[]
  >([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form fields
  const [timezone, setTimezone] = useState("America/Bogota");
  const [startLocalDate, setStartLocalDate] = useState("");

  // Track if templates have been loaded for the current open cycle
  const templatesLoadedRef = useRef(false);

  // Debounced patient search
  useEffect(() => {
    if (patientSearch.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoadingPatients(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "10",
          search: patientSearch.trim(),
        });
        const result = await apiFetch<PaginatedResult<PatientPickerItem>>(
          `${env.apiUrl}/api/v1/patients?${params.toString()}`,
        );
        setPatientResults(
          result.data.map((p) => ({
            id: p.id,
            label: `${p.firstName} ${p.lastName}`,
            sublabel: p.documentNumber ?? p.medicalRecordNumber ?? undefined,
          })),
        );
      } catch {
        setPatientResults([]);
      } finally {
        setLoadingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Cargar templates activos la primera vez que se abre
  useEffect(() => {
    if (!open || templatesLoadedRef.current) return;
    templatesLoadedRef.current = true;

    setLoadingTemplates(true);
    fetchProgramTemplates(1, 50, { search: "", status: "Active" })
      .then((result) => setTemplateResults(result.data))
      .catch(() => setTemplateResults([]))
      .finally(() => setLoadingTemplates(false));
  }, [open]);

  // Reset form al cerrar — manejado via onOpenChange wrapper
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setPatientId(null);
        setPatientLabel("");
        setPatientSearch("");
        setPatientResults([]);
        setTemplateId("");
        setTimezone("America/Bogota");
        setStartLocalDate("");
        templatesLoadedRef.current = false;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleSelectPatient = useCallback((p: PickerItem) => {
    setPatientId(p.id);
    setPatientLabel(p.label);
    setPatientSearch("");
    setPatientResults([]);
  }, []);

  const handleClearPatient = useCallback(() => {
    setPatientId(null);
    setPatientLabel("");
  }, []);

  const handleSubmit = async () => {
    if (!patientId || !templateId) return;

    const input: EnrollPatientInput = {
      patientId,
      templateId,
      timezone,
    };
    if (startLocalDate) {
      input.startLocalDate = startLocalDate;
    }

    await onSubmit(input);
    onOpenChange(false);
  };

  const canSubmit = patientId && templateId && !saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscribir paciente</DialogTitle>
          <DialogDescription>
            Selecciona un paciente, una plantilla y la zona horaria para
            inscribirlo en el programa.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4 py-2">
            {/* Picker de paciente */}
            <div className="flex flex-col gap-1.5">
              <Label>Paciente *</Label>
              {patientId && patientLabel ? (
                <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  {patientLabel}
                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={handleClearPatient}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar paciente por nombre o documento..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setPatientId(null);
                        setPatientLabel("");
                        setPatientResults([]);
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  {loadingPatients && (
                    <p className="text-xs text-muted-foreground">
                      Buscando...
                    </p>
                  )}
                  {patientResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => handleSelectPatient(p)}
                        >
                          <span>{p.label}</span>
                          {p.sublabel && (
                            <span className="text-xs text-muted-foreground">
                              {p.sublabel}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {patientSearch.length >= 2 &&
                    !loadingPatients &&
                    patientResults.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No se encontraron pacientes.
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Template */}
            <div className="flex flex-col gap-1.5">
              <Label>Plantilla *</Label>
              <Select
                value={templateId}
                onValueChange={(v) => setTemplateId(v ?? "")}
                disabled={loadingTemplates}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue
                    placeholder={
                      loadingTemplates
                        ? "Cargando plantillas..."
                        : "Seleccionar plantilla"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templateResults.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.totalWeeks} días)
                    </SelectItem>
                  ))}
                  {!loadingTemplates && templateResults.length === 0 && (
                    <SelectItem value="__none" disabled>
                      No hay plantillas activas
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="flex flex-col gap-1.5">
              <Label>Zona horaria</Label>
              <Select
                value={timezone}
                onValueChange={(v) => setTimezone(v ?? "America/Bogota")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de inicio (opcional) */}
            <div className="flex flex-col gap-1.5">
              <Label>Fecha de inicio (opcional)</Label>
              <Input
                type="date"
                value={startLocalDate}
                onChange={(e) => setStartLocalDate(e.target.value)}
                className="h-9 w-full"
              />
              <p className="text-xs text-muted-foreground">
                Si se omite, el backend usa el lunes de la semana actual.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Inscribiendo..." : "Inscribir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
