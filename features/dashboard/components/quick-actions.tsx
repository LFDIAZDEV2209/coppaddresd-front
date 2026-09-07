import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { QuickAction } from "../types";

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Accesos directos estilo Antares: tiles con icono en círculo teal,
 * hover con desplazamiento sutil y flecha que aparece al focus/hover.
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group flex h-12 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 transition-all duration-200 hover:border-brand-teal/30 hover:bg-brand-teal/[0.06] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand-teal/40 focus-visible:outline-none"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 transition-colors duration-200 group-hover:bg-brand-teal">
              <Icon className="size-[17px] text-brand-teal transition-colors duration-200 group-hover:text-white" />
            </span>
            <span className="flex-1 text-[13px] font-medium text-foreground">
              {action.label}
            </span>
            <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-brand-teal" />
          </Link>
        );
      })}
    </div>
  );
}
