"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import type { CatalogSearchItem } from "@/features/patients/types";

/**
 * Select searchable de catálogos del backend (CIE-10, medicamentos,
 * alergenos) para el tema oscuro de la sala: un botón abre el buscador con
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
      ? "focus-visible:border-violet-400/60 focus-visible:ring-violet-400/20"
      : accent === "amber"
        ? "focus-visible:border-amber-400/60 focus-visible:ring-amber-400/20"
        : "focus-visible:border-teal-400/60 focus-visible:ring-teal-400/20";

  const accentIcon =
    accent === "violet"
      ? "text-violet-300"
      : accent === "amber"
        ? "text-amber-300"
        : "text-teal-300";

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
            ? `border-white/25 bg-slate-800 ${accentRing}`
            : "border-slate-600/60 bg-slate-800/80 hover:border-slate-500/70"
        }`}
      >
        {Icon ? (
          <Icon className={`size-4 shrink-0 ${accentIcon}`} />
        ) : (
          <Search className="size-4 shrink-0 text-slate-500" />
        )}
        {selected ? (
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
            {selected.code && (
              <span className="mr-1.5 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-teal-300">
                {selected.code}
              </span>
            )}
            {selected.name}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-400">
            {placeholder}
          </span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={inputId}
          className="mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-2xl shadow-black/50"
        >
          <div className="relative border-b border-white/10">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${inputId}-list`}
              aria-autocomplete="list"
              placeholder="Escribí para buscar…"
              className={`h-9 w-full bg-transparent pl-9 pr-8 text-[13px] text-white outline-none placeholder:text-slate-500 ${accentRing}`}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-slate-500" />
            )}
          </div>
          <ul
            id={`${inputId}-list`}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {!query.trim() ? (
              <li className="px-3 py-2 text-[12px] text-slate-500">
                Escribí al menos un carácter para buscar
              </li>
            ) : results.length === 0 && !loading ? (
              <li className="px-3 py-2 text-[12px] text-slate-500">
                Sin resultados
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
                      index === highlight ? "bg-white/10" : ""
                    }`}
                  >
                    {item.code && (
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-teal-300">
                        {item.code}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-100">
                      {item.name}
                    </span>
                    {selected?.id === item.id && (
                      <Check className="size-3.5 shrink-0 text-teal-300" />
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
