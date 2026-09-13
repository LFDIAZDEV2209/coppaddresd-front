"use client";

import { useT } from "@/providers/i18n-provider";
import {
  Building2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewToggle, type DataView } from "@/components/feedback/view-toggle";
import { statusLabel } from "../professional-visuals";

// --- Toolbar con chips de filtros ---

export function DirectoryToolbar({
  filters,
  specialties,
  clinics,
  view,
  onViewChange,
  loading,
  onRefresh,
  onFilterChange,
  activeChips,
  onClearFilters,
  resultCount,
  isFiltered,
}: {
  filters: {
    search: string;
    status: string;
    specialtyId: string;
    clinicId: string;
  };
  specialties: { id: string; name: string; isActive: boolean }[];
  clinics: { id: string; name: string }[];
  view: DataView;
  onViewChange: (view: DataView) => void;
  loading: boolean;
  onRefresh: () => void;
  onFilterChange: (
    partial: Partial<{
      search: string;
      status: string;
      specialtyId: string;
      clinicId: string;
    }>,
  ) => void;
  activeChips: { key: string; label: string; onRemove: () => void }[];
  onClearFilters: () => void;
  resultCount: number;
  isFiltered: boolean;
}) {
  const t = useT();
  // El debounce (300 ms) vive en el hook: aquí notificamos en cada tecla y
  // el input es controlado (los chips y "Limpiar filtros" lo sincronizan).
  return (
    <section
      className="flex flex-col gap-2.5"
      aria-label={t("Filtros de profesionales")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[200px] sm:w-[240px]">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 bg-card pr-8 pl-9"
            value={filters.search}
            onChange={(event) => onFilterChange({ search: event.target.value })}
            placeholder={t("Buscar profesional...")}
            aria-label={t("Buscar profesionales")}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("Limpiar búsqueda")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange({ status: value ?? "all" })}
        >
          <SelectTrigger
            className="h-9 w-[170px] bg-card"
            aria-label={t("Filtrar por estado")}
          >
            <UserRound className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.status === "all"
                ? t("Estado")
                : t(statusLabel(filters.status))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todos los estados")}</SelectItem>
            <SelectItem value="Active">{t("Activo")}</SelectItem>
            <SelectItem value="Invited">{t("Invitado")}</SelectItem>
            <SelectItem value="Inactive">{t("Inactivo")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.specialtyId}
          onValueChange={(value) =>
            onFilterChange({ specialtyId: value ?? "all" })
          }
        >
          <SelectTrigger
            className="h-9 w-[175px] bg-card"
            aria-label={t("Filtrar por especialidad")}
          >
            <Stethoscope className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.specialtyId === "all"
                ? t("Especialidades")
                : (specialties.find((s) => s.id === filters.specialtyId)
                    ?.name ?? t("Especialidades"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas las especialidades")}</SelectItem>
            {specialties
              .filter((s) => s.isActive)
              .map((specialty) => (
                <SelectItem key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clinicId}
          onValueChange={(value) =>
            onFilterChange({ clinicId: value ?? "all" })
          }
        >
          <SelectTrigger
            className="h-9 w-[150px] bg-card"
            aria-label={t("Filtrar por clínica")}
          >
            <Building2 className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.clinicId === "all"
                ? t("Clínicas")
                : (clinics.find((c) => c.id === filters.clinicId)?.name ??
                  t("Clínicas"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas las clínicas")}</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label={t("Actualizar directorio")}
            title={t("Actualizar directorio")}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
          <ViewToggle value={view} onValueChange={onViewChange} />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="animate-slide-down flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <SlidersHorizontal className="size-3" />
            {t("{count} filtros activos", {
              count: String(activeChips.length),
            })}
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="animate-scale-in inline-flex items-center gap-1 rounded-full border border-primary bg-primary-soft py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-primary transition-all hover:bg-muted"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-card"
                aria-label={t("Quitar filtro {label}", { label: chip.label })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={onClearFilters}
          >
            <X data-icon="inline-start" />
            {t("Limpiar filtros")}
          </Button>
          {isFiltered && resultCount > 0 && (
            <span className="ml-1 text-[11px] text-muted-foreground">
              {t("{count} resultados", { count: String(resultCount) })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
