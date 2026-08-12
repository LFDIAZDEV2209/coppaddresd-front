"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createEntry,
  createExit,
  fetchProducts,
} from "../services/inventory-service";
import type {
  InventoryEntry,
  InventoryExit,
  InventoryLine,
  Product,
} from "../types";

type TransactionMode = "entry" | "exit";
const entryReasons = [
  "Compra",
  "Recepción de proveedor",
  "Devolución de cliente",
  "Donación",
  "Ajuste positivo",
];
const exitReasons = [
  "Dispensación",
  "Venta",
  "Consumo interno",
  "Devolución a proveedor",
  "Producto vencido",
  "Producto dañado",
  "Ajuste de inventario",
  "Otro",
];

export function TransactionPage({ mode }: { mode: TransactionMode }) {
  const isEntry = mode === "entry";
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [date, setDate] = useState("2024-06-18");
  const [reason, setReason] = useState(
    isEntry ? entryReasons[0] : exitReasons[0],
  );
  const [supplier, setSupplier] = useState("");
  const [document, setDocument] = useState("");
  const [patientName, setPatientName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchProducts({ search: "", category: "", status: "all" })
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          if (!lines.length && data[0]) setLines([makeLine(data[0], isEntry)]);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError("No pudimos cargar los productos disponibles.");
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEntry, lines.length]);
  const updateLine = <K extends keyof InventoryLine>(
    id: string,
    field: K,
    value: InventoryLine[K],
  ) =>
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [field]: value } : line,
      ),
    );
  const selectProduct = (id: string, lineId: string) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? makeLine(product, isEntry, line.id) : line,
      ),
    );
  };
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitCost,
    0,
  );
  const invalidStock =
    !isEntry &&
    lines.some((line) => {
      const product = products.find((item) => item.id === line.productId);
      return product ? line.quantity > product.stock : true;
    });
  const submit = async () => {
    if (
      !lines.length ||
      lines.some((line) => !line.productId || line.quantity < 1 || !line.lot)
    ) {
      setError("Agrega al menos un producto con cantidad y lote válido.");
      return;
    }
    if (!isEntry && invalidStock) {
      setError("No hay stock suficiente para realizar esta operación.");
      return;
    }
    if (
      !window.confirm(
        isEntry
          ? "¿Confirmar esta entrada de inventario?"
          : "¿Confirmar esta salida de inventario?",
      )
    )
      return;
    setSaving(true);
    setError(null);
    try {
      if (isEntry) {
        const entry: Omit<InventoryEntry, "id" | "reference" | "totalCost"> = {
          date,
          reason: reason as InventoryEntry["reason"],
          supplier,
          document,
          responsible: "Carlos Ruiz",
          notes,
          lines,
        };
        const created = await createEntry(entry);
        setSuccess(`Entrada ${created.reference} registrada correctamente.`);
      } else {
        const exit: Omit<InventoryExit, "id" | "reference"> = {
          date,
          reason: reason as InventoryExit["reason"],
          responsible: "Carlos Ruiz",
          patientName: patientName || undefined,
          notes,
          lines,
        };
        const created = await createExit(exit);
        setSuccess(`Salida ${created.reference} registrada correctamente.`);
      }
      setLines([]);
      setSupplier("");
      setDocument("");
      setPatientName("");
      setNotes("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar la operación.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={isEntry ? "Entradas" : "Salidas"}
        description={
          isEntry
            ? "Registra compras y recepciones que incrementan el stock"
            : "Registra dispensaciones y operaciones que disminuyen el stock"
        }
        icon={isEntry ? ArrowDownToLine : ArrowUpFromLine}
      />
      <div
        className={`rounded-2xl border p-4 ${isEntry ? "border-success/30 bg-success-soft" : "border-warning/30 bg-warning-soft"}`}
      >
        <div className="flex items-start gap-3">
          <Warehouse
            className={`mt-0.5 size-5 ${isEntry ? "text-success-foreground" : "text-warning-foreground"}`}
          />
          <div>
            <p
              className={`text-sm font-semibold ${isEntry ? "text-success-foreground" : "text-warning-foreground"}`}
            >
              {isEntry
                ? "Incremento de inventario"
                : "Disminución de inventario"}
            </p>
            <p
              className={`mt-1 text-xs ${isEntry ? "text-success-foreground/80" : "text-warning-foreground/80"}`}
            >
              {isEntry
                ? "Los productos recibidos quedarán disponibles después de confirmar la operación."
                : "La cantidad solicitada se valida contra el stock disponible antes de confirmar."}
            </p>
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Tipo de operación">
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {(isEntry ? entryReasons : exitReasons).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          {isEntry ? (
            <Field label="Proveedor">
              <Input
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="Ej. Drogas La Rebaja"
              />
            </Field>
          ) : (
            <Field label="Paciente (opcional)">
              <Input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Si es dispensación"
              />
            </Field>
          )}
          <Field label="Documento de referencia">
            <Input
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              placeholder="Factura, receta o remisión"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <div>
            <h2 className="text-base font-bold">Productos de la operación</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Puedes agregar múltiples productos y controlar lote y vencimiento.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              products[0] &&
              setLines((current) => [
                ...current,
                makeLine(products[0], isEntry),
              ])
            }
            disabled={loadingProducts}
          >
            <Plus data-icon="inline-start" />
            Agregar producto
          </Button>
        </div>
        {loadingProducts ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map((item) => (
              <Skeleton className="h-24 rounded-xl" key={item} />
            ))}
          </div>
        ) : lines.length ? (
          <div className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <TransactionLine
                key={line.id}
                line={line}
                index={index}
                products={products}
                isEntry={isEntry}
                onProductChange={(productId) =>
                  selectProduct(productId, line.id)
                }
                onChange={updateLine}
                onRemove={() =>
                  setLines((current) =>
                    current.filter((item) => item.id !== line.id),
                  )
                }
                invalid={
                  invalidStock &&
                  !isEntry &&
                  line.quantity >
                    (products.find((item) => item.id === line.productId)
                      ?.stock ?? 0)
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
            Agrega un producto para comenzar.
          </div>
        )}
        <Field label="Observaciones">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Notas de la operación"
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
        {success && (
          <p
            className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-foreground"
            role="status"
          >
            <CheckCircle2 className="size-4" />
            {success}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <span className="text-xs text-muted-foreground">
              Valor total estimado
            </span>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/movements">
              <Button variant="outline">Ver movimientos</Button>
            </Link>
            <Button
              onClick={() => void submit()}
              disabled={
                saving || loadingProducts || invalidStock || !lines.length
              }
            >
              {saving
                ? "Confirmando..."
                : isEntry
                  ? "Confirmar entrada"
                  : "Confirmar salida"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function TransactionLine({
  line,
  index,
  products,
  isEntry,
  onProductChange,
  onChange,
  onRemove,
  invalid,
}: {
  line: InventoryLine;
  index: number;
  products: Product[];
  isEntry: boolean;
  onProductChange: (id: string) => void;
  onChange: <K extends keyof InventoryLine>(
    id: string,
    field: K,
    value: InventoryLine[K],
  ) => void;
  onRemove: () => void;
  invalid: boolean;
}) {
  const product = products.find((item) => item.id === line.productId);
  return (
    <div
      className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6 ${invalid ? "border-destructive bg-destructive-soft/30" : "border-border bg-muted/20"}`}
    >
      <div className="flex flex-col gap-1.5 lg:col-span-2">
        <Label className="text-xs">Producto {index + 1}</Label>
        <select
          value={line.productId}
          onChange={(event) => onProductChange(event.target.value)}
        >
          <option value="">Selecciona producto</option>
          {products.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name} {item.concentration} · {item.sku}
            </option>
          ))}
        </select>
        {!isEntry && product && (
          <span className="text-[11px] text-muted-foreground">
            Stock disponible: <strong>{product.stock}</strong>
          </span>
        )}
      </div>
      <Field label="Cantidad">
        <Input
          type="number"
          min="1"
          value={line.quantity}
          onChange={(event) =>
            onChange(line.id, "quantity", Number(event.target.value))
          }
          aria-invalid={invalid}
        />
      </Field>
      <Field label="Lote">
        <Input
          value={line.lot}
          onChange={(event) => onChange(line.id, "lot", event.target.value)}
          placeholder={product?.lot ?? "Lote"}
        />
      </Field>
      <Field label="Vencimiento">
        <Input
          type="date"
          value={line.expirationDate}
          onChange={(event) =>
            onChange(line.id, "expirationDate", event.target.value)
          }
        />
      </Field>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="font-semibold">
            {formatCurrency(line.quantity * line.unitCost)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive"
          onClick={onRemove}
          aria-label={`Eliminar producto ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
      {invalid && (
        <p className="col-span-full text-xs font-semibold text-destructive">
          No hay stock suficiente para esta cantidad.
        </p>
      )}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function makeLine(
  product: Product,
  isEntry: boolean,
  id = `line-${Date.now()}-${Math.random()}`,
): InventoryLine {
  return {
    id,
    productId: product.id,
    productName: `${product.name} ${product.concentration}`.trim(),
    quantity: 1,
    lot: isEntry ? "" : product.lot,
    expirationDate: product.expirationDate,
    unitCost: product.unitCost,
  };
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
