"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Package,
  PackageX,
  PieChart,
  TriangleAlert,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
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
import { fetchAnalytics } from "../services/inventory-service";
import type { InventoryAnalytics, ProductListItem } from "../types";

const CHART_COLORS = [
  "bg-primary",
  "bg-info",
  "bg-warning",
  "bg-success",
  "bg-destructive",
];

export function ReportsPage() {
  const [preset, setPreset] = useState("Últimos 30 días");
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => today());
  const [format, setFormat] = useState<"Excel" | "PDF">("Excel");
  const [reportType, setReportType] = useState("Reporte de movimientos");
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAnalytics({ from, to })
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAnalytics(null);
          setError("No pudimos cargar los datos del reporte.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const changePreset = (value: string) => {
    setPreset(value);
    const range = rangeForPreset(value);
    if (range) {
      setLoading(true);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const exportReport = async () => {
    if (!analytics) return;
    setExporting(true);
    setSuccess(null);
    setError(null);
    try {
      if (format === "Excel") {
        downloadCsv(reportType, analytics, from, to);
      } else {
        printReport(reportType, analytics, from, to);
      }
      setSuccess(
        format === "Excel"
          ? `${reportType} descargado en formato CSV.`
          : `${reportType} listo para guardar como PDF.`,
      );
    } catch {
      setError("No pudimos generar el reporte. Intenta nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Reportes"
        description="Convierte el inventario en decisiones de reposición y control"
        icon={FileBarChart}
        actions={
          <Button size="sm" onClick={() => void exportReport()} disabled={exporting}>
            <Download data-icon="inline-start" />
            {exporting ? "Generando..." : "Exportar reporte"}
          </Button>
        }
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <SectionHeader
          title="Periodo del reporte"
          description="Filtra los datos para descargar un reporte operativo"
          icon={CalendarDays}
          variant="secondary"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={preset}
            onChange={(event) => changePreset(event.target.value)}
            aria-label="Periodo"
          >
            <option>Hoy</option>
            <option>Últimos 7 días</option>
            <option>Últimos 30 días</option>
            <option>Este mes</option>
            <option>Mes anterior</option>
            <option>Rango personalizado</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setPreset("Rango personalizado");
              setLoading(true);
              setError(null);
              setFrom(event.target.value);
            }}
            aria-label="Fecha desde"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setPreset("Rango personalizado");
              setLoading(true);
              setError(null);
              setTo(event.target.value);
            }}
            aria-label="Fecha hasta"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            aria-label="Tipo de reporte"
          >
            <option>Reporte de movimientos</option>
            <option>Existencias actuales</option>
            <option>Productos por vencer</option>
            <option>Valorización de inventario</option>
          </select>
          <div className="flex gap-2">
            <Button
              variant={format === "Excel" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat("Excel")}
            >
              <FileSpreadsheet data-icon="inline-start" />
              Excel
            </Button>
            <Button
              variant={format === "PDF" ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat("PDF")}
            >
              <FileBarChart data-icon="inline-start" />
              PDF
            </Button>
          </div>
        </div>
      </section>

      {success && (
        <p
          className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-foreground"
          role="status"
        >
          <CheckCircle2 className="size-4" />
          {success}
        </p>
      )}

      {error && (
        <p
          className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <ReportsSkeleton />
      ) : !analytics ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          No hay datos disponibles para este periodo.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Unidades entradas"
              value={String(analytics.unitsEntered)}
              context={`${analytics.entries} ${analytics.entries === 1 ? "operación" : "operaciones"} de entrada`}
              icon={ArrowDownToLine}
              variant="success"
            />
            <StatCard
              label="Unidades salidas"
              value={String(analytics.unitsExited)}
              context={`${analytics.exits} ${analytics.exits === 1 ? "operación" : "operaciones"} de salida`}
              icon={ArrowUpFromLine}
              variant="destructive"
            />
            <StatCard
              label="Entradas del período"
              value={String(analytics.entries)}
              context="Documentos de entrada"
              icon={Package}
              variant="info"
            />
            <StatCard
              label="Salidas del período"
              value={String(analytics.exits)}
              context="Documentos de salida"
              icon={PackageX}
              variant="warning"
            />
          </div>

          <ReportBody reportType={reportType} analytics={analytics} />

          <EstadoActual analytics={analytics} />
        </>
      )}
    </div>
  );
}

function ReportBody({
  reportType,
  analytics,
}: {
  reportType: string;
  analytics: InventoryAnalytics;
}) {
  switch (reportType) {
    case "Existencias actuales":
      return <ExistenciasReport analytics={analytics} />;
    case "Productos por vencer":
      return <VencimientoReport analytics={analytics} />;
    case "Valorización de inventario":
      return <ValorizacionReport analytics={analytics} />;
    default:
      return <MovimientosReport analytics={analytics} />;
  }
}

