import { rainbowStyle, type RainbowTone } from "@/lib/ui/rainbow";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/layout/section-header";

/**
 * Contenedor de una gráfica del dashboard: header en la barra degradada azul de
 * la plataforma (icono + título + descripción + toolbar) y el chart en el
 * cuerpo de la card. Mismo estilo que las secciones del dashboard principal
 * ("Resumen"), vía SectionHeader variant="primary".
 */
export function DashboardChartCard({
  title,
  description,
  icon: Icon,
  toolbar,
  children,
  className,
  accent = "sky",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: RainbowTone;
}) {
  return (
    <section
      data-slot="chart-card"
      style={rainbowStyle(accent)}
      className={cn(
        "spectrum-panel flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      <SectionHeader
        accent={accent}
        title={title}
        description={description}
        icon={Icon}
        actions={toolbar}
      />
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  );
}
