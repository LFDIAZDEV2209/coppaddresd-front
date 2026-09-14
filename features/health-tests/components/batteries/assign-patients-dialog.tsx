"use client";

import { useDeferredValue, useState } from "react";
import { CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
}

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
      <DialogContent className="max-h-[92vh] overflow-x-hidden overflow-y-auto p-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent sm:max-w-xl">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
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
            <div className="flex flex-col gap-3 px-6 py-4">
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
              </label>

              <div className="max-h-72 overflow-x-hidden overflow-y-auto rounded-xl border border-border [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                {filtered.map((patient) => (
                  <label
                    key={patient.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selected.has(patient.id)}
                      onCheckedChange={() => togglePatient(patient.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">
                        {patient.name}
                      </span>
                      {patient.detail && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {patient.detail}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                    {t("Sin pacientes para el filtro actual")}
                  </p>
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

            <DialogFooter className="-mx-6 -mb-4 px-6">
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
