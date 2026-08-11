import Link from "next/link";
import type { ActivityEvent } from "../types";

interface RecentActivityCardProps {
  data: ActivityEvent[];
}

export function RecentActivityCard({ data }: RecentActivityCardProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        {data.map((event, i) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 py-2.5 ${i < data.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-[10px] font-bold text-info-foreground">
              {event.initials}
            </div>
            <div className="flex flex-1 flex-col gap-px overflow-hidden min-w-0">
              <span className="text-[12.5px] font-medium text-foreground truncate">
                {event.user}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {event.action}
              </span>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {event.time}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/settings/audit"
        className="mt-2 text-center text-[12px] font-medium text-primary hover:text-primary-strong transition-colors"
      >
        Ver toda la actividad →
      </Link>
    </div>
  );
}
