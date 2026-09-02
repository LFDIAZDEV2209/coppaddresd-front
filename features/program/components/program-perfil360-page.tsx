"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Users, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
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

export function ProgramPerfil360Page() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = search.trim();
  const hasQuery = trimmed.length >= 2;

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

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
        setResults(res.data);
      } catch (e) {
        setResults([]);
        setError(
          e instanceof Error ? e.message : "No se pudo buscar pacientes.",
        );
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [trimmed]);

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

          {!hasQuery ? (
            <p className="text-xs text-muted-foreground">
              Escribe al menos 2 caracteres para buscar.
            </p>
          ) : loading ? (
            <p className="text-xs text-muted-foreground">Buscando...</p>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded-md border border-border">
              {results.map((p) => {
                const fullName = `${p.firstName} ${p.lastName}`.trim();
                const sublabel = p.email ?? p.medicalRecordNumber ?? undefined;
                return (
                  <Link
                    key={p.id}
                    href={`/program/patients/${p.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-semibold">
                      {initialsOf(p)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {fullName}
                      </span>
                      {sublabel && (
                        <span className="truncate text-xs text-muted-foreground">
                          {sublabel}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No se encontraron pacientes.
            </p>
          )}
        </div>

        {!hasQuery && !loading && (
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
