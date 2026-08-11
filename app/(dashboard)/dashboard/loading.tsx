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

      <section className="flex flex-col gap-4 xl:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <Skeleton className="mb-6 h-10 w-40" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </div>
        <div className="flex w-[300px] shrink-0 flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-border bg-card p-5"
          >
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ))}
      </section>
    </div>
  );
}
