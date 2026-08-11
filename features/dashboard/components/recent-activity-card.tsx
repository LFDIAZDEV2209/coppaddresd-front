import Link from "next/link";
import type { ActivityEvent } from "../types";

interface RecentActivityCardProps {
  data: ActivityEvent[];
}

export function RecentActivityCard({ data }: RecentActivityCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-foreground">
        Actividad reciente
      </h3>

      <div className="flex flex-col">
        {data.map((event, i) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 py-3 ${i < data.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info-soft text-[11px] font-bold text-info-foreground">
              {event.initials}
            </div>
            <div className="flex flex-1 flex-col gap-px overflow-hidden">
              <span className="text-[13px] font-medium text-foreground truncate">
                {event.user}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {event.action}
              </span>
            </div>
            <span className="shrink-0 text-[10.5px] text-muted-foreground">
              {event.time}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/settings/audit"
        className="mt-3 text-center text-[12px] font-medium text-primary hover:text-primary-strong transition-colors"
      >
        Ver toda la actividad →
      </Link>
    </div>
  );
}
