"use client";

import { useState, useEffect } from "react";
import { Search, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
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
  const fallback = `${p.firstName} ${p.lastName}`
    .trim()
    .slice(0, 2)
    .toUpperCase();
  return fallback || "P";
}

interface PatientSearchBoxProps {
  search: string;
  onSearchChange: (val: string) => void;
  loading: boolean;
  error: string | null;
  results: PatientListItem[];
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onSelectPatient: (patient: PatientListItem) => void;
  autoFocusInput?: boolean;
}

function PatientSearchBox({
  search,
  onSearchChange,
  loading,
  error,
  results,
  page,
  totalPages,
  totalCount,
  onPageChange,
  onSelectPatient,
  autoFocusInput = false,
}: PatientSearchBoxProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-label="Buscador de paciente"
    >
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-8"
          aria-label="Buscar paciente"
          autoFocus={autoFocusInput}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {loading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Cargando pacientes...
          </p>
        ) : error ? (
          <p className="py-2 text-xs text-destructive">{error}</p>
        ) : results.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {results.map((p) => {
                const fullName = `${p.firstName} ${p.lastName}`.trim();
                const sublabel =
                  p.email ?? p.medicalRecordNumber ?? undefined;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
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
                      onClick={() => onSelectPatient(p)}
                    >
                      Ver perfil 360
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Controles de paginación */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages} ({totalCount}{" "}
                {totalCount === 1 ? "paciente" : "pacientes"})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft className="mr-1 size-3.5" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Siguiente
                  <ChevronRight className="ml-1 size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No se encontraron pacientes.
          </p>
        )}
      </div>
    </section>
  );
}

interface ProgramPerfil360PageProps {
  initialPatientId?: string | null;
}

export function ProgramPerfil360Page({
  initialPatientId,
}: ProgramPerfil360PageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PatientListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const trimmed = search.trim();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "10",
        });
        if (trimmed) {
          params.set("search", trimmed);
        }
        const res = await apiFetch<PaginatedResult<PatientListItem>>(
          `${env.apiUrl}/api/v1/patients?${params.toString()}`,
        );
        if (active) {
          setResults(res.data ?? []);
          setTotalCount(res.total ?? 0);
          setTotalPages(res.totalPages ?? 1);
        }
      } catch (e) {
        if (active) {
          setResults([]);
          setTotalCount(0);
          setTotalPages(1);
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
  }, [trimmed, page]);

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

  // Cuando se selecciona un paciente, ocultar el buscador por defecto
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- UI sync, intentional
    if (selectedPatient) setShowSearch(false);
  }, [selectedPatient]);

  if (selectedPatient) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {showSearch && (
          <PatientSearchBox
            search={search}
            onSearchChange={handleSearchChange}
            loading={loading}
            error={error}
            results={results}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
            onSelectPatient={(p) => {
              setSelectedPatient(p);
              setShowSearch(false);
            }}
            autoFocusInput
          />
        )}

        <ProgramPatientProfile360
          patientId={selectedPatient.id}
          onBack={() => setSelectedPatient(null)}
          onToggleSearch={() => setShowSearch((v) => !v)}
          isSearchOpen={showSearch}
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

      <PatientSearchBox
        search={search}
        onSearchChange={handleSearchChange}
        loading={loading}
        error={error}
        results={results}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        onSelectPatient={setSelectedPatient}
      />
    </div>
  );
}

