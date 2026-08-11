import Link from "next/link";
import type { QuickAction } from "../types";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex w-[300px] shrink-0 flex-col gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-muted hover:border-border-strong transition-all"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
              <Icon className="size-4 text-primary" />
            </div>
            <span>{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
