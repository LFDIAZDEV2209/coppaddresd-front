"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
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
import type { BulkEnrollInput, PaginatedResult } from "../types";
import { fetchProgramTemplates } from "../services/program-templates-service";
import type { ProgramTemplateListItem } from "../types";

// --- Types locales ---

interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  medicalRecordNumber: string | null;
}

interface PickerItem {
  id: string;
  label: string;
  sublabel?: string;
}

// --- Timezones comunes (mismo catálogo que el dialog individual) ---

const TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "America/Bogota (COT, UTC-5)" },
  { value: "America/Mexico_City", label: "America/Mexico_City (CST, UTC-6)" },
  { value: "America/Lima", label: "America/Lima (PET, UTC-5)" },
  { value: "America/Santiago", label: "America/Santiago (CLT, UTC-4)" },
  { value: "America/Buenos_Aires", label: "America/Buenos_Aires (ART, UTC-3)" },
  { value: "America/New_York", label: "America/New_York (EST, UTC-5)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET, UTC+1)" },
  { value: "UTC", label: "UTC" },
] as const;

const MAX_BULK = 100;

// --- Props ---

interface ProgramBulkEnrollDialogProps {
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: BulkEnrollInput) => Promise<void>;
}

// --- Componente ---

export function ProgramBulkEnrollDialog({
  open,
  saving = false,
  onOpenChange,
  onSubmit,
}: ProgramBulkEnrollDialogProps) {
  // Patient multi-select state
  const [selectedPatients, setSelectedPatients] = useState<PickerItem[]>([]);
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
        const result = await apiFetch<PaginatedResult<PatientListItem>>(
          `${env.apiUrl}/api/v1/patients?${params.toString()}`,
        );
        setPatientResults(
          result.data.map((p) => ({
            id: p.id,
            label: `${p.firstName} ${p.lastName}`,
            sublabel: p.email ?? p.medicalRecordNumber ?? undefined,
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

  // Reset form al cerrar
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelectedPatients([]);
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
    setSelectedPatients((prev) =>
      prev.some((x) => x.id === p.id) || prev.length >= MAX_BULK
        ? prev
        : [...prev, p],
    );
    setPatientSearch("");
    setPatientResults([]);
  }, []);

  const handleRemovePatient = useCallback((id: string) => {
    setSelectedPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleSubmit = async () => {
    if (selectedPatients.length === 0) return;

    const input: BulkEnrollInput = {
      patientIds: selectedPatients.map((p) => p.id),
      templateId,
      timezone,
    };
    if (startLocalDate) {
      input.startLocalDate = startLocalDate;
    }

    await onSubmit(input);
    onOpenChange(false);
  };

  const canSubmit =
    selectedPatients.length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscripción masiva</DialogTitle>
          <DialogDescription>
            Inscribre varios pacientes al programa en un solo lote (máximo{" "}
            {MAX_BULK} por envío). Los fallos se reportan por paciente sin
            abortar el lote.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4 py-2">
            {/* Picker de pacientes (multi) */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Pacientes ({selectedPatients.length}/{MAX_BULK})
              </Label>
              {selectedPatients.length > 0 && (
                <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/50 p-2">
                  {selectedPatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded bg-background px-2 py-1 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePatient(p.id)}
                        aria-label={`Quitar a ${p.label}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente por nombre..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
              {loadingPatients && (
                <p className="text-xs text-muted-foreground">Buscando...</p>
              )}
              {patientResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                      disabled={selectedPatients.some((x) => x.id === p.id)}
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
            </div>

            {/* Template */}
            <div className="flex flex-col gap-1.5">
              <Label>Plantilla</Label>
              <Select
                value={templateId || "__default"}
                onValueChange={(v) =>
                  setTemplateId(v === "__default" ? "" : (v ?? ""))
                }
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
                  <SelectItem value="__default">
                    Plantilla por defecto (default-83w)
                  </SelectItem>
                  {templateResults.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.totalWeeks} semanas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si se omite, el backend usa la plantilla por defecto.
              </p>
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
            {saving
              ? "Inscribiendo..."
              : `Inscribir ${selectedPatients.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
