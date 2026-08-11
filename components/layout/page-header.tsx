import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl bg-[#0B2B4A] px-6 py-5",
        className
      )}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#123B63]">
        <Icon className="size-6 text-white" />
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <h1 className="text-xl font-bold text-white tracking-tight">
          {title}
        </h1>
        <p className="text-[13px] text-white/70">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
