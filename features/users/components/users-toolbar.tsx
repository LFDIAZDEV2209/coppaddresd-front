"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table } from "lucide-react";
import type { UsersFilters } from "../types";
import { getRoles, getStatuses } from "../services/users-service";

interface UsersToolbarProps {
  filters: UsersFilters;
  onFilterChange: (partial: Partial<UsersFilters>) => void;
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
}

export function UsersToolbar({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: UsersToolbarProps) {
  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.role !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-[280px]">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="h-[38px] pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFilterChange({ status: value as UsersFilters["status"] })
        }
      >
        <SelectTrigger className="h-[38px] w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {getStatuses().map((s) => (
            <SelectItem key={s} value={s}>
              {s}
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
        <SelectTrigger className="h-[38px] w-[180px]">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          {getRoles().map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
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
      )}

      <div className="ml-auto flex items-center" />

      <div className="flex items-center rounded-lg border border-border">
        <Button
          variant={viewMode === "table" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 rounded-r-none"
          onClick={() => onViewModeChange("table")}
          aria-label="Vista tabla"
        >
          <Table className="size-4" />
        </Button>
        <Button
          variant={viewMode === "cards" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 rounded-l-none"
          onClick={() => onViewModeChange("cards")}
          aria-label="Vista tarjetas"
        >
          <LayoutGrid className="size-4" />
        </Button>
      </div>
    </div>
  );
}
