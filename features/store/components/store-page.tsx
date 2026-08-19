"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Pencil,
  MoreHorizontal,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductListItem } from "@/features/inventory/types";
import type { CreateStoreItemInput, StoreItemListItem, UpdateStoreItemInput } from "../types";
import { useStore, fetchAvailableProducts } from "../hooks/use-store";

export function StorePage() {
  const {
    result,
    stats,
    loading,
    error,
    filters,
    setFilters,
    retry,
    addItem,
    editItem,
    hideItem,
    restoreItem,
  } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StoreItemListItem | undefined>();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Tienda de bienestar"
        description="Administra los productos que se muestran en el marketplace del paciente"
        icon={Store}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Agregar producto
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Productos en tienda" value={stats ? String(stats.total) : "—"} tone="primary" />
        <Metric label="Destacados" value={stats ? String(stats.featured) : "—"} tone="warning" />
        <Metric label="Visibles" value={stats ? String(stats.visible) : "—"} tone="success" />
        <Metric label="Ocultos" value={stats ? String(stats.hidden) : "—"} tone="danger" />
      </div>
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Catálogo de tienda</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Productos visibles para el paciente en la app móvil.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={retry} disabled={loading}>
            <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
            Actualizar
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nombre o SKU..." />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value as typeof filters.status })}
            aria-label="Filtrar por visibilidad"
          >
            <option value="all">Todos</option>
            <option value="Visible">Visibles</option>
            <option value="Oculto">Ocultos</option>
          </select>
        </div>
      </section>
      {loading ? (
        <StoreSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/30 py-14 text-center">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>Reintentar</Button>
        </div>
      ) : result?.data.length ? (
        <StoreTable items={result.data} onEdit={setEditing} onHide={hideItem} onRestore={restoreItem} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <ShoppingBag className="size-8 text-muted-foreground" />
          <p className="text-sm font-semibold">No hay productos en la tienda</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>Agregar primer producto</Button>
        </div>
      )}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {result.page} de {result.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={result.page === 1}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={result.page === result.totalPages}>Siguiente</Button>
          </div>
        </div>
      )}
      <AddToStoreDialog open={addOpen} onOpenChange={setAddOpen} onAdd={addItem} />
      {editing && (
        <EditStoreDialog item={editing} onOpenChange={() => setEditing(undefined)} onSave={(input) => editItem(editing.id, input)} />
      )}
    </div>
  );
}

function StoreTable({
  items,
  onEdit,
  onHide,
  onRestore,
}: {
  items: StoreItemListItem[];
  onEdit: (item: StoreItemListItem) => void;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader title={`${items.length} productos`} description="Estado de la tienda" icon={ShoppingBag} variant="primary" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="hidden lg:table-cell">Tipo</TableHead>
            <TableHead>Precio venta</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10"><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <ShoppingBag className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.productName}</span>
                    <span className="text-xs text-muted-foreground">{item.productSku}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">{item.productType}</TableCell>
              <TableCell className="text-sm font-medium">{formatCurrency(item.salePrice)}</TableCell>
              <TableCell className={`text-sm font-semibold ${item.stock <= 0 ? "text-destructive" : ""}`}>{item.stock}</TableCell>
              <TableCell>
                <StatusBadge
                  status={item.status === "Visible" ? "Activo" : "Inactivo"}
                  color={item.status === "Visible"
                    ? { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }
                    : { bg: "var(--muted)", text: "var(--muted-foreground)", dot: "var(--muted-foreground)" }}
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${item.productName}`} />}>
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Pencil /> Editar precio
                    </DropdownMenuItem>
                    {item.status === "Visible" ? (
                      <DropdownMenuItem onClick={() => onHide(item.id)} className="text-destructive">
                        <EyeOff /> Ocultar
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onRestore(item.id)}>
                        <Eye /> Restaurar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AddToStoreDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: CreateStoreItemInput) => Promise<void>;
}) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [desc, setDesc] = useState("");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchAvailableProducts().then(setProducts);
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || price <= 0) return;
    setSaving(true);
    try {
      await onAdd({ productId: selected, salePrice: price, description: desc || undefined, featured });
      onOpenChange(false);
      setSelected("");
      setPrice(0);
      setDesc("");
      setFeatured(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar producto a la tienda</DialogTitle>
          <DialogDescription>Selecciona un producto del inventario y establece su precio de venta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Producto del inventario *</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Seleccionar producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label className="text-xs">Precio de venta *</Label>
              <Input type="number" min="0" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Destacado</Label>
              <button type="button" onClick={() => setFeatured(!featured)}
                className={`flex size-9 items-center justify-center rounded-md border ${featured ? "border-warning bg-warning-soft text-warning-foreground" : "border-input bg-background text-muted-foreground"}`}>
                <Star className="size-4" fill={featured ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción para el paciente…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !selected || price <= 0}>{saving ? "Agregando…" : "Agregar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStoreDialog({
  item,
  onOpenChange,
  onSave,
}: {
  item: StoreItemListItem;
  onOpenChange: () => void;
  onSave: (input: UpdateStoreItemInput) => Promise<void>;
}) {
  const [price, setPrice] = useState(item.salePrice);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ salePrice: price, featured: item.featured });
      onOpenChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar precio</DialogTitle>
          <DialogDescription>{item.productName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Precio de venta</Label>
            <Input type="number" min="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onOpenChange}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "primary" | "warning" | "success" | "danger" }) {
  const colors = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning-foreground",
    success: "bg-success-soft text-success-foreground",
    danger: "bg-destructive-soft text-destructive",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}>
          <Store className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-4 last:border-0">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-28" /></div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}
