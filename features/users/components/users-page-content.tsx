"use client";

import { Users as UsersIcon, Plus, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { UsersToolbar } from "./users-toolbar";
import { UsersTable } from "./users-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsers } from "../hooks/use-users";
import { useState } from "react";

export function UsersPageContent() {
  const {
    result,
    loading,
    filters,
    selectedIds,
    setFilters,
    toggleSelect,
    toggleSelectAll,
  } = useUsers();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        icon={UsersIcon}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border-strong text-secondary-foreground"
            >
              <Download className="size-[15px]" />
              Exportar
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
            >
              <Plus className="size-[15px]" />
              Nuevo usuario
            </Button>
          </>
        }
      />

      <UsersToolbar
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {loading ? (
        <UsersTableSkeleton />
      ) : result && result.data.length > 0 ? (
        <div className="rounded-[14px] border border-border bg-card">
          {selectedIds.size > 0 && (
            <BulkActionBar count={selectedIds.size} />
          )}
          <UsersTable
            users={result.data}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function BulkActionBar({ count }: { count: number }) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-muted px-4">
      <div className="flex size-4 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
        {count}
      </div>
      <span className="text-[12px] text-muted-foreground">
        seleccionado{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-border bg-card py-16">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <UsersIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground">
          No se encontraron usuarios
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Intenta ajustar los filtros o crea un nuevo usuario.
        </p>
      </div>
    </div>
  );
}
