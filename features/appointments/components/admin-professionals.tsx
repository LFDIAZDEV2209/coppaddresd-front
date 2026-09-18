"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Users,
  Search,
  Stethoscope,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchProfessionalsCatalog } from "../services/reference-service";
import type { ProfessionalCatalogItemDto } from "../types";

export function AdminProfessionals() {
  const t = useT();
  const [items, setItems] = useState<ProfessionalCatalogItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearchState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await fetchProfessionalsCatalog({ page, pageSize, search: search || undefined });
        if (!active) return;
        setItems(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudo cargar el catálogo de profesionales.");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [page, pageSize, search]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageState(1);
    setLoading(true);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setLoading(true);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('Profesionales')}
        description={t('Catálogo de profesionales clínicos del ERP')}
        icon={Users}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Buscar profesionales...')}
            className="h-9 pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="text-[12px] text-muted-foreground">
          {t('{total} profesional{plural}', {
            total: String(total),
            plural: total === 1 ? "" : "es",
          })}
        </span>
      </div>

      {error && (
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {t(error)}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('No hay profesionales')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((professional) => (
              <div key={professional.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Stethoscope className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {professional.fullName}
                    </span>
                    <span className="truncate text-[11.5px] text-muted-foreground">
                      {professional.professionalTypeName ?? t('Profesional')}
                    </span>
                  </div>
                  <Badge variant={professional.status === "Active" ? "default" : "secondary"}>
                    {professional.status === "Active" ? t('Activo') : professional.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {professional.specialties.map((specialty) => (
                    <Badge key={specialty.id} variant="outline" className="text-[10.5px]">
                      {specialty.name}
                    </Badge>
                  ))}
                  {professional.specialties.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">{t('Sin especialidades')}</span>
                  )}
                </div>

                {professional.locations.length > 0 && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t('Sedes')}: {professional.locations.map((location) => location.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Anterior')}
              </Button>
              <span className="text-[12px] text-muted-foreground">
                {t('Página {page} de {totalPages}', { page: String(page), totalPages: String(totalPages) })}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                {t('Siguiente')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
