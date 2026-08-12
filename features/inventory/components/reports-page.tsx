"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Package,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { fetchAnalytics } from "../services/inventory-service";

const analytics = fetchAnalytics();

export function ReportsPage() {
  const [preset, setPreset] = useState("Últimos 30 días");
  const [format, setFormat] = useState<"Excel" | "PDF">("Excel");
  const [reportType, setReportType] = useState("Reporte de movimientos");
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const exportReport = async () => {
    setExporting(true);
    setSuccess(null);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setExporting(false);
    setSuccess(`${reportType} generado en formato ${format}.`);
  };
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Reportes"
        description="Convierte el inventario en decisiones de reposición y control"
        icon={FileBarChart}
        actions={
          <Button
            size="sm"
            onClick={() => void exportReport()}
            disabled={exporting}
          >
            <Download data-icon="inline-start" />
            {exporting ? "Generando..." : "Exportar reporte"}
          </Button>
        }
      />
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Periodo del reporte</h2>
            <p className="text-xs text-muted-foreground">
              Filtra los datos para descargar un reporte operativo.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Valor del inventario"
          value={formatCurrency(analytics.totalValue)}
          detail="+8.4% vs. período anterior"
          icon={Package}
          tone="primary"
        />
        <Kpi
          label="Productos activos"
          value={String(analytics.activeProducts)}
          detail="De 9 productos registrados"
          icon={Package}
          tone="info"
        />
        <Kpi
          label="Stock bajo"
          value={String(analytics.lowStock)}
          detail="Requieren reposición"
          icon={TriangleAlert}
          tone="warning"
        />
        <Kpi
          label="Salidas del período"
          value={String(analytics.exits)}
          detail="+12.5% vs. período anterior"
          icon={TrendingDown}
          tone="danger"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold">Entradas vs. salidas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Volumen de unidades movidas durante los últimos 7 días.
              </p>
            </div>
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div className="mt-6 flex h-48 items-end gap-3 border-b border-l border-border px-3 pb-0 pt-4">
            {analytics.movementSeries.map((day) => (
              <div
                className="flex flex-1 items-end justify-center gap-1"
                key={day.label}
              >
                <div
                  className="w-3 rounded-t bg-primary/75"
                  style={{ height: `${day.entries * 3}px` }}
                  title={`Entradas: ${day.entries}`}
                />
                <div
                  className="w-3 rounded-t bg-destructive/65"
                  style={{ height: `${day.exits * 3}px` }}
                  title={`Salidas: ${day.exits}`}
                />
                <span className="absolute mt-56 text-[10px] text-muted-foreground">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-4 text-xs text-muted-foreground">
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
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Valor por categoría</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Distribución del inventario actual.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {analytics.categoryValue.map((item, index) => (
              <div key={item.category}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${index === 0 ? "bg-primary" : index === 1 ? "bg-info" : "bg-warning"}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-primary-soft p-3 text-xs text-primary">
            Medicamentos concentran la mayor inversión del inventario.
          </div>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ReportList
          title="Productos con mayor movimiento"
          description="Prioriza las reposiciones por rotación"
          items={analytics.topMoving.map(
            (item) => `${item.name}|${item.quantity} unidades`,
          )}
          icon={TrendingUp}
        />
        <ReportList
          title="Alertas de inventario"
          description="Productos que necesitan atención"
          items={[
            "Losartán · Sin stock",
            "Amoxicilina · Vence en 55 días",
            "Metformina · Stock bajo",
            "Ácido acetilsalicílico · Vencido",
          ]}
          icon={TriangleAlert}
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Package;
  tone: "primary" | "info" | "warning" | "danger";
}) {
  const colors = {
    primary: "bg-primary-soft text-primary",
    info: "bg-info-soft text-info-foreground",
    warning: "bg-warning-soft text-warning-foreground",
    danger: "bg-destructive-soft text-destructive",
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
      <p className="mt-3 text-xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}
function ReportList({
  title,
  description,
  items,
  icon: Icon,
}: {
  title: string;
  description: string;
  items: string[];
  icon: typeof TrendingUp;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {items.map((item) => {
          const [name, detail] = item.split("|");
          return (
            <div
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm"
              key={item}
            >
              <span className="font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">{detail}</span>
            </div>
          );
        })}
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
