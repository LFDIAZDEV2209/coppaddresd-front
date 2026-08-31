import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { LayoutDashboard } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Resumen"
        description="Cargando..."
        icon={LayoutDashboard}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="rounded-none bg-[var(--sidebar)] px-5 py-4">
            <Skeleton className="h-5 w-32 bg-white/20" />
            <Skeleton className="mt-1 h-3 w-40 bg-white/10" />
          </div>
          <div className="p-5">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card xl:w-[300px]">
          <div className="rounded-none bg-[var(--sidebar)] px-5 py-4">
            <Skeleton className="h-5 w-28 bg-white/20" />
          </div>
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="rounded-none bg-[var(--sidebar)] px-5 py-4">
              <Skeleton className="h-5 w-28 bg-white/20" />
            </div>
            <div className="p-5">
              <Skeleton className="h-[100px] w-full rounded-lg" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
