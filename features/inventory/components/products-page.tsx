"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Barcode,
  Box,
  CalendarDays,
  CircleDollarSign,
  Eye,
  Factory,
  FileWarning,
  FlaskConical,
  Hash,
  MapPin,
  MoreHorizontal,
  Package,
  PackagePlus,
  Pencil,
  Pill,
  Plus,
  Ruler,
  Scale,
  Search,
  Tags,
  Truck,
  Warehouse,
  XCircle,
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
  DropdownMenuSeparator,
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
import {
  getCategories,
  getProductState,
  fetchProducts,
  createProduct,
  updateProduct,
} from "../services/inventory-service";
import type {
  InventoryFilters,
  ProductInput,
  ProductListItem,
} from "../types";

const blankProduct: ProductInput = {
  sku: "",
  name: "",
  productType: "Medicamento",
  category: "",
  activeIngredient: "",
  presentation: "Tabletas",
  concentration: "",
  unit: "",
  manufacturer: "",
  supplier: "",
  lot: "",
  expirationDate: "",
  minimumStock: 10,
  maximumStock: 100,
  location: "",
  status: "Activo",
  unitCost: 0,
  notes: "",
};

function toProductInput(product: ProductListItem): ProductInput {
  return {
    sku: product.sku,
    name: product.name,
    productType: product.productType,
    category: product.category,
    activeIngredient: product.activeIngredient ?? "",
    presentation: product.presentation,
    concentration: product.concentration ?? "",
    unit: product.unit,
    manufacturer: product.manufacturer ?? "",
    supplier: product.supplier ?? "",
    lot: product.lot ?? "",
    expirationDate: product.expirationDate ?? "",
    minimumStock: product.minimumStock,
    maximumStock: product.maximumStock,
    location: product.location ?? "",
    status: product.status,
    unitCost: product.unitCost,
    notes: product.notes ?? "",
  };
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    category: "",
    status: "all",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem>();
  const [details, setDetails] = useState<ProductListItem>();
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchProducts(filters)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("No fue posible cargar el catálogo de productos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, reload]);
  const updateFilters = (partial: Partial<InventoryFilters>) => {
    setFilters((current) => ({ ...current, ...partial }));
    setLoading(true);
    setError(null);
  };
  const submit = async (input: ProductInput) => {
    setSaving(true);
    try {
      if (editing) await updateProduct(editing.id, input);
      else await createProduct(input);
      setFormOpen(false);
      setLoading(true);
      setReload((value) => value + 1);
    } finally {
      setSaving(false);
    }
  };
  const alerts = products.filter((product) =>
    ["Stock bajo", "Sin stock", "Próximo a vencer", "Vencido"].includes(
      getProductState(product),
    ),
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Productos"
        description="Catálogo y control de existencias del inventario"
        icon={Package}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Nuevo producto
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Productos activos"
          value="8"
          icon={Package}
          tone="primary"
        />
        <Metric
          label="Stock bajo"
          value="3"
          icon={AlertTriangle}
          tone="warning"
        />
        <Metric label="Sin stock" value="1" icon={XCircle} tone="danger" />
        <Metric label="Por vencer" value="3" icon={FileWarning} tone="info" />
      </div>
      {alerts.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-warning-foreground" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-foreground">
              {alerts.length} alertas requieren atención
            </p>
            <p className="text-xs text-warning-foreground/80">
              Revisa productos con stock bajo, sin existencias o próximos a
              vencer.
            </p>
          </div>
          <Link
            href="/inventory/reports"
            className="text-xs font-bold text-warning-foreground underline underline-offset-2"
          >
            Ver alertas
          </Link>
        </div>
      )}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Catálogo de productos</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Gestiona medicamentos, insumos y futuras categorías.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/entries">
              <Button variant="outline" size="sm">
                <ArrowDownToLine data-icon="inline-start" />
                Registrar entrada
              </Button>
            </Link>
            <Link href="/inventory/exits">
              <Button variant="outline" size="sm">
                <ArrowUpFromLine data-icon="inline-start" />
                Registrar salida
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) =>
                updateFilters({ search: event.target.value })
              }
              placeholder="Buscar por nombre, SKU o principio activo"
              aria-label="Buscar productos"
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.category}
            onChange={(event) =>
              updateFilters({ category: event.target.value })
            }
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.status}
            onChange={(event) =>
              updateFilters({
                status: event.target.value as InventoryFilters["status"],
              })
            }
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            <option>Disponible</option>
            <option>Stock bajo</option>
            <option>Sin stock</option>
            <option>Próximo a vencer</option>
            <option>Vencido</option>
            <option>Inactivo</option>
          </select>
        </div>
      </section>
      {loading ? (
        <ProductSkeleton />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
        />
      ) : products.length ? (
        <ProductTable
          products={products}
          onDetails={setDetails}
          onEdit={(product) => {
            setEditing(product);
            setFormOpen(true);
          }}
        />
      ) : (
        <EmptyState />
      )}
      <ProductFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        product={editing}
        saving={saving}
        onOpenChange={setFormOpen}
        onSubmit={submit}
      />
      <ProductDetails product={details} onClose={() => setDetails(undefined)} />
    </div>
  );
}

