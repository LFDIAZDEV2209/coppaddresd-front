"use client";

import { useEffect, useState } from "react";
import { BarChart3, ChartPie, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SectionHeader } from "@/components/layout/section-header";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

export interface DistributionItem {
  label: string;
  value: number;
  hint?: string;
  /** Icono Lucide del registro (badge con el tinte del item). */
  icon?: LucideIcon;
}

/**
 * Badge circular del registro: glifo Lucide sobre el tinte del item
 * (color-mix con transparente → adapta a claro/oscuro). Decorativo.
 */
function ItemBadge({
  icon: Icon,
  color,
  size,
}: {
  icon: LucideIcon;
  color: string;
  size: "md" | "sm";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "size-8" : "size-7",
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        color,
      }}
    >
      <Icon aria-hidden className={size === "md" ? "size-4" : "size-3.5"} />
    </span>
  );
}

/** Respeta `prefers-reduced-motion` para desactivar animaciones de recharts. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Card de distribución con cambio barras ⇄ círculo: el círculo usa la paleta
 * del design system con animación de recharts y leyenda con porcentajes; las
 * barras crecen animadas respetando `prefers-reduced-motion`. Los datos son
 * reales (agregados scoped del backend) — nunca cifras simuladas.
 */
export function PatientDistributionChart({
  title,
  description,
  icon,
  items,
  colors,
  barColor = "var(--primary)",
  defaultMode = "bars",
  emptyLabel,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  items: DistributionItem[];
  colors: string[];
  barColor?: string;
  defaultMode?: "bars" | "donut";
  emptyLabel: string;
}) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<"bars" | "donut">(defaultMode);

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={title}
        description={description}
        icon={icon}
        variant="primary"
        actions={
          <ToggleGroup
            value={[mode]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "bars" || next === "donut") setMode(next);
            }}
            aria-label={t("Cambiar tipo de gráfica")}
          >
            <ToggleGroupItem
              value="bars"
              title={t("Ver como barras")}
              className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
            >
              <BarChart3 aria-hidden className="size-4" />
              <span className="sr-only">{t("Ver como barras")}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="donut"
              title={t("Ver como círculo")}
              className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
            >
              <ChartPie aria-hidden className="size-4" />
              <span className="sr-only">{t("Ver como círculo")}</span>
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="p-5">
        {items.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            <Inbox aria-hidden className="size-5" />
            {emptyLabel}
          </div>
        ) : mode === "donut" ? (
          <div className="flex animate-fade-in flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items.map((item, index) => ({
                      name: item.label,
                      value: item.value,
                      color: colors[index % colors.length],
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={!reduced}
                    animationDuration={650}
                  >
                    {items.map((item, index) => (
                      <Cell
                        key={item.label}
                        fill={colors[index % colors.length]}
                        className="transition-opacity duration-200 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}${
                        total > 0
                          ? ` · ${Math.round((Number(value) / total) * 100)}%`
                          : ""
                      }`,
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tabular-nums">{total}</span>
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  {t("pacientes")}
                </span>
              </div>
            </div>
            <ul className="flex w-full flex-col gap-2 text-sm sm:w-auto">
              {items.map((item, index) => (
                <li key={item.label} className="flex items-center gap-2">
                  {item.icon ? (
                    <ItemBadge
                      icon={item.icon}
                      color={colors[index % colors.length]}
                      size="sm"
                    />
                  ) : (
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                      aria-hidden
                    />
                  )}
                  <span
                    className="min-w-0 flex-1 truncate font-medium"
                    title={item.hint ?? item.label}
                  >
                    {item.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.value}
                  </span>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {total > 0
                      ? `${Math.round((item.value / total) * 100)}%`
                      : "0%"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex animate-fade-in flex-col gap-3" role="list">
            {items.map((item, index) => (
              <li key={item.label} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 text-sm">
                  {item.icon && (
                    <ItemBadge
                      icon={item.icon}
                      color={colors[index % colors.length]}
                      size="md"
                    />
                  )}
                  <span
                    className="min-w-0 flex-1 truncate font-medium"
                    title={item.hint ?? item.label}
                  >
                    {item.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.value}
                    {total > 0 && (
                      <span className="ml-1.5 text-xs">
                        {Math.round((item.value / total) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
                    )}
                    style={{
                      width: `${(item.value / max) * 100}%`,
                      backgroundColor: barColor,
                    }}
                    role="img"
                    aria-label={`${item.label}: ${item.value} ${t("pacientes")}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
