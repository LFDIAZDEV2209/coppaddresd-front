"use client";

import { useRouter } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  ClipboardList,
  Eye,
  FilterX,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { useClinicalBoard } from "../hooks/use-clinical-board";
import type {
  ClinicalBoardItem,
  PatientBoardRisk,
  PatientFollowUp,
} from "../types";

const RISK_STYLES: Record<PatientBoardRisk, string> = {
  low: "bg-success-soft text-success-foreground",
  moderate: "bg-warning-soft text-warning-foreground",
  high: "bg-destructive-soft text-destructive",
  critical: "bg-destructive text-white",
};

const FOLLOW_UP_STYLES: Record<PatientFollowUp, string> = {
  "al-dia": "bg-success-soft text-success-foreground",
  vencido: "bg-destructive-soft text-destructive",
  "sin-asignacion": "bg-muted text-muted-foreground",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Tablero clínico: cinco señales reales por paciente (riesgo, alertas,
 * última y próxima evaluación, seguimiento) con filtros server-side y enlace
 * a la ficha del paciente en Tests de salud. Sin métricas inventadas: «Sin
 * evaluaciones» es un estado honesto.
 */
export function ClinicalBoardView() {
  const t = useT();
  const router = useRouter();
  const {
    result,
    filters,
    page,
    loading,
    error,
    setFilters,
    clearFilters,
    setPage,
    retry,
  } = useClinicalBoard();

  const hasFilters =
    filters.search.trim() !== "" ||
    filters.risk !== "all" ||
    filters.alerts !== "all" ||
    filters.followUp !== "all";

  const riskLabel = (risk: PatientBoardRisk | null) =>
    risk === null
      ? t("Sin evaluaciones")
      : risk === "low"
        ? t("Bajo")
        : risk === "moderate"
          ? t("Moderado")
          : risk === "high"
            ? t("Alto")
            : t("Crítico");

  const followUpLabel = (state: PatientFollowUp) =>
    state === "al-dia"
      ? t("Al día")
      : state === "vencido"
        ? t("Vencido")
        : t("Sin asignación");

  const openPatient = (item: ClinicalBoardItem) =>
    router.push(`/health-tests/pacientes/${item.patientId}`);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Estado clínico por paciente")}
          description={t("Riesgo, alertas y seguimiento de evaluaciones")}
          icon={ShieldAlert}
          variant="primary"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              disabled={loading}
              className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            >
              <RefreshCw
                data-icon="inline-start"
                className={loading ? "animate-spin" : undefined}
              />
              {t("Actualizar")}
            </Button>
          }
        />
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_190px_210px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder={t("Buscar por nombre, MRN o documento...")}
              aria-label={t("Buscar pacientes")}
            />
          </div>
          <Select
            value={filters.risk}
            onValueChange={(value) =>
              setFilters({ risk: (value ?? "all") as typeof filters.risk })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por riesgo")}
            >
              <SelectValue>
                {filters.risk === "all"
                  ? t("Todos los riesgos")
                  : riskLabel(filters.risk as PatientBoardRisk)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos los riesgos")}</SelectItem>
              <SelectItem value="low">{t("Bajo")}</SelectItem>
              <SelectItem value="moderate">{t("Moderado")}</SelectItem>
              <SelectItem value="high">{t("Alto")}</SelectItem>
              <SelectItem value="critical">{t("Crítico")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.alerts}
            onValueChange={(value) =>
              setFilters({ alerts: (value ?? "all") as typeof filters.alerts })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por alertas")}
            >
              <SelectValue>
                {filters.alerts === "all"
                  ? t("Todas las alertas")
                  : t("Con alertas activas")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todas las alertas")}</SelectItem>
              <SelectItem value="with">{t("Con alertas activas")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.followUp}
            onValueChange={(value) =>
              setFilters({
                followUp: (value ?? "all") as typeof filters.followUp,
              })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por seguimiento")}
            >
              <SelectValue>
                {filters.followUp === "all"
                  ? t("Todo el seguimiento")
                  : followUpLabel(filters.followUp as PatientFollowUp)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todo el seguimiento")}</SelectItem>
              <SelectItem value="al-dia">{t("Al día")}</SelectItem>
              <SelectItem value="vencido">{t("Vencido")}</SelectItem>
              <SelectItem value="sin-asignacion">
                {t("Sin asignación")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            <FilterX data-icon="inline-start" />
            {t("Limpiar")}
          </Button>
        </div>
      </section>

      {error && !result ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
          <p className="text-sm font-semibold text-destructive">
            {t("No pudimos cargar el tablero clínico")}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : loading && !result ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border py-4 last:border-0"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="hidden h-4 w-32 md:block" />
              <Skeleton className="h-4 w-24 md:ml-auto" />
            </div>
          ))}
        </div>
      ) : result && result.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ClipboardList className="size-6" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">
              {hasFilters
                ? t("Sin resultados con los filtros")
                : t("Sin pacientes en el alcance")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasFilters
                ? t("Prueba con otros términos o quita algún filtro.")
                : t("No hay pacientes para mostrar todavía.")}
            </p>
          </div>
          {hasFilters && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              <FilterX data-icon="inline-start" />
              {t("Limpiar filtros")}
            </Button>
          )}
        </div>
      ) : result ? (
        <>
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={`${result.total} ${t("pacientes en seguimiento")}`}
              description={t("Señales clínicas disponibles")}
              icon={ClipboardList}
              variant="primary"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Paciente")}</TableHead>
                  <TableHead>{t("Riesgo")}</TableHead>
                  <TableHead>{t("Alertas")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("Última evaluación")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("Próxima evaluación")}
                  </TableHead>
                  <TableHead>{t("Seguimiento")}</TableHead>
                  <TableHead className="w-20">
                    <span className="sr-only">{t("Acciones")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((item) => (
                  <TableRow key={item.patientId}>
                    <TableCell>
                      <button
                        className="flex flex-col text-left"
                        onClick={() => openPatient(item)}
                      >
                        <span className="text-sm font-semibold">
                          {item.firstName} {item.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.medicalRecordNumber ??
                            item.documentNumber ??
                            "—"}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          item.riskLevel
                            ? RISK_STYLES[item.riskLevel]
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {riskLabel(item.riskLevel)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.activeAlertCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <BellRing
                            aria-hidden
                            className={cn(
                              "size-3.5",
                              item.maxAlertSeverity === "critical"
                                ? "text-destructive"
                                : "text-warning",
                            )}
                          />
                          <span className="tabular-nums font-medium">
                            {item.activeAlertCount}
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex flex-col">
                        <span className="text-sm">
                          {formatDate(item.lastEvaluationAt)}
                        </span>
                        <span className="max-w-44 truncate text-xs text-muted-foreground">
                          {item.lastEvaluationInstrument ?? "—"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm",
                          item.followUpState === "vencido" &&
                            "font-semibold text-destructive",
                        )}
                      >
                        <CalendarClock aria-hidden className="size-3.5" />
                        {formatDate(item.nextEvaluationDueAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          FOLLOW_UP_STYLES[item.followUpState],
                        )}
                      >
                        {followUpLabel(item.followUpState)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPatient(item)}
                      >
                        <Eye data-icon="inline-start" />
                        {t("Ver")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("Página")} {result.page} {t("de")} {result.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("Anterior")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page >= result.totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t("Siguiente")}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
