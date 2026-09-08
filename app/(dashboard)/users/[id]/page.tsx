import { Suspense } from "react";
import { UserDetail } from "@/features/users/components/user-detail";

/**
 * Vista de detalle del usuario. Next 16: params es una Promise. El detalle
 * usa useSearchParams (notice ?updated=assignments) → boundary de Suspense.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6">
          <div className="h-28 w-full animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      }
    >
      <UserDetail userId={id} />
    </Suspense>
  );
}
