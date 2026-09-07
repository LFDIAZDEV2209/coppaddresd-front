import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  /**
   * Tono del fondo: "brand" (default) usa el token ÚNICO --brand-gradient
   * (ajustable en app/globals.css → todas las cabeceras cambian juntas).
   * "primary" se reserva como acento con el azul primario.
   */
  tone?: "brand" | "primary";
  className?: string;
}

/**
 * Cabecera de página. El fondo SIEMPRE sale del token --brand-gradient
 * (globals.css): un solo lugar para ajustar el degradado de la plataforma.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  tone = "brand",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-t-xl rounded-b-none px-6 py-4 shadow-sm",
        tone === "primary" ? "bg-primary" : "bg-brand-gradient",
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
