import Link from "next/link";
import type { QuickAction } from "../types";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-[13px] font-medium text-foreground hover:bg-muted hover:border-border-strong transition-all"
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
