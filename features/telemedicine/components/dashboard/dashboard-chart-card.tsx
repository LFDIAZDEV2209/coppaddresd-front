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
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <SectionHeader
        title={title}
        description={description}
        icon={Icon}
        actions={toolbar}
      />
      <div className="p-5">{children}</div>
    </section>
  );
}
