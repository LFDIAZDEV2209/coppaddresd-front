"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RISK_LABELS } from "../../lib/domain";
import type { RiskLevel } from "../../types";
import { RiskBadge } from "../shared/badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AssignPatientOption {
  id: string;
  name: string;
  detail?: string;
  risk?: RiskLevel;
  clinic?: string;
}

/** Iniciales (máx. 2) para el avatar de la fila. */
const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Asignación masiva de una batería: buscador, selección múltiple y un único
 * POST con los pacientes elegidos.
 */
export function AssignPatientsDialog({
  open,
  onOpenChange,
  batteryName,
  patients,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batteryName: string;
  patients: AssignPatientOption[];
  onAssign: (patientIds: string[]) => Promise<number>;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const listRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  // El fade inferior señala que hay más pacientes; se oculta al llegar al fondo.
  const updateFade = () => {
    const el = listRef.current;
    if (!el) return;
    setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    updateFade();
  }, [deferredSearch]);

  const normalized = deferredSearch.trim().toLowerCase();
  const filtered = patients.filter(
    (patient) =>
      !normalized ||
      patient.name.toLowerCase().includes(normalized) ||
      (patient.detail ?? "").toLowerCase().includes(normalized),
  );
  const filteredIds = filtered.map((patient) => patient.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const reset = () => {
    setSearch("");
    setSelected(new Set());
    setSaving(false);
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const togglePatient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const count = await onAssign([...selected]);
      setResult(count);
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : t("No se pudo asignar la batería"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border bg-primary-soft px-6 py-5">
          <DialogTitle>{t("Asignar pacientes")}</DialogTitle>
          <DialogDescription>
            {t("Asigna la batería {name} a los pacientes seleccionados.", {
              name: batteryName,
            })}
          </DialogDescription>
        </DialogHeader>

        {result !== null ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-foreground">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="text-sm font-semibold">
              {t("Asignaciones creadas: {count}", { count: String(result) })}
            </p>
            <p className="max-w-sm text-[12px] text-muted-foreground">
              {t(
                "Los pacientes verán los tests de la batería en su plan de evaluaciones.",
              )}
            </p>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t("Cerrar")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
              <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("Buscar paciente…")}
                  aria-label={t("Buscar paciente…")}
                  className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                />
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAllFiltered}
                />
                <span className="text-[12.5px] font-medium">
                  {t("Seleccionar todos los filtrados ({count})", {
                    count: String(filteredIds.length),
                  })}
                </span>
                {selected.size > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {selected.size}
                  </span>
                )}
              </label>

              <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                  ref={listRef}
                  onScroll={updateFade}
                  className="min-h-0 flex-1 snap-y snap-mandatory overflow-x-hidden overflow-y-auto rounded-xl border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                {filtered.map((patient) => {
                  const isSelected = selected.has(patient.id);
                  const sub = [patient.detail, patient.clinic]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <label
                      key={patient.id}
                      className={`flex cursor-pointer snap-start items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-muted ${isSelected ? "bg-primary-soft" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePatient(patient.id)}
                      />
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-soft text-[11px] font-bold text-primary"
                      >
                        {initialsOf(patient.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">
                          {patient.name}
                        </span>
                        {sub && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {sub}
                          </span>
                        )}
                      </span>
                      {patient.risk && patient.risk !== "sin-evaluar" && (
                        <RiskBadge
                          risk={patient.risk}
                          label={RISK_LABELS[patient.risk]}
                        />
                      )}
                    </label>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                    {t("Sin pacientes para el filtro actual")}
                  </p>
                )}
                </div>
                {showFade && filtered.length > 0 && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-px bottom-px h-10 rounded-b-xl bg-gradient-to-b from-transparent via-card/90 to-card"
                  />
                )}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mx-6 mb-3 rounded-lg bg-destructive-soft/50 px-3 py-2 text-[12px] font-medium text-destructive"
              >
                {error}
              </p>
            )}

            <DialogFooter className="m-0 shrink-0 px-6 py-4">
              {selected.size > 0 && (
                <span className="mr-auto self-center text-[12px] font-medium text-muted-foreground">
                  {t("{count} seleccionados", {
                    count: String(selected.size),
                  })}
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                {t("Cancelar")}
              </Button>
              <Button
                type="button"
                onClick={handleAssign}
                disabled={saving || selected.size === 0}
              >
                {saving && <LoaderCircle className="animate-spin" />}
                {selected.size === 0
                  ? t("Asignar pacientes")
                  : t("Asignar {count} pacientes", {
                      count: String(selected.size),
                    })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
