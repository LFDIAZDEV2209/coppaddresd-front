"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import {
  CheckIcon,
  ChevronsUpDown,
  LoaderCircle,
  Search,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogComboboxProps<T extends { id: string }> {
  /** Item seleccionado (null = sin selección). */
  value: T | null;
  /** Se invoca al seleccionar o quitar la selección. */
  onSelect: (item: T | null) => void;
  /** Modo estático: lista completa provista por el padre (filtro local). */
  items?: T[];
  /** Modo remoto: búsqueda contra el backend (debounce + abort). */
  fetchItems?: (query: string, signal: AbortSignal) => Promise<T[]>;
  /** Texto visible de cada item (trigger y lista). */
  getLabel: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

/**
 * Combobox buscable sobre catálogos del backend. Soporta dos modos:
 * - Estático (`items`): lista cerrada pequeña, filtro local.
 * - Remoto (`fetchItems`): autocomplete con debounce, abort de peticiones
 *   previas y estado de carga/error (patrón async search de Base UI).
 */
export function CatalogCombobox<T extends { id: string }>({
  value,
  onSelect,
  items,
  fetchItems,
  getLabel,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados.",
  disabled = false,
  allowClear = false,
  className,
}: CatalogComboboxProps<T>) {
  const { contains } = Combobox.useFilter();
  const [results, setResults] = React.useState<T[]>([]);
  const [searchValue, setSearchValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const requestIdRef = React.useRef(0);

  const isRemote = fetchItems !== undefined;

  const displayItems = React.useMemo(() => {
    if (!isRemote) return items ?? [];
    if (!value || results.some((r) => r.id === value.id)) return results;
    return [...results, value];
  }, [isRemote, items, results, value]);

  const status = React.useMemo(() => {
    if (loading) {
      return (
        <span className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Buscando…
        </span>
      );
    }
    if (failed) {
      return <span className="text-destructive">No se pudo buscar. Reintenta.</span>;
    }
    if (isRemote && !searchValue.trim()) {
      return <span className="text-muted-foreground">Escribe para buscar…</span>;
    }
    return null;
  }, [failed, isRemote, loading, searchValue]);

  const emptyMessage = React.useMemo(() => {
    if (loading || failed) return null;
    if (isRemote && !searchValue.trim()) return null;
    if (displayItems.length > 0) return null;
    return emptyText;
  }, [displayItems.length, emptyText, failed, isRemote, loading, searchValue]);

  const clearSelection = () => {
    abortRef.current?.abort();
    setResults([]);
    setSearchValue("");
    setFailed(false);
    onSelect(null);
  };

  return (
    <Combobox.Root
      items={displayItems}
      itemToStringLabel={getLabel}
      filter={isRemote ? null : contains}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        setSearchValue("");
        setFailed(false);
        onSelect(next);
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          setResults(isRemote && value ? [value] : []);
        }
      }}
      onInputValueChange={(next, { reason }) => {
        setSearchValue(next);

        if (next === "") {
          setResults([]);
          setFailed(false);
          return;
        }

        if (reason === "item-press") return;

        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;
        const requestId = ++requestIdRef.current;
        setLoading(true);
        setFailed(false);

        fetchItems?.(next, controller.signal)
          .then((items) => {
            if (controller.signal.aborted) return;
            setResults(items);
          })
          .catch(() => {
            if (controller.signal.aborted) return;
            setResults([]);
            setFailed(true);
          })
          .finally(() => {
            if (requestId === requestIdRef.current) setLoading(false);
          });
      }}
    >
      <Combobox.Trigger
        data-slot="catalog-combobox-trigger"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">
          <Combobox.Value placeholder={placeholder} />
        </span>
        <Combobox.Icon className="shrink-0">
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Combobox.Icon>
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <Combobox.Popup
            aria-label={placeholder}
            className="w-(--anchor-width) origin-(--transform-origin) rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"
          >
            <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                placeholder={searchPlaceholder}
                className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {allowClear && value && (
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-label="Quitar selección"
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
            <Combobox.Status>
              {status && (
                <div className="px-3 py-1.5 text-xs">{status}</div>
              )}
            </Combobox.Status>
            <Combobox.Empty>
              {emptyMessage && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </Combobox.Empty>
            <Combobox.List className="max-h-(--available-height) overflow-y-auto overscroll-contain p-1 outline-none">
              {(item) => (
                <Combobox.Item
                  key={item.id}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium"
                >
                  <span className="flex-1 truncate">{getLabel(item)}</span>
                  <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4 text-primary" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}