"use client";

import { Search, SlidersHorizontal, UserRound, UsersRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ViewToggle, type DataView } from "@/components/feedback/view-toggle";
import type { UsersFilters } from "../types";

interface UsersToolbarProps {
  filters: UsersFilters;
  /** Nombres de roles del catálogo para el filtro por rol. */
  roles: string[];
  view: DataView;
  onViewChange: (view: DataView) => void;
  onFilterChange: (partial: Partial<UsersFilters>) => void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

export function UsersToolbar({
  filters,
  roles,
  view,
  onViewChange,
  onFilterChange,
}: UsersToolbarProps) {
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.role !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full min-w-[200px] sm:w-[260px]">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="h-9 bg-card pl-9"
          aria-label="Buscar usuarios"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFilterChange({ status: value as UsersFilters["status"] })
        }
      >
        <SelectTrigger className="h-9 w-[170px] bg-card">
          <UserRound className="mr-2 size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
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
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <>
          <Badge
            variant="secondary"
            className="h-6 gap-1 px-2 text-[11px]"
            aria-label={`${activeFilterCount} filtros activos`}
          >
            <SlidersHorizontal className="size-3" />
            {activeFilterCount}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-muted-foreground"
            onClick={() =>
              onFilterChange({ search: "", status: "all", role: "all" })
            }
          >
            <X className="size-3.5" />
            Limpiar
          </Button>
        </>
      )}

      <div className="ml-auto">
        <ViewToggle value={view} onValueChange={onViewChange} />
      </div>
    </div>
  );
}