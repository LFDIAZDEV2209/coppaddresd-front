"use client";

import { useT } from "@/providers/i18n-provider";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { QuickAction } from "../types";

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  const t = useT();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="group flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-brand-blue-soft hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon
              aria-hidden="true"
              className="size-3.5 text-primary-soft-foreground"
            />
            <span>{t(action.label)}</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-3 text-muted-foreground"
            />
          </Link>
        );
      })}
    </div>
  );
}
