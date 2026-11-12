"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, X } from "lucide-react";
import { visibleNavModules, visibleNavItems } from "@/lib/config/navigation";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** Búsqueda de navegación: usa exactamente el mismo alcance y permisos que el sidebar. */
export function GlobalSearch() {
  const t = useT(),
    router = useRouter(),
    { can } = useAppContext();
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const entries = useMemo(() => {
    const seen = new Set<string>();
    return visibleNavModules(can).flatMap((module) =>
      visibleNavItems(module, can)
        .filter((item) => {
          if (seen.has(item.href)) return false;
          seen.add(item.href);
          return true;
        })
        .map((item) => ({
          ...item,
          title: t(item.label),
          module: t(module.label),
          search: normalize(
            `${item.label} ${t(item.label)} ${module.label} ${t(module.label)} ${item.href}`,
          ),
        })),
    );
  }, [can, t]);
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const results = entries
    .filter((item) => terms.every((term) => item.search.includes(term)))
    .slice(0, 8);
  useEffect(() => {
    if (mobile) input.current?.focus();
  }, [mobile]);
  const close = () => {
    setOpen(false);
    setMobile(false);
  };
  const go = (href: string) => {
    close();
    setQuery("");
    setActive(-1);
    router.push(href);
  };
  return (
    <div
      className="contents md:relative md:block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={t("Buscar en el ERP")}
        aria-expanded={mobile}
        onClick={() => {
          setMobile(true);
          setOpen(true);
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring md:hidden"
      >
        <Search aria-hidden="true" className="size-4" />
      </button>
      <div
        className={cn(
          "md:relative md:block",
          mobile
            ? "absolute inset-x-3 top-[calc(100%+8px)] rounded-xl border border-border bg-card p-2 shadow-lg"
            : "hidden",
        )}
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            ref={input}
            role="combobox"
            aria-label={t("Buscar páginas o módulos")}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? `${id}-results` : undefined}
            aria-activedescendant={
              open && active >= 0 && results[active]
                ? `${id}-${active}`
                : undefined
            }
            value={query}
            placeholder={t("Buscar...")}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
                if (mobile) trigger.current?.focus();
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                if (results.length)
                  setActive((index) =>
                    event.key === "ArrowDown"
                      ? (index + 1) % results.length
                      : index < 0
                        ? results.length - 1
                        : (index - 1 + results.length) % results.length,
                  );
              } else if (event.key === "Enter") {
                event.preventDefault();
                const result = results[active < 0 ? 0 : active];
                if (open && result) go(result.href);
              }
            }}
            className="h-10 w-full rounded-[10px] border border-border bg-background pl-9 pr-9 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 md:w-40 xl:w-56"
          />
          {query && (
            <button
              type="button"
              aria-label={t("Limpiar búsqueda")}
              onClick={() => {
                setQuery("");
                setActive(-1);
                input.current?.focus();
              }}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        {open && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg md:absolute md:right-0 md:z-50 md:w-80">
            <p className="border-b border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground">
              {t("Páginas y módulos")}
            </p>
            <div
              id={`${id}-results`}
              role="listbox"
              aria-label={t("Páginas y módulos")}
              className="max-h-80 overflow-y-auto p-1"
            >
              {results.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    id={`${id}-${index}`}
                    key={item.href}
                    type="button"
                    role="option"
                    aria-selected={active === index}
                    tabIndex={-1}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted",
                      active === index && "bg-primary-soft",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {item.module}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground"
                    />
                  </button>
                );
              })}
            </div>
            {results.length === 0 && (
              <p
                role="status"
                className="px-4 pb-4 pt-2 text-sm text-muted-foreground"
              >
                {t("No encontramos páginas")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
