"use client";

import { cn } from "@/lib/utils";

/** Anillo de progreso SVG (para cobertura y completitud). */
export function ProgressRing({
  value,
  size = 84,
  stroke = 8,
  color = "var(--primary)",
  track = "var(--muted)",
  label,
  className,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">
        {clamped}%
      </span>
    </div>
  );
}

/** Barra de progreso fina con etiqueta (para scores de tests). */
export function ScoreBar({
  value,
  color,
  label,
  className,
}: {
  value: number;
  color: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-foreground">{value}</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--muted)" }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
