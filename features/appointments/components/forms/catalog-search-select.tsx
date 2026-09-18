"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { CatalogSearchItem } from "@/features/patients/types";

/**
 * Select searchable de catálogos del backend (CIE-10, medicamentos,
 * alergenos) del panel de la consulta: un botón abre el buscador con
 * debounce + abort de fetch y navegación por teclado (flechas/Enter/Escape).
 * El panel de resultados se expande en el flujo (sin overlays) para que el
 * scroll del bottom sheet nunca lo recorte.
 */
export function CatalogSearchSelect({
  search,
  placeholder,
  onSelect,
  accent = "teal",
  icon: Icon,
}: {
  search: (query: string, signal?: AbortSignal) => Promise<CatalogSearchItem[]>;
  placeholder: string;
  onSelect: (item: CatalogSearchItem) => void;
  accent?: "teal" | "violet" | "amber";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [selected, setSelected] = useState<CatalogSearchItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const accentRing =
    accent === "violet"
      ? "focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
      : accent === "amber"
        ? "focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
        : "focus-visible:border-ring focus-visible:ring-primary/20";

  const accentIcon =
    accent === "violet"
      ? "text-violet-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-primary";

  const runSearch = useCallback(
    async (value: string, signal?: AbortSignal) => {
      const trimmed = value.trim();
      if (!trimmed) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const items = await search(trimmed, signal);
        setResults(items);
        setHighlight(-1);
      } catch {
        if (!signal?.aborted) setResults([]);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [search],
  );

  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    timerRef.current = window.setTimeout(
      () => runSearch(value, controller.signal),
      300,
    );
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const select = (item: CatalogSearchItem) => {
    setSelected(item);
    onSelect(item);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      select(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={inputId}
        className={`flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-left outline-none transition-colors ${
          open
            ? `border-ring bg-background ${accentRing}`
            : "border-input bg-background hover:border-ring/50"
        }`}
      >
        {Icon ? (
          <Icon className={`size-4 shrink-0 ${accentIcon}`} />
        ) : (
          <Search className="size-4 shrink-0 text-muted-foreground" />
        )}
        {selected ? (
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
            {selected.code && (
              <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                {selected.code}
              </span>
            )}
            {selected.name}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={inputId}
          className="mt-1.5 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${inputId}-list`}
              aria-autocomplete="list"
              placeholder={t("Escribí para buscar…")}
              className={`h-9 w-full bg-transparent pl-9 pr-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground ${accentRing}`}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <ul
            id={`${inputId}-list`}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {!query.trim() ? (
              <li className="px-3 py-2 text-[12px] text-muted-foreground">
                {t("Escribí al menos un carácter para buscar")}
              </li>
            ) : results.length === 0 && !loading ? (
              <li className="px-3 py-2 text-[12px] text-muted-foreground">
                {t("Sin resultados")}
              </li>
            ) : (
              results.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => select(item)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left outline-none ${
                      index === highlight ? "bg-muted" : ""
                    }`}
                  >
                    {item.code && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                        {item.code}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                      {item.name}
                    </span>
                    {selected?.id === item.id && (
                      <Check className="size-3.5 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
