"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, Search, BarChart3, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/auth-provider";
import { useScores } from "../hooks/use-scores";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import {
  ScoresDisplay,
  ScoresSkeleton,
  ScoresErrorState,
} from "./program-scores-display";
import type { PaginatedResult } from "../types";

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

// --- Componente principal ---

export function ProgramScoresPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const { result, loading, error, calculate, clear } = useScores();

  // Patient picker state
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PickerItem[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

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

  const handleSelectPatient = useCallback((p: PickerItem) => {
    setPatientId(p.id);
    setPatientLabel(p.label);
    setPatientSearch("");
    setPatientResults([]);
  }, []);

  const handleClearPatient = useCallback(() => {
    setPatientId(null);
    setPatientLabel("");
    clear();
  }, [clear]);

  const handleCalculate = useCallback(() => {
    if (patientId) calculate(patientId);
  }, [patientId, calculate]);

  const handleRetry = useCallback(() => {
    if (patientId) calculate(patientId);
  }, [patientId, calculate]);

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Activity className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Acceso restringido</p>
          <p className="text-xs text-muted-foreground">
            No tienes permiso para ver los scores del programa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Scores del programa"
        description="Consulta el índice de salud y transformación de un paciente"
        icon={BarChart3}
      />

      {/* Aviso de migración: los scores viven en Perfil 360 */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <p>
          Esta página se conserva por compatibilidad. Los scores clínicos ahora
          se consultan desde{" "}
          <Link
            href="/program/gestion?view=perfil-360"
            className="font-semibold underline underline-offset-2 hover:text-blue-950"
          >
            Perfil 360
          </Link>
          , dentro de la pestaña Scores clínicos de cada paciente.
        </p>
      </div>

      {/* Selector de paciente + acción */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Selector de paciente"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Paciente</h2>
            <p className="text-xs text-muted-foreground">
              Selecciona un paciente para calcular sus scores.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            disabled={!patientId || loading}
            onClick={handleCalculate}
          >
            {loading ? "Calculando..." : "Calcular scores"}
          </Button>
        </div>

        {/* Patient picker */}
        <div className="flex flex-col gap-2">
          {patientId ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
              <span className="flex-1 text-sm font-medium">
                {patientLabel}
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
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
                  placeholder="Buscar paciente por nombre..."
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
                <p className="text-xs text-muted-foreground">Buscando...</p>
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
      </section>

      {/* Contenido */}
      {loading ? (
        <ScoresSkeleton />
      ) : error ? (
        <ScoresErrorState message={error} onRetry={handleRetry} />
      ) : result ? (
        <ScoresDisplay data={result} />
      ) : (
        <ScoresEmptyState />
      )}
    </div>
  );
}

// --- Empty state (específico de la página con picker) ---

function ScoresEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <BarChart3 className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Selecciona un paciente</p>
        <p className="text-xs text-muted-foreground">
          Busca y selecciona un paciente para ver sus scores de salud y
          transformación.
        </p>
      </div>
    </div>
  );
}
