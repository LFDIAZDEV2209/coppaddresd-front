import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

/**
 * Accesos rápidos a los módulos de Telemedicina (adaptados al rol: la vista
 * admin lleva a los listados globales; la del profesional a su agenda).
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary-soft">
              <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[13px] font-medium text-foreground">{action.label}</span>
              {action.description && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {action.description}
                </span>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}