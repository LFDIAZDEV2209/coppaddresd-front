"use client";

import { useEffect, useState } from "react";
import {
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
import { fetchAnalytics } from "../services/inventory-service";
import type { InventoryAnalytics } from "../types";

const CHART_COLORS = [
  "bg-primary",
  "bg-info",
  "bg-warning",
  "bg-success",
  "bg-destructive",
];

export function ReportsPage() {
  const [preset, setPreset] = useState("Últimos 30 días");
  const [format, setFormat] = useState<"Excel" | "PDF">("Excel");
  const [reportType, setReportType] = useState("Reporte de movimientos");
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchAnalytics()
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportReport = async () => {
    setExporting(true);
    setSuccess(null);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setExporting(false);
    setSuccess(`${reportType} generado en formato ${format}.`);
  };

  const maxValue = Math.max(
    1,
    ...(analytics?.movementSeries.flatMap((d) => [d.entries, d.exits]) ?? [1]),
  );

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
            onChange={(event) => setPreset(event.target.value)}
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
            defaultValue="2024-06-01"
            aria-label="Fecha desde"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            type="date"
            defaultValue="2024-06-18"
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

      {loading || !analytics ? (
        <ReportsSkeleton />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Valor del inventario"
              value={formatCurrency(analytics.totalValue)}
              context="Capital en existencias"
              icon={Package}
              variant="primary"
            />
            <StatCard
              label="Productos activos"
              value={String(analytics.activeProducts)}
              context="En el catálogo"
              icon={Package}
              variant="info"
            />
            <StatCard
              label="Stock bajo"
              value={String(analytics.lowStock)}
              context="Requieren reposición"
              icon={TriangleAlert}
              variant="warning"
            />
            <StatCard
              label="Salidas del período"
              value={String(analytics.exits)}
              context="Unidades dispensadas"
              icon={ArrowUpFromLine}
              variant="destructive"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <SectionHeader
                title="Entradas vs. salidas"
                description="Volumen de unidades movidas en los últimos 7 días"
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
                        style={{
                          height: `${(day.entries / maxValue) * 100}%`,
                        }}
                        title={`Entradas: ${day.entries}`}
                      />
                      <div
                        className="w-3 rounded-t bg-destructive/70"
                        style={{
                          height: `${(day.exits / maxValue) * 100}%`,
                        }}
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
                        style={{ width: `${Math.min(100, item.value) || 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ReportList
              title="Productos con mayor movimiento"
              description="Prioriza las reposiciones por rotación"
              icon={TrendingUp}
              ranked
              items={analytics.topMoving.map(
                (item, i) => ({
                  name: item.name,
                  detail: `${item.quantity} unidades`,
                  rank: i + 1,
                }),
              )}
            />
            <ReportList
              title="Alertas de inventario"
              description="Productos que necesitan atención"
              icon={TriangleAlert}
              items={[
                { name: "Sin stock", detail: `${analytics.outOfStock} productos` },
                { name: "Próximos a vencer", detail: `${analytics.expiringSoon} productos` },
                { name: "Vencidos", detail: `${analytics.expired} productos` },
              ]}
            />
          </div>
        </>
      )}
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
