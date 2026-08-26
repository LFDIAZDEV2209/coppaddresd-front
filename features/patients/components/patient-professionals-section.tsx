"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  LoaderCircle,
  Search,
  Stethoscope,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/providers/context-provider";
import { fetchProfessionalsCatalog } from "@/features/appointments/services/reference-service";
import {
  assignPatientProfessional,
  fetchPatientAssignments,
  removePatientProfessional,
} from "../services/patients-service";
import type { PatientProfessionalAssignment } from "../types";

/**
 * Profesionales asignados al paciente (relación del dominio "mis pacientes").
 * Lectura para todos los que pueden ver el paciente; gestión (asignar/
 * desasignar) solo con Patients.Update. El backend valida el alcance por
 * identidad: un profesional clínico solo puede asignarse a sí mismo.
 * El selector de asignación es un combobox con búsqueda (catálogo de ~100
 * profesionales), nunca un select nativo.
 */
export function PatientProfessionalsSection({
  patientId,
}: {
  patientId: string;
}) {
  const { can } = useAppContext();
  const canManage = can("Patients.Update");

  const [assignments, setAssignments] = useState<
    PatientProfessionalAssignment[]
  >([]);
  const [catalog, setCatalog] = useState<
    Array<{ id: string; fullName: string; professionalTypeName: string | null }>
  >([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Carga de asignaciones: los setState solo ocurren tras el await (nunca
  // síncronos en el efecto). reloadKey fuerza la recarga tras asignar/remover.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPatientAssignments(patientId);
        if (!active) return;
        setAssignments(data);
        setError(null);
      } catch {
        if (!active) return;
        setError("No pudimos cargar los profesionales asignados.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [patientId, reloadKey]);

  // Catálogo de profesionales para asignar (solo si puede gestionar).
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void fetchProfessionalsCatalog({ pageSize: 100, status: "Active" })
      .then((result) => {
        if (active) setCatalog(result.data);
      })
      .catch(() => {
        if (active) setCatalog([]);
      });
    return () => {
      active = false;
    };
  }, [canManage]);

  const available = catalog.filter(
    (professional) =>
      !assignments.some(
        (assignment) =>
          assignment.professionalId === professional.id &&
          assignment.status === "Active",
      ),
  );

  const filtered = available.filter((professional) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      professional.fullName.toLowerCase().includes(term) ||
      (professional.professionalTypeName ?? "").toLowerCase().includes(term)
    );
  });

  const selected =
    selectedId === ""
      ? undefined
      : catalog.find((professional) => professional.id === selectedId);

  const assign = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await assignPatientProfessional(patientId, selectedId);
      setSelectedId("");
      setSearch("");
      setReloadKey((key) => key + 1);
    } catch {
      setError("No pudimos asignar el profesional.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (professionalId: string) => {
    setSaving(true);
    setError(null);
    try {
      await removePatientProfessional(patientId, professionalId);
      setReloadKey((key) => key + 1);
    } catch {
      setError("No pudimos desasignar el profesional.");
    } finally {
      setSaving(false);
    }
  };

  const active = assignments.filter(
    (assignment) => assignment.status === "Active",
  );
  const inactive = assignments.filter(
    (assignment) => assignment.status === "Inactive",
  );

  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-label="Profesionales asignados"
    >
      <SectionHeader
        title="Profesionales asignados"
        description={`${active.length} atienden a este paciente`}
        icon={Stethoscope}
        variant="primary"
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : active.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {active.map((assignment) => (
              <li
                key={assignment.professionalId}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {initials(assignment.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {assignment.fullName}
                    </p>
                    {assignment.professionalTypeName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {assignment.professionalTypeName}
                      </p>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                    onClick={() => void remove(assignment.professionalId)}
                    disabled={saving}
                    aria-label={`Desasignar a ${assignment.fullName}`}
                  >
                    <UserMinus />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sin profesionales asignados.{" "}
            {canManage ? "Asigná uno desde el catálogo." : ""}
          </p>
        )}

        {inactive.length > 0 && (
          <p className="text-[11.5px] text-muted-foreground">
            {inactive.length} asignación{inactive.length !== 1 ? "es" : ""}{" "}
            inactiva
            {inactive.length !== 1 ? "s" : ""} (historial conservado).
          </p>
        )}

        {canManage && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex gap-2">
              <Popover
                open={pickerOpen}
                onOpenChange={(open) => {
                  setPickerOpen(open);
                  if (!open) setSearch("");
                }}
              >
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pickerOpen}
                      aria-label="Profesional a asignar"
                      className="h-9 min-w-0 flex-1 justify-start truncate font-normal"
                    >
                      <Stethoscope className="size-4 shrink-0 text-muted-foreground" />
                      {selected ? (
                        selected.fullName
                      ) : (
                        <span className="text-muted-foreground">
                          Seleccionar profesional...
                        </span>
                      )}
                      <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent
                  align="start"
                  className="w-[--anchor-width] p-2"
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
                    <Input
                      className="h-8 pl-8"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar profesional..."
                      aria-label="Buscar profesional"
                      autoFocus
                    />
                  </div>
                  <div className="mt-2 max-h-56 overflow-y-auto">
                    {filtered.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {filtered.map((professional) => (
                          <li key={professional.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(professional.id);
                                setPickerOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {professional.fullName}
                                {professional.professionalTypeName && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    · {professional.professionalTypeName}
                                  </span>
                                )}
                              </span>
                              {professional.id === selectedId && (
                                <Check className="size-4 shrink-0" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Sin coincidencias
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                onClick={() => void assign()}
                disabled={saving || !selectedId || available.length === 0}
              >
                {saving ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                Asignar
              </Button>
            </div>
            {available.length === 0 && catalog.length > 0 && (
              <p className="text-[11.5px] text-muted-foreground">
                Todos los profesionales del catálogo ya están asignados.
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
