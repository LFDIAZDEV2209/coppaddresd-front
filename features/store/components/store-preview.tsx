"use client";

import { useEffect, useState } from "react";
import { Eye, RefreshCw, ShoppingBag, Sparkles, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStoreItems, fetchStoreStats } from "../services/store-service";
import type { StoreItemListItem, StoreStats } from "../types";

export function StorePreviewPage() {
  const [items, setItems] = useState<StoreItemListItem[]>([]);
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [data, storeStats] = await Promise.all([
          fetchStoreItems({ status: "Visible" }, 1, 200),
          fetchStoreStats(),
        ]);
        if (!cancelled) {
          setItems(data.data);
          setStats(storeStats);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Previsualización del paciente"
        description="Así verán los productos los pacientes en la app móvil ANTARES"
        icon={Eye}
        actions={
          <Button variant="outline" size="sm" onClick={() => setReload((v) => v + 1)} disabled={loading}>
            <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
            Actualizar
          </Button>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info-foreground">
            <ShoppingBag className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Vista previa de la tienda</p>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.visible} productos visibles` : "..."} · vista
              de catálogo móvil
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <PreviewSkeleton />
      ) : (
        <>
          {featured.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Star className="size-4 fill-warning text-warning" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Destacados
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {featured.map((item) => (
                  <PreviewCard key={item.id} item={item} featured />
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Catálogo
              </h2>
            </div>
            {rest.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rest.map((item) => (
                  <PreviewCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                <ShoppingBag className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">No hay productos visibles</p>
                <p className="text-xs text-muted-foreground">
                  Publica productos desde la gestión de tienda.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function PreviewCard({ item, featured }: { item: StoreItemListItem; featured?: boolean }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary-soft to-info-soft">
        <ShoppingBag className="size-10 text-primary" />
        {featured && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
            <Sparkles className="size-3" />
            Destacado
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {item.productType}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="truncate text-sm font-semibold">{item.productName}</h3>
        <p className="text-xs text-muted-foreground">{item.productSku}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-xs text-muted-foreground">Precio</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(item.salePrice)}
            </p>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              item.stock > 0
                ? "bg-primary-soft text-primary"
                : "bg-destructive-soft text-destructive"
            }`}
          >
            {item.stock > 0 ? `${item.stock} en stock` : "Agotado"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card">
          <Skeleton className="h-32 rounded-t-2xl" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
