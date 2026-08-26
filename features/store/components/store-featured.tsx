"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Star, StarOff, Store } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchStoreItems, updateStoreItem } from "../services/store-service";
import type { StoreItemListItem } from "../types";
import { useT } from "@/providers/i18n-provider";

export function StoreFeaturedPage() {
  const [items, setItems] = useState<StoreItemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchStoreItems({ status: "Visible" }, 1, 200);
        if (!cancelled) setItems(data.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const toggle = async (item: StoreItemListItem) => {
    setUpdatingId(item.id);
    try {
      await updateStoreItem(item.id, {
        salePrice: item.salePrice,
        featured: !item.featured,
      });
      setReload((v) => v + 1);
    } finally {
      setUpdatingId(null);
    }
  };

  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);
  const featuredCount = featured.length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('Productos destacados')}
        description={t('Selecciona qué productos resaltar en la tienda del paciente')}
        icon={Star}
        actions={
          <Button variant="outline" size="sm" onClick={() => setReload((v) => v + 1)} disabled={loading}>
            <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
            {t('Actualizar')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label={t('Productos visibles')} value={String(items.length)} tone="primary" />
        <Summary label={t('Destacados')} value={String(featuredCount)} tone="warning" />
        <Summary label={t('Sin destacar')} value={String(rest.length)} tone="info" />
      </div>

      {loading ? (
        <FeaturedSkeleton />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${items.length} ${t('productos visibles')}`}
            description={t('Activa o desactiva el estado destacado')}
            icon={Star}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Producto')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Tipo')}</TableHead>
                <TableHead>{t('Precio')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Stock')}</TableHead>
                <TableHead>{t('Destacado')}</TableHead>
                <TableHead className="w-32">{t('Acción')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...featured, ...rest].map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Store className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {item.productName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.productSku}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {item.productType}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(item.salePrice)}
                  </TableCell>
                  <TableCell
                    className={`hidden text-sm font-semibold md:table-cell ${
                      item.stock <= 0 ? "text-destructive" : ""
                    }`}
                  >
                    {item.stock}
                  </TableCell>
                  <TableCell>
                    {item.featured ? (
                      <StatusBadge
                        status={t('Destacado')}
                        color={{
                          bg: "var(--warning-soft)",
                          text: "var(--warning-foreground)",
                          dot: "var(--warning)",
                        }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={item.featured ? "outline" : "default"}
                      size="sm"
                      onClick={() => void toggle(item)}
                      disabled={updatingId === item.id}
                    >
                      {item.featured ? (
                        <>
                          <StarOff data-icon="inline-start" className="text-warning-foreground" />
                          {t('Quitar')}
                        </>
                      ) : (
                        <>
                          <Star data-icon="inline-start" className="fill-current" />
                          {t('Destacar')}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning" | "info";
}) {
  const colors = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning-foreground",
    info: "bg-info-soft text-info-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Star className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-4 last:border-0">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
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
