"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
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
import { useT } from "@/providers/i18n-provider";
import {
  createEntry,
  createExit,
  fetchEntries,
  fetchExits,
  fetchProducts,
} from "../services/inventory-service";
import type {
  InventoryEntry,
  InventoryExit,
  InventoryLine,
  ProductListItem,
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
  const t = useT();
  const isEntry = mode === "entry";
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [date, setDate] = useState(() => todayString());
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<InventoryEntry[] | InventoryExit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (isEntry ? fetchEntries() : fetchExits())
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEntry, reload]);

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
          setError(t("No pudimos cargar los productos disponibles."));
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEntry, lines.length, t]);
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
  const submit = () => {
    if (
      !lines.length ||
      lines.some((line) => !line.productId || line.quantity < 1 || !line.lot)
    ) {
      setError(t("Agrega al menos un producto con cantidad y lote válido."));
      return;
    }
    if (!isEntry && invalidStock) {
      setError(t("No hay stock suficiente para realizar esta operación."));
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };
  const performSubmit = async () => {
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
        setSuccess(t("Entrada {reference} registrada correctamente.", { reference: created.reference }));
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
        setSuccess(t("Salida {reference} registrada correctamente.", { reference: created.reference }));
      }
      setLines([]);
      setSupplier("");
      setDocument("");
      setPatientName("");
      setNotes("");
      setReload((v) => v + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : t("No se pudo completar la operación."),
      );
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={isEntry ? t("Entradas") : t("Salidas")}
        description={
          isEntry
            ? t("Registra compras y recepciones que incrementan el stock")
            : t("Registra dispensaciones y operaciones que disminuyen el stock")
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
                ? t("Incremento de inventario")
                : t("Disminución de inventario")}
            </p>
            <p
              className={`mt-1 text-xs ${isEntry ? "text-success-foreground/80" : "text-warning-foreground/80"}`}
            >
              {isEntry
                ? t("Los productos recibidos quedarán disponibles después de confirmar la operación.")
                : t("La cantidad solicitada se valida contra el stock disponible antes de confirmar.")}
            </p>
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("Fecha")}>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label={t("Tipo de operación")}>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {(isEntry ? entryReasons : exitReasons).map((item) => (
                <option key={item} value={item}>{t(item)}</option>
              ))}
            </select>
          </Field>
          {isEntry ? (
            <Field label={t("Proveedor")}>
              <Input
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder={t("Ej. Drogas La Rebaja")}
              />
            </Field>
          ) : (
            <Field label={t("Paciente (opcional)")}>
              <Input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder={t("Si es dispensación")}
              />
            </Field>
          )}
          <Field label={t("Documento de referencia")}>
            <Input
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              placeholder={t("Factura, receta o remisión")}
            />
          </Field>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <div>
            <h2 className="text-base font-bold">{t("Productos de la operación")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Puedes agregar múltiples productos y controlar lote y vencimiento.")}
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
            {t("Agregar producto")}
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
            {t("Agrega un producto para comenzar.")}
          </div>
        )}
        <Field label={t("Observaciones")}>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={t("Notas de la operación")}
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
              {t("Valor total estimado")}
            </span>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/inventory/movements">
              <Button variant="outline">{t("Ver movimientos")}</Button>
            </Link>
            <Button
              onClick={submit}
              disabled={
                saving || loadingProducts || invalidStock || !lines.length
              }
            >
              {saving
                ? t("Confirmando...")
                : isEntry
                  ? t("Confirmar entrada")
                  : t("Confirmar salida")}
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ClipboardList className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {t("Historial de {type}", { type: isEntry ? t("entradas") : t("salidas") })}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Últimas operaciones registradas en la base de datos.")}
            </p>
          </div>
        </div>
        {loadingHistory ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-8 w-full" />
          </div>
        ) : history.length ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("{count} registros", { count: String(history.length) })}
              description={t("Historial de {type}", { type: isEntry ? t("entradas") : t("salidas") })}
              icon={isEntry ? ArrowDownToLine : ArrowUpFromLine}
              variant="primary"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Referencia")}</TableHead>
                  <TableHead>{t("Fecha")}</TableHead>
                  <TableHead>{t("Motivo")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {isEntry ? t("Proveedor") : t("Responsable")}
                  </TableHead>
                  {!isEntry && <TableHead>{t("Paciente")}</TableHead>}
                  <TableHead className="hidden lg:table-cell">{t("Productos")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 8).map((item) => {
                  const entry = item as InventoryEntry;
                  const exit = item as InventoryExit;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.reference}
                      </TableCell>
                      <TableCell className="text-sm">{item.date}</TableCell>
                      <TableCell className="text-sm">{item.reason}</TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {isEntry ? entry.supplier ?? "—" : exit.responsible ?? "—"}
                      </TableCell>
                      {!isEntry && (
                        <TableCell className="text-sm">
                          {exit.patientName ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {item.lines.length} {t("línea" + (item.lines.length !== 1 ? "s" : ""))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {t("Aún no hay {type} registradas.", { type: isEntry ? t("entradas") : t("salidas") })}
          </div>
        )}
      </section>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !open && setConfirmOpen(false)}
      >
        <AlertDialogContent size="sm" className="sm:max-w-sm">
          <AlertDialogMedia
            className={`size-12 rounded-full ring-8 ${isEntry ? "bg-success-soft text-success-foreground ring-success-soft/50" : "bg-warning-soft text-warning-foreground ring-warning-soft/50"}`}
          >
            {isEntry ? <ArrowDownToLine /> : <ArrowUpFromLine />}
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              {isEntry
                ? t("Confirmar entrada de inventario")
                : t("Confirmar salida de inventario")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Se registrarán {count} {product} por un valor total de {total}. {detail}", {
                count: String(lines.length),
                product: lines.length === 1 ? t("producto") : t("productos"),
                total: formatCurrency(total),
                detail: isEntry
                  ? t("Los productos quedarán disponibles en stock después de confirmar.")
                  : t("La cantidad se descontará del stock disponible al confirmar."),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid-cols-1">
            <AlertDialogAction
              className="w-full"
              disabled={saving}
              onClick={() => void performSubmit()}
            >
              {saving ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : null}
              {t("Confirmar {type}", { type: isEntry ? t("entrada") : t("salida") })}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full" disabled={saving}>
              {t("Cancelar")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  products: ProductListItem[];
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
  const t = useT();
  const product = products.find((item) => item.id === line.productId);
  return (
    <div
      className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6 ${invalid ? "border-destructive bg-destructive-soft/30" : "border-border bg-muted/20"}`}
    >
      <div className="flex flex-col gap-1.5 lg:col-span-2">
        <Label className="text-xs">{t("Producto")} {index + 1}</Label>
        <select
          value={line.productId}
          onChange={(event) => onProductChange(event.target.value)}
        >
          <option value="">{t("Selecciona producto")}</option>
          {products.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name} {item.concentration} · {item.sku}
            </option>
          ))}
        </select>
        {!isEntry && product && (
          <span className="text-[11px] text-muted-foreground">
            {t("Stock disponible:")}: <strong>{product.stock}</strong>
          </span>
        )}
      </div>
      <Field label={t("Cantidad")}>
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
      <Field label={t("Lote")}>
        <Input
          value={line.lot}
          onChange={(event) => onChange(line.id, "lot", event.target.value)}
          placeholder={product?.lot ?? t("Lote")}
        />
      </Field>
      <Field label={t("Vencimiento")}>
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
          <p className="text-xs text-muted-foreground">{t("Subtotal")}</p>
          <p className="font-semibold">
            {formatCurrency(line.quantity * line.unitCost)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive"
          onClick={onRemove}
          aria-label={t("Eliminar producto {index}", { index: String(index + 1) })}
        >
          <Trash2 />
        </Button>
      </div>
      {invalid && (
        <p className="col-span-full text-xs font-semibold text-destructive">
          {t("No hay stock suficiente para esta cantidad.")}
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
  product: ProductListItem,
  isEntry: boolean,
  id = `line-${Date.now()}-${Math.random()}`,
): InventoryLine {
  return {
    id,
    productId: product.id,
    productName: `${product.name}${product.concentration ? ` ${product.concentration}` : ""}`.trim(),
    quantity: 1,
    lot: isEntry ? "" : (product.lot ?? ""),
    expirationDate: product.expirationDate ?? "",
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

function todayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
