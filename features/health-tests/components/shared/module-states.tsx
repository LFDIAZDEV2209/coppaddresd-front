"use client";

import { RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Estado vacío del módulo (filtros sin resultados o sin datos). */
export function ModuleEmptyState({
  title,
  description,
  filtered = false,
  onClear,
  className,
}: {
  title: string;
  description: string;
  filtered?: boolean;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <SearchX className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {filtered && onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          <RefreshCw data-icon="inline-start" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

/** Estado de error del módulo con reintento. */
export function ModuleErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center",
        className,
      )}
      role="alert"
    >
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar la información
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