function MovimientosReport({ analytics }: { analytics: InventoryAnalytics }) {
  const maxValue = Math.max(
    1,
    ...analytics.movementSeries.flatMap((day) => [day.entries, day.exits]),
  );

  return (
    <div className="grid gap-5">
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title="Entradas vs. salidas"
          description="Unidades movidas por fecha de operación"
          icon={BarChart3}
          variant="primary"
        />
        <div className="flex h-56 items-end gap-3 border-b border-border px-5 pb-6 pt-5">
          {analytics.movementSeries.map((day) => (
            <div
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              key={day.label}
            >
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t bg-primary/80"
                  style={{ height: `${(day.entries / maxValue) * 100}%` }}
                  title={`Entradas: ${day.entries}`}
                />
                <div
                  className="w-3 rounded-t bg-destructive/70"
                  style={{ height: `${(day.exits / maxValue) * 100}%` }}
                  title={`Salidas: ${day.exits}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {day.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 px-5 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-primary" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-destructive" />
            Salidas
          </span>
        </div>
      </section>

      <ReportList
        title="Productos con mayor movimiento"
        description="Prioriza las reposiciones por rotación"
        icon={TrendingUp}
        ranked
        items={analytics.topMoving.map((item, i) => ({
          name: item.name,
          detail: `${item.quantity} unidades`,
          rank: i + 1,
        }))}
      />
    </div>
  );
}

function ExistenciasReport({ analytics }: { analytics: InventoryAnalytics }) {
  const rows = analytics.products
    .filter((product) => product.status === "Activo")
    .sort((a, b) => b.stock * b.unitCost - a.stock * a.unitCost);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title="Existencias actuales"
        description="Inventario disponible en almacén al día de hoy"
        icon={Package}
        variant="primary"
      />
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden lg:table-cell">Ubicación</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="text-sm font-medium">
                  {product.name}
                  {product.concentration ? ` ${product.concentration}` : ""}
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                  {product.sku}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {product.location ?? "—"}
                </TableCell>
                <TableCell className="text-sm font-semibold">
                  {product.stock}
                </TableCell>
                <TableCell className="text-sm">
                  {formatCurrency(product.stock * product.unitCost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No hay productos activos en el catálogo.
        </div>
      )}
    </section>
  );
}

function VencimientoReport({ analytics }: { analytics: InventoryAnalytics }) {
  const rows = analytics.products
    .map((product) => ({
      ...product,
      state: expirationState(product.expirationDate),
    }))
    .filter((product) => product.state !== null)
    .sort((a, b) => (a.expirationDate ?? "").localeCompare(b.expirationDate ?? ""));

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title="Productos por vencer"
        description="Vencidos y próximos a vencer (90 días)"
        icon={TriangleAlert}
        variant="primary"
      />
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">Lote</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="text-sm font-medium">
                  {product.name}
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                  {product.lot ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {product.expirationDate}
                </TableCell>
                <TableCell className="text-sm font-semibold">
                  {product.stock}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      product.state === "Vencido"
                        ? "bg-destructive-soft text-destructive"
                        : "bg-warning-soft text-warning-foreground"
                    }`}
                  >
                    {product.state}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          No hay productos próximos a vencer ni vencidos.
        </div>
      )}
    </section>
  );
}

function ValorizacionReport({ analytics }: { analytics: InventoryAnalytics }) {
  const maxValue = Math.max(1, ...analytics.categoryValue.map((c) => c.value));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,1fr)_minmax(0,1.5fr)]">
      <div className="flex flex-col justify-center gap-3 rounded-2xl border border-border bg-card p-5">
        <span className="text-xs text-muted-foreground">
          Valor total del inventario
        </span>
        <p className="text-3xl font-bold">{formatCurrency(analytics.totalValue)}</p>
        <span className="text-xs text-muted-foreground">
          {analytics.activeProducts} productos activos · {analytics.lowStock} con
          stock bajo · {analytics.outOfStock} sin stock
        </span>
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title="Valor por categoría"
          description="Distribución del inventario actual"
          icon={PieChart}
          variant="primary"
        />
        <div className="flex flex-col gap-4 p-5">
          {analytics.categoryValue.map((item, index) => (
            <div key={item.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{item.category}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${CHART_COLORS[index % CHART_COLORS.length]}`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EstadoActual({ analytics }: { analytics: InventoryAnalytics }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <SectionHeader
        title="Estado actual del inventario"
        description="Snapshot del catálogo, independiente del periodo seleccionado"
        icon={Package}
        variant="secondary"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Valor total" value={formatCurrency(analytics.totalValue)} />
        <MiniStat label="Productos activos" value={String(analytics.activeProducts)} />
        <MiniStat label="Stock bajo" value={String(analytics.lowStock)} />
        <MiniStat label="Sin stock" value={String(analytics.outOfStock)} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReportList({
  title,
  description,
  icon: Icon,
  items,
  ranked,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  items: { name: string; detail: string; rank?: number }[];
  ranked?: boolean;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={title}
        description={description}
        icon={Icon}
        variant="primary"
      />
      <div className="flex flex-col gap-2 p-4">
        {items.length ? (
          items.map((item) => (
            <div
              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm"
              key={item.name}
            >
              {ranked && typeof item.rank === "number" && (
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    item.rank <= 3
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.rank}
                </span>
              )}
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.detail}</span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            <PackageX className="size-4" />
            Sin datos en este período.
          </div>
        )}
      </div>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function expirationState(expirationDate: string | null): "Vencido" | "Próximo a vencer" | null {
  if (!expirationDate) return null;
  const date = new Date(`${expirationDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return "Vencido";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 90);
  if (date <= soon) return "Próximo a vencer";
  return null;
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-56" />
      </div>
    </div>
  );
}

function today(): string {
  return toDateString(new Date());
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateString(date);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeForPreset(preset: string): { from: string; to: string } | null {
  const to = today();
  switch (preset) {
    case "Hoy":
      return { from: to, to };
    case "Últimos 7 días":
      return { from: daysAgo(6), to };
    case "Últimos 30 días":
      return { from: daysAgo(29), to };
    case "Este mes": {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return { from, to };
    }
    case "Mes anterior": {
      const now = new Date();
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
      const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
      return {
        from: toDateString(firstOfPrevMonth),
        to: toDateString(lastOfPrevMonth),
      };
    }
    default:
      return null;
  }
}

function downloadCsv(
  reportType: string,
  analytics: InventoryAnalytics,
  from: string,
  to: string,
) {
  const rows = [
    ["Reporte", reportType],
    ["Desde", from],
    ["Hasta", to],
    [],
    ["Indicador", "Valor"],
    ["Unidades entradas", String(analytics.unitsEntered)],
    ["Unidades salidas", String(analytics.unitsExited)],
    ["Operaciones de entrada", String(analytics.entries)],
    ["Operaciones de salida", String(analytics.exits)],
    ["Valor total del inventario", String(analytics.totalValue)],
    ["Productos activos", String(analytics.activeProducts)],
    ["Stock bajo", String(analytics.lowStock)],
    ["Sin stock", String(analytics.outOfStock)],
    [],
    ["Fecha", "Entradas", "Salidas"],
    ...analytics.movementSeries.map((day) => [
      day.label,
      String(day.entries),
      String(day.exits),
    ]),
    [],
    ["SKU", "Producto", "Categoría", "Stock", "Ubicación", "Valor", "Vencimiento"],
    ...analytics.products.map((product: ProductListItem) => [
      product.sku,
      product.name,
      product.category,
      String(product.stock),
      product.location ?? "",
      String(product.stock * product.unitCost),
      product.expirationDate ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-inventario-${from}-${to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printReport(
  reportType: string,
  analytics: InventoryAnalytics,
  from: string,
  to: string,
) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) throw new Error("No se pudo abrir la ventana de impresión.");

  const productRows = analytics.products
    .map(
      (product) =>
        `<tr><td>${escapeHtml(product.name)}</td><td>${product.stock}</td><td>${escapeHtml(product.location ?? "—")}</td><td>${formatCurrency(product.stock * product.unitCost)}</td></tr>`,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="es"><head><title>${escapeHtml(reportType)}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#172033}h1{margin-bottom:4px}p{color:#667085}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.card{border:1px solid #d9dee8;border-radius:8px;padding:14px}.value{font-size:22px;font-weight:700}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #d9dee8;padding:8px;text-align:left}</style></head>
    <body><h1>${escapeHtml(reportType)}</h1><p>Periodo: ${escapeHtml(from)} a ${escapeHtml(to)}</p>
    <div class="grid">
      <div class="card">Unidades entradas<div class="value">${analytics.unitsEntered}</div></div>
      <div class="card">Unidades salidas<div class="value">${analytics.unitsExited}</div></div>
      <div class="card">Operaciones entrada<div class="value">${analytics.entries}</div></div>
      <div class="card">Operaciones salida<div class="value">${analytics.exits}</div></div>
    </div>
    <h2>Movimiento por fecha</h2>
    <table><thead><tr><th>Fecha</th><th>Entradas</th><th>Salidas</th></tr></thead><tbody>
    ${analytics.movementSeries.map((day) => `<tr><td>${escapeHtml(day.label)}</td><td>${day.entries}</td><td>${day.exits}</td></tr>`).join("")}
    </tbody></table>
    <h2>Existencias</h2>
    <table><thead><tr><th>Producto</th><th>Stock</th><th>Ubicación</th><th>Valor</th></tr></thead><tbody>
    ${productRows}
    </tbody></table></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ] ?? character,
  );
}
