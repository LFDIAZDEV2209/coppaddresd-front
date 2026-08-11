import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-[10px]" />
        <div className="flex-1" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}
