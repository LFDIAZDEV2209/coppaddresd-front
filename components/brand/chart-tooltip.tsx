"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartTooltipProps {
  visible: boolean;
  title: string;
  label: string;
  value: string;
  /** Variación vs. periodo anterior. */
  delta?: { value: string; up: boolean; vs: string };
  extra?: string;
  /** Alineación para no salir del card en la primera/última columna. */
  align?: "center" | "start" | "end";
  /** Ancla: encima (default) o debajo del elemento. */
  placement?: "top" | "bottom";
  /** Desplazamiento vertical manual (px) — permite el clamp del host. */
  style?: React.CSSProperties;
}

/**
 * Tooltip de gráficas COPP-ADRESD: tarjeta navy con flecha, jerarquía
 * título→valor→variación, acento teal/rojo según el signo. Aparece con
 * animación sutil y respeta prefers-reduced-motion.
 */
export function ChartTooltip({
  visible,
  title,
  label,
  value,
  delta,
  extra,
  align = "center",
  placement = "top",
  style,
}: ChartTooltipProps) {
  if (!visible) return null;

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-30 w-max animate-in fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none",
        placement === "top" ? "mb-2.5 bottom-full" : "top-full mt-2.5",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "start" && "left-0",
        align === "end" && "right-0",
      )}
      style={style}
    >
      <div className="rounded-xl bg-brand-navy px-3.5 py-2.5 shadow-xl shadow-black/30 ring-1 ring-white/15">
        <p className="font-heading text-[13px] font-bold tracking-tight text-white">
          {title}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[11px] text-white/60">{label}</span>
          <span className="text-[15px] font-bold text-white">{value}</span>
        </div>
        {delta && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-[11px] font-semibold",
              delta.up ? "text-teal-300" : "text-rose-300",
            )}
          >
            {delta.up ? (
              <ArrowUpRight className="size-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden="true" />
            )}
            {delta.value}
            <span className="font-normal text-white/55">{delta.vs}</span>
          </p>
        )}
        {extra && <p className="mt-1 text-[11px] text-white/60">{extra}</p>}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "absolute size-2 rotate-45 rounded-[2px] bg-brand-navy ring-1 ring-white/15",
          placement === "top" ? "-bottom-1" : "-top-1",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "start" && "left-6",
          align === "end" && "right-6",
        )}
      />
    </div>
  );
}
