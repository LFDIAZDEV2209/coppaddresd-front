"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ViewToggle, type DataView } from "@/components/feedback/view-toggle";
import type { UsersFilters } from "../types";
import { useT } from "@/providers/i18n-provider";

interface UsersToolbarProps {
  filters: UsersFilters;
  /** Nombres de roles del catálogo para el filtro por rol. */
  roles: string[];
  view: DataView;
  onViewChange: (view: DataView) => void;
  onFilterChange: (partial: Partial<UsersFilters>) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

/** Labels de los selects (los <SelectItem> no siempre están montados). */
const statusLabels: Record<UsersFilters["status"], string> = {
  all: "Todos los estados",
  active: "Activos",
  inactive: "Inactivos",
};

const createdLabels: Record<UsersFilters["createdWithin"], string> = {
  all: "Cualquier fecha",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
};

/**
 * Barra de filtros del módulo. La búsqueda tiene debounce (300 ms) y los
 * filtros activos se muestran como chips removibles individualmente + botón
 * de limpiar — el usuario nunca tiene que recordar qué aplicó.
 */
export function UsersToolbar({
  filters,
  roles,
  view,
  onViewChange,
  onFilterChange,
}: UsersToolbarProps) {
  const t = useT();
  // Valor local con debounce: evita relanzar la carga en cada tecla.
  const [searchValue, setSearchValue] = useState(filters.search);
  // Si `filters.search` cambia por fuera (ej. "Limpiar filtros"), resetea el
  // valor local — patrón de ajuste de estado durante el render (React docs).
  const [prevCanonical, setPrevCanonical] = useState(filters.search);
  if (prevCanonical !== filters.search) {
    setPrevCanonical(filters.search);
    setSearchValue(filters.search);
  }

  useEffect(() => {
    if (searchValue === filters.search) return;
    const timer = setTimeout(
      () => onFilterChange({ search: searchValue }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const activeChips = buildActiveChips(filters, roles, t, onFilterChange);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[200px] sm:w-[280px]">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("Buscar por nombre o email...")}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 bg-card pr-8 pl-9"
            aria-label={t("Buscar usuarios")}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("Limpiar búsqueda")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            onFilterChange({ status: value as UsersFilters["status"] })
          }
        >
          <SelectTrigger className="h-9 w-[170px] bg-card">
            <UserRound className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {t(statusLabels[filters.status] ?? "Estado")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todos los estados")}</SelectItem>
            <SelectItem value="active">{t("Activos")}</SelectItem>
            <SelectItem value="inactive">{t("Inactivos")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.role}
          onValueChange={(value) =>
            onFilterChange({ role: value as UsersFilters["role"] })
          }
        >
          <SelectTrigger className="h-9 w-[190px] bg-card">
            <UsersRound className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.role === "all"
                ? t("Todos los roles")
                : filters.role === "none"
                  ? t("Sin roles")
                  : filters.role}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todos los roles")}</SelectItem>
            <SelectItem value="none">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-warning-foreground" />
                {t("Sin roles")}
              </span>
            </SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.createdWithin}
          onValueChange={(value) =>
            onFilterChange({
              createdWithin: value as UsersFilters["createdWithin"],
            })
          }
        >
          <SelectTrigger className="h-9 w-[180px] bg-card">
            <CalendarDays className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {t(createdLabels[filters.createdWithin] ?? "Fecha de creación")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Cualquier fecha")}</SelectItem>
            <SelectItem value="7d">{t("Últimos 7 días")}</SelectItem>
            <SelectItem value="30d">{t("Últimos 30 días")}</SelectItem>
            <SelectItem value="90d">{t("Últimos 90 días")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
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
              className="animate-scale-in inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-primary transition-all hover:bg-primary/15"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-primary/20"
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
            onClick={() =>
              onFilterChange({
                search: "",
                status: "all",
                role: "all",
                createdWithin: "all",
              })
            }
          >
            <X data-icon="inline-start" />
            {t("Limpiar filtros")}
          </Button>
        </div>
      )}
    </div>
  );
}

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

function buildActiveChips(
  filters: UsersFilters,
  roles: string[],
  t: (key: string, vars?: Record<string, string>) => string,
  onFilterChange: (partial: Partial<UsersFilters>) => void,
): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.search) {
    chips.push({
      key: "search",
      label: `"${filters.search.trim()}"`,
      onRemove: () => onFilterChange({ search: "" }),
    });
  }
  if (filters.status !== "all") {
    chips.push({
      key: "status",
      label:
        filters.status === "active"
          ? t("Estado: Activos")
          : t("Estado: Inactivos"),
      onRemove: () => onFilterChange({ status: "all" }),
    });
  }
  if (filters.role === "none") {
    chips.push({
      key: "role",
      label: t("Sin roles asignados"),
      onRemove: () => onFilterChange({ role: "all" }),
    });
  } else if (filters.role !== "all" && roles.includes(filters.role)) {
    chips.push({
      key: "role",
      label: `${t("Rol")}: ${filters.role}`,
      onRemove: () => onFilterChange({ role: "all" }),
    });
  }
  if (filters.createdWithin !== "all") {
    const labels: Record<string, string> = {
      "7d": t("Últimos 7 días"),
      "30d": t("Últimos 30 días"),
      "90d": t("Últimos 90 días"),
    };
    chips.push({
      key: "createdWithin",
      label: labels[filters.createdWithin],
      onRemove: () => onFilterChange({ createdWithin: "all" }),
    });
  }
  return chips;
}
