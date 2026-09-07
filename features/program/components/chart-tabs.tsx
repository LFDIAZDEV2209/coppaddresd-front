"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { cn } from "@/lib/utils";

// --- Types ---

export interface ChartTab {
  key: string;
  label: string;
}

export interface ChartTabsProps {
  tabs: ChartTab[];
  value: string;
  onChange: (key: string) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

// --- Hook: usePersistedTab ---

/** sessionStorage no emite eventos de cambio: suscripción no-op. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const subscribeStorage = (_onStoreChange: () => void) => () => {};

/**
 * Persists the selected tab in sessionStorage so it survives page reloads
 * within the same browser session. SSR-safe (useSyncExternalStore renders
 * the server snapshot during hydration, then reads the stored value).
 */
export function usePersistedTab(
  tabKey: string,
  defaultKey: string,
): [string, (key: string) => void] {
  const storageKey = `program:charttab:${tabKey}`;

  // sessionStorage no emite eventos: la suscripción es una no-op; la lectura
  // ocurre en cada render vía getSnapshot (comparación por valor en strings).
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return sessionStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null,
  );

  // Override local para el cambio inmediato tras escribir en sessionStorage.
  const [override, setOverride] = useState<string | null>(null);

  const setValue = useCallback(
    (key: string) => {
      setOverride(key);
      try {
        sessionStorage.setItem(storageKey, key);
      } catch {
        // sessionStorage may be unavailable (SSR / private mode)
      }
    },
    [storageKey],
  );

  return [override ?? stored ?? defaultKey, setValue];
}

// --- Component: ChartTabs ---

/**
 * A reusable card that wraps a segmented-control tab switcher with a single
 * content slot. Follows the fya-ui-style design system (rounded-2xl, bg-card,
 * border-border, SectionHeader, compact density).
 */
export function ChartTabs({
  tabs,
  value,
  onChange,
  title,
  description,
  icon,
  children,
}: ChartTabsProps) {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header with SectionHeader + segmented control */}
      <div className="flex flex-col gap-3 border-b border-border bg-card px-5 pt-4 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader
          title={title}
          description={description}
          icon={icon}
          variant="secondary"
          className="min-w-0 flex-1 border-none bg-transparent px-0 py-0"
        />

        {/* Segmented control */}
        <div className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.key === value;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}
