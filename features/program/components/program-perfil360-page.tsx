"use client";

import { useState, useEffect } from "react";
import { Search, Users, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import { ProgramPatientProfile360 } from "./program-patient-profile360";
import type { PaginatedResult } from "../types";

interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  medicalRecordNumber: string | null;
}

function initialsOf(p: PatientListItem): string {
  const a = p.firstName?.trim()?.[0] ?? "";
  const b = p.lastName?.trim()?.[0] ?? "";
  const s = `${a}${b}`.toUpperCase();
  if (s) return s;
  const fallback = `${p.firstName} ${p.lastName}`.trim().slice(0, 2).toUpperCase();
  return fallback || "P";
}

interface ProgramPerfil360PageProps {
  initialPatientId?: string | null;
}

export function ProgramPerfil360Page({ initialPatientId }: ProgramPerfil360PageProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);

  const trimmed = search.trim();
  const hasQuery = trimmed.length >= 2;

  useEffect(() => {
    if (!hasQuery) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "10",
          search: trimmed,
        });
        const res = await apiFetch<PaginatedResult<PatientListItem>>(
          `${env.apiUrl}/api/v1/patients?${params.toString()}`,
        );
        if (active) setResults(res.data);
      } catch (e) {
        if (active) {
          setResults([]);
          setError(
            e instanceof Error ? e.message : "No se pudo buscar pacientes.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed, hasQuery]);

  const displayResults = hasQuery ? results : [];

  useEffect(() => {
    if (!initialPatientId || selectedPatient?.id === initialPatientId) return;

    apiFetch<PatientListItem>(
      `${env.apiUrl}/api/v1/patients/${initialPatientId}`,
    )
      .then((p) => {
        setSelectedPatient({
          id: p.id,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          email: p.email ?? null,
          medicalRecordNumber: p.medicalRecordNumber ?? null,
        });
      })
      .catch(() => {
        setSelectedPatient({
          id: initialPatientId,
          firstName: "",
          lastName: "",
          email: null,
          medicalRecordNumber: null,
        });
      });
  }, [initialPatientId, selectedPatient?.id]);

  if (selectedPatient) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="Perfil 360"
          description="Busca un paciente para ver su vista integral"
          icon={UserRound}
        />

        <section
          className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          aria-label="Buscador de paciente"
        >
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
              aria-label="Buscar paciente"
            />
          </div>
          {hasQuery && (
            <p className="mt-2 text-xs text-muted-foreground">
              Escribe al menos 2 caracteres para cambiar de paciente.
            </p>
          )}
        </section>

        <ProgramPatientProfile360
          patientId={selectedPatient.id}
          onBack={() => setSelectedPatient(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Perfil 360"
        description="Busca un paciente para ver su vista integral"
        icon={UserRound}
      />

      <section
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Buscador de paciente"
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
              aria-label="Buscar paciente"
            />
          </div>

          {!hasQuery && !selectedPatient ? (
            <p className="text-xs text-muted-foreground">
              Escribe al menos 2 caracteres para buscar.
            </p>
          ) : loading ? (
            <p className="text-xs text-muted-foreground">Buscando...</p>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : displayResults.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              {displayResults.map((p) => {
                const fullName = `${p.firstName} ${p.lastName}`.trim();
                const sublabel = p.email ?? p.medicalRecordNumber ?? undefined;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-semibold">
                      {initialsOf(p)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">
                        {fullName}
                      </span>
                      {sublabel && (
                        <span className="truncate text-xs text-muted-foreground">
                          {sublabel}
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => setSelectedPatient(p)}
                    >
                      Ver perfil 360
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : hasQuery ? (
            <p className="text-xs text-muted-foreground">
              No se encontraron pacientes.
            </p>
          ) : null}
        </div>

        {!hasQuery && !selectedPatient && !loading && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Busca un paciente</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Escribe al menos 2 caracteres para ver resultados y acceder a su
                Perfil 360.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
