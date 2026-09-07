import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  /** Tono del gradiente de fondo: navy (default, color principal del sidebar) o primary (azul de acento). */
  tone?: "navy" | "primary";
  className?: string;
}

/**
 * Cabecera de página. El color principal de la plataforma es el navy del
 * sidebar (`--sidebar`): el tono por defecto lo usa con un degradado LEVE
 * (viraje sutil, sin azul claro protagonista). `primary` se reserva como
 * acento en vistas que lo requieran.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  tone = "navy",
  className,
}: PageHeaderProps) {
  const gradient =
    tone === "primary"
      ? "from-primary via-primary/85 to-[color-mix(in_srgb,var(--primary)_50%,var(--sidebar))]"
      : "from-[var(--sidebar)] via-[#0c4c6b] to-brand-teal";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-t-xl rounded-b-none bg-gradient-to-r px-6 py-4 shadow-sm",
        gradient,
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--sidebar)] shadow-sm">
        <Icon className="size-5" />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden min-w-0">
        <h1 className="text-lg font-bold text-white tracking-tight truncate">
          {title}
        </h1>
        <p className="text-[12px] text-white/80 truncate">{description}</p>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