function ProductTable({
  products,
  onDetails,
  onEdit,
}: {
  products: ProductListItem[];
  onDetails: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${products.length} productos`}
        description="Existencias y alertas por producto"
        icon={Package}
        variant="primary"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="hidden lg:table-cell">Categoría</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const state = getProductState(product);
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <button
                    className="flex items-center gap-3 text-left"
                    onClick={() => onDetails(product)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Package className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {product.name} {product.concentration}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {product.presentation} · {product.unit}
                      </span>
                    </span>
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {product.category}
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${state === "Sin stock" || state === "Stock bajo" ? "text-warning-foreground" : "text-foreground"}`}
                  >
                    {product.stock}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    mín. {product.minimumStock}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{product.expirationDate}</span>
                  {state === "Próximo a vencer" || state === "Vencido" ? (
                    <span className="block text-[11px] text-destructive">
                      {state}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusBadge status={state} color={stateColor(state)} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Acciones de ${product.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDetails(product)}>
                        <Eye />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        <Pencil />
                        Editar producto
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        render={<Link href="/inventory/entries" />}
                      >
                        <ArrowDownToLine />
                        Registrar entrada
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link href="/inventory/exits" />}
                      >
                        <ArrowUpFromLine />
                        Registrar salida
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductFormDialog({
  open,
  product,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  product?: ProductListItem;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductInput>(() =>
    product ? toProductInput(product) : blankProduct,
  );
  const [error, setError] = useState<string | null>(null);
  const update = <K extends keyof ProductInput>(
    field: K,
    value: ProductInput[K],
  ) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      !form.category.trim() ||
      !form.expirationDate
    ) {
      setError("Completa nombre, SKU, categoría y vencimiento.");
      return;
    }
    setError(null);
    await onSubmit(form);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            El producto queda preparado para medicamentos y futuras categorías.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="col-span-full mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Tags className="size-4 text-primary" />
              Identificación
            </legend>
            <Field label="Tipo de producto">
              <IconSelect
                icon={Pill}
                value={form.productType}
                onChange={(event) =>
                  update(
                    "productType",
                    event.target.value as ProductInput["productType"],
                  )
                }
              >
                <option>Medicamento</option>
                <option>Insumo médico</option>
                <option>Material hospitalario</option>
                <option>Producto de farmacia</option>
                <option>Alimento saludable</option>
                <option>Snack saludable</option>
                <option>Bebida</option>
                <option>Suplemento</option>
                <option>Dispositivo de salud</option>
                <option>Equipamiento fitness</option>
                <option>Cuidado personal</option>
                <option>Otro</option>
              </IconSelect>
            </Field>
            <Field label="Nombre" required>
              <IconInput
                icon={Package}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ej. Paracetamol"
              />
            </Field>
            <Field label="SKU / código" required>
              <IconInput
                icon={Barcode}
                value={form.sku}
                onChange={(event) => update("sku", event.target.value)}
                placeholder="MED-PAR-500"
              />
            </Field>
            <Field label="Categoría" required>
              <IconInput
                icon={Tags}
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="Analgésicos"
              />
            </Field>
            <Field label="Principio activo">
              <IconInput
                icon={FlaskConical}
                value={form.activeIngredient}
                onChange={(event) =>
                  update("activeIngredient", event.target.value)
                }
                placeholder="Acetaminofén"
              />
            </Field>
            <Field label="Concentración">
              <IconInput
                icon={Scale}
                value={form.concentration}
                onChange={(event) =>
                  update("concentration", event.target.value)
                }
                placeholder="500 mg"
              />
            </Field>
            <Field label="Presentación">
              <IconInput
                icon={Box}
                value={form.presentation}
                onChange={(event) => update("presentation", event.target.value)}
                placeholder="Tabletas"
              />
            </Field>
            <Field label="Unidad de medida">
              <IconInput
                icon={Ruler}
                value={form.unit}
                onChange={(event) => update("unit", event.target.value)}
                placeholder="Caja x 20"
              />
            </Field>
            <Field label="Laboratorio">
              <IconInput
                icon={Factory}
                value={form.manufacturer}
                onChange={(event) => update("manufacturer", event.target.value)}
                placeholder="Genfar"
              />
            </Field>
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="col-span-full mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Warehouse className="size-4 text-primary" />
              Control de inventario
            </legend>
            <Field label="Proveedor">
              <IconInput
                icon={Truck}
                value={form.supplier}
                onChange={(event) => update("supplier", event.target.value)}
                placeholder="Drogas La Rebaja"
              />
            </Field>
            <Field label="Lote">
              <IconInput
                icon={Hash}
                value={form.lot}
                onChange={(event) => update("lot", event.target.value)}
                placeholder="PCT2404A"
              />
            </Field>
            <Field label="Vencimiento" required>
              <IconInput
                icon={CalendarDays}
                type="date"
                value={form.expirationDate}
                onChange={(event) =>
                  update("expirationDate", event.target.value)
                }
              />
            </Field>
            <Field label="Ubicación">
              <IconInput
                icon={MapPin}
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="Estante A-01"
              />
            </Field>
            <Field label="Stock inicial">
              <IconInput
                icon={PackagePlus}
                type="number"
                min="0"
                value={form.stock ?? 0}
                onChange={(event) =>
                  update("stock", Number(event.target.value))
                }
                placeholder="0"
              />
            </Field>
            <Field label="Stock mínimo">
              <IconInput
                icon={Warehouse}
                type="number"
                min="0"
                value={form.minimumStock}
                onChange={(event) =>
                  update("minimumStock", Number(event.target.value))
                }
                placeholder="10"
              />
            </Field>
            <Field label="Stock máximo">
              <IconInput
                icon={Warehouse}
                type="number"
                min="0"
                value={form.maximumStock}
                onChange={(event) =>
                  update("maximumStock", Number(event.target.value))
                }
                placeholder="100"
              />
            </Field>
            <Field label="Costo unitario">
              <IconInput
                icon={CircleDollarSign}
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(event) =>
                  update("unitCost", Number(event.target.value))
                }
                placeholder="0.00"
              />
            </Field>
          </fieldset>
          <Field label="Observaciones" icon={FileWarning}>
            <textarea
              className="min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Notas opcionales del producto"
            />
          </Field>
          {error && (
            <p
              className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Guardando..."
                : product
                  ? "Guardar cambios"
                  : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductDetails({
  product,
  onClose,
}: {
  product?: ProductListItem;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del producto</DialogTitle>
          <DialogDescription>
            Ficha y trazabilidad del artículo.
          </DialogDescription>
        </DialogHeader>
        {product && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-xl bg-primary-soft p-4">
              <Package className="size-6 text-primary" />
              <div>
                <p className="font-semibold">
                  {product.name} {product.concentration}
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.sku} · {product.productType}
                </p>
              </div>
              <StatusBadge
                status={getProductState(product)}
                color={stateColor(getProductState(product))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail
                label="Stock actual"
                value={`${product.stock} ${product.unit}`}
              />
              <Detail
                label="Rango objetivo"
                value={`${product.minimumStock} - ${product.maximumStock}`}
              />
              <Detail label="Lote" value={product.lot ?? "—"} />
              <Detail label="Vencimiento" value={product.expirationDate ?? "—"} />
              <Detail label="Proveedor" value={product.supplier ?? "—"} />
              <Detail label="Ubicación" value={product.location ?? "—"} />
              <Detail label="Laboratorio" value={product.manufacturer ?? "—"} />
              <Detail
                label="Costo unitario"
                value={formatCurrency(product.unitCost)}
              />
            </div>
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Observaciones
              </p>
              {product.notes || "Sin observaciones."}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="truncate">{label}</span>
        {required && <span className="ml-auto text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function IconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon?: typeof Package }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input className={`${Icon ? "pl-9" : ""} ${className ?? ""}`} {...props} />
    </div>
  );
}

function IconSelect({
  icon: Icon,
  className,
  children,
  ...props
}: React.ComponentProps<"select"> & { icon?: typeof Package }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <select
        className={`h-9 w-full appearance-none rounded-md border border-input bg-background pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${Icon ? "pl-9" : "px-3"} ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Package;
  tone: "primary" | "warning" | "danger" | "info";
}) {
  const colors = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning-foreground",
    danger: "bg-destructive-soft text-destructive",
    info: "bg-info-soft text-info-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function ProductSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
          key={item}
        >
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <Package className="size-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold">No hay productos para mostrar</h3>
      <p className="text-xs text-muted-foreground">
        Ajusta los filtros o crea el primer producto.
      </p>
    </div>
  );
}
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/30 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar el catálogo
      </p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
function stateColor(state: InventoryFilters["status"]) {
  const colors = {
    Disponible: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    "Stock bajo": {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    "Sin stock": {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
    "Próximo a vencer": {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    Vencido: {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
    Inactivo: {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    },
    all: {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    },
  };
  return colors[state];
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
