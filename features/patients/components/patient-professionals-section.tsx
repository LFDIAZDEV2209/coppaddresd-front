"use client";

import { useEffect, useState } from "react";
import {
  LoaderCircle,
  Stethoscope,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/providers/context-provider";
import { fetchProfessionalsCatalog } from "@/features/telemedicine/services/reference-service";
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
 */
export function PatientProfessionalsSection({ patientId }: { patientId: string }) {
  const { can } = useAppContext();
  const canManage = can("Patients.Update");

  const [assignments, setAssignments] = useState<PatientProfessionalAssignment[]>([]);
  const [catalog, setCatalog] = useState<
    Array<{ id: string; fullName: string; professionalTypeName: string | null }>
  >([]);
  const [selectedId, setSelectedId] = useState("");
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
          assignment.professionalId === professional.id && assignment.status === "Active",
      ),
  );

  const assign = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await assignPatientProfessional(patientId, selectedId);
      setSelectedId("");
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

  const active = assignments.filter((assignment) => assignment.status === "Active");
  const inactive = assignments.filter((assignment) => assignment.status === "Inactive");

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label="Profesionales asignados"
    >
      <SectionHeader
        title="Profesionales asignados"
        description={`${active.length} atienden a este paciente`}
        icon={Stethoscope}
        variant="primary"
      />

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
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {assignment.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{assignment.fullName}</p>
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
                  className="text-destructive hover:text-destructive"
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
          Sin profesionales asignados. {canManage ? "Asigná uno desde el catálogo." : ""}
        </p>
      )}

      {inactive.length > 0 && (
        <p className="text-[11.5px] text-muted-foreground">
          {inactive.length} asignación{inactive.length !== 1 ? "es" : ""} inactiva
          {inactive.length !== 1 ? "s" : ""} (historial conservado).
        </p>
      )}

      {canManage && (
        <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <div className="flex gap-2">
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Profesional a asignar"
            >
              <option value="">Seleccionar profesional...</option>
              {available.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.fullName}
                  {professional.professionalTypeName
                    ? ` · ${professional.professionalTypeName}`
                    : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => void assign()}
              disabled={saving || !selectedId || available.length === 0}
            >
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" data-icon="inline-start" />
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
    </section>
  );
}