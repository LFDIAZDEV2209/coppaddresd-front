"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CalendarClock,
  ClipboardList,
  Eye,
  FilterX,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  rainbowStyle,
  rainbowToneFromClassName,
  type RainbowTone,
} from "@/lib/ui/rainbow";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { useClinicalBoard } from "../hooks/use-clinical-board";
import { deletePatient, fetchInsurers } from "../services/patients-service";
import { PatientStatusToggle } from "./patient-status-toggle";
import type {
  ClinicalBoardFilters,
  ClinicalBoardItem,
  Insurer,
  PatientBoardRisk,
  PatientFollowUp,
} from "../types";

const RISK_TONES: Record<PatientBoardRisk, RainbowTone> = {
  low: "green",
  moderate: "amber",
  high: "orange",
  critical: "rose",
};

const FOLLOW_UP_TONES: Record<PatientFollowUp, RainbowTone> = {
  "al-dia": "green",
  vencido: "rose",
  "sin-asignacion": "slate",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> =
  {
    Activo: {
      bg: "var(--success-soft)",
      text: "var(--success-soft-foreground)",
      dot: "var(--success-soft-foreground)",
    },
    Pendiente: {
      bg: "var(--warning-soft)",
      text: "var(--warning-soft-foreground)",
      dot: "var(--warning)",
    },
    Inactivo: {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
  };

const FALLBACK_STATUS_COLOR = {
  bg: "var(--muted)",
  text: "var(--muted-foreground)",
  dot: "var(--muted-foreground)",
};

function statusColor(status: string) {
  return STATUS_COLORS[status] ?? FALLBACK_STATUS_COLOR;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "—";
}

interface SummaryTileProps {
  label: string;
  value: number | null;
  sub?: string;
  icon: LucideIcon;
  iconClassName?: string;
  active?: boolean;
  onClick?: () => void;
}

/** Tarjeta de resumen clínico; con `onClick` actúa como filtro del tablero. */
function SummaryTile({
  label,
  value,
  sub,
  icon: Icon,
  iconClassName,
  active = false,
  onClick,
}: SummaryTileProps) {
  const className = cn(
    "spectrum-card flex min-h-[92px] min-w-0 flex-col gap-1 rounded-2xl border border-brand-blue-soft/40 px-3.5 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring",
    onClick && "cursor-pointer hover:bg-muted/40",
    active
      ? "bg-primary-soft ring-1 ring-inset ring-primary/30"
      : "bg-primary-soft/25",
  );
  const style = rainbowStyle(rainbowToneFromClassName(iconClassName) ?? "sky");
  const content = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon
          className={cn("size-3.5 shrink-0", iconClassName)}
          aria-hidden="true"
        />
        <span className="min-w-0 leading-snug">{label}</span>
      </span>
      <span className="text-2xl font-bold tabular-nums">{value ?? "—"}</span>
      {sub ? (
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div style={style} className={className}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      style={style}
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
}

interface ClinicalBoardViewProps {
  stateCode: string | null;
  initialFilters?: Partial<ClinicalBoardFilters>;
  onClearState?: () => void;
}

/**
 * Tablero clínico fusionado con el directorio: tarjetas de resumen reales
 * (riesgo, alertas y seguimiento) que actúan como filtros + tabla única con
 * datos de directorio, señales clínicas y acciones de gestión del paciente.
 */
export function ClinicalBoardView({
  stateCode,
  initialFilters,
  onClearState,
}: ClinicalBoardViewProps) {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const {
    result,
    filters,
    loading,
    error,
    setFilters,
    clearFilters,
    setPage,
    retry,
  } = useClinicalBoard(10, stateCode, initialFilters);

  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [deleting, setDeleting] = useState<ClinicalBoardItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canEdit = can("Patients.Update");
  const canDelete = can("Patients.Delete");
  const fullScope = can("Patients.View");
  const summary = result?.summary ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetchInsurers(controller.signal)
      .then(setInsurers)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const refresh = async () => {
    retry();
    return true;
  };

  const riskLabel = (risk: PatientBoardRisk | null) => {
    if (risk === null) return t("Sin evaluaciones");
    if (risk === "low") return t("Riesgo bajo");
    if (risk === "moderate") return t("Riesgo moderado");
    if (risk === "high") return t("Riesgo alto");
    return t("Riesgo crítico");
  };

  const followUpLabel = (followUp: PatientFollowUp) => {
    if (followUp === "al-dia") return t("Al día");
    if (followUp === "vencido") return t("Vencido");
    return t("Sin asignación");
  };

  const pctOfScope = (count: number | undefined) => {
    if (!summary || !summary.total || count === undefined) return undefined;
    return `${Math.round((count / summary.total) * 100)}% ${t("del alcance")}`;
  };

  const toggleRisk = (risk: PatientBoardRisk) => {
    setFilters({ risk: filters.risk === risk ? "all" : risk });
  };

  const hasFilters =
    Boolean(stateCode) ||
    filters.search.trim() !== "" ||
    filters.risk !== "all" ||
    filters.alerts !== "all" ||
    filters.followUp !== "all" ||
    filters.status !== "all" ||
    filters.insurerId !== "all";

  const clearAll = () => {
    clearFilters();
    onClearState?.();
  };

  const selectedInsurerName =
    insurers.find((insurer) => insurer.id === filters.insurerId)?.name ??
    t("Todas las aseguradoras");

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deletePatient(deleting.patientId);
      setDeleting(null);
      retry();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("No pudimos eliminar el paciente."),
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="@container/clinical-board flex min-w-0 flex-col gap-4">
      <section
        aria-label={t("Resumen clínico")}
        className="grid grid-cols-2 gap-3 @min-[600px]/clinical-board:grid-cols-3 @min-[1100px]/clinical-board:grid-cols-6"
      >
        <SummaryTile
          label={t("Riesgo alto")}
          value={summary?.riskHigh ?? null}
          sub={pctOfScope(summary?.riskHigh)}
          icon={ShieldAlert}
          iconClassName="text-destructive"
          active={filters.risk === "high"}
          onClick={() => toggleRisk("high")}
        />
        <SummaryTile
          label={t("Riesgo moderado")}
          value={summary?.riskModerate ?? null}
          sub={pctOfScope(summary?.riskModerate)}
          icon={TriangleAlert}
          iconClassName="text-warning"
          active={filters.risk === "moderate"}
          onClick={() => toggleRisk("moderate")}
        />
        <SummaryTile
          label={t("Riesgo bajo")}
          value={summary?.riskLow ?? null}
          sub={pctOfScope(summary?.riskLow)}
          icon={ShieldCheck}
          iconClassName="text-success-soft-foreground"
          active={filters.risk === "low"}
          onClick={() => toggleRisk("low")}
        />
        <SummaryTile
          label={t("Sin evaluaciones")}
          value={summary?.withoutEvaluation ?? null}
          sub={pctOfScope(summary?.withoutEvaluation)}
          icon={ShieldQuestion}
          iconClassName="text-muted-foreground"
        />
        <SummaryTile
          label={t("Con alertas activas")}
          value={summary?.withActiveAlerts ?? null}
          icon={BellRing}
          iconClassName="text-warning"
          active={filters.alerts === "with"}
          onClick={() =>
            setFilters({ alerts: filters.alerts === "with" ? "all" : "with" })
          }
        />
        <SummaryTile
          label={t("Seguimiento vencido")}
          value={summary?.followUpOverdue ?? null}
          icon={CalendarClock}
          iconClassName="text-destructive"
          active={filters.followUp === "vencido"}
          onClick={() =>
            setFilters({
              followUp: filters.followUp === "vencido" ? "all" : "vencido",
            })
          }
        />
      </section>

      <section
        aria-label={t("Directorio clínico")}
        className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-blue-soft/40 bg-card shadow-xs"
      >
        <SectionHeader
          title={t("Estado clínico por paciente")}
          description={t("Directorio clínico · riesgo, alertas y seguimiento")}
          icon={ShieldAlert}
          variant="surface"
          actions={
            <Button
              variant="outline"
              size="comfortable"
              onClick={retry}
              disabled={loading}
            >
              <RefreshCw
                data-icon="inline-start"
                className={cn(
                  loading && "animate-spin motion-reduce:animate-none",
                )}
              />
              {t("Actualizar")}
            </Button>
          }
        />
        <div className="grid min-w-0 grid-cols-2 gap-3 border-y border-border bg-background/35 p-4 @min-[700px]/clinical-board:grid-cols-3 @min-[1100px]/clinical-board:grid-cols-6">
          <div className="relative col-span-2 @min-[1100px]/clinical-board:col-span-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              density="comfortable"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder={t("Buscar por nombre, MRN o documento...")}
              aria-label={t("Buscar pacientes")}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.risk}
            onValueChange={(value) =>
              setFilters({ risk: value as ClinicalBoardFilters["risk"] })
            }
          >
            <SelectTrigger
              size="comfortable"
              aria-label={t("Filtrar por riesgo")}
            >
              <SelectValue>
                {filters.risk === "all"
                  ? t("Todos los riesgos")
                  : riskLabel(filters.risk)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos los riesgos")}</SelectItem>
              <SelectItem value="low">{t("Riesgo bajo")}</SelectItem>
              <SelectItem value="moderate">{t("Riesgo moderado")}</SelectItem>
              <SelectItem value="high">{t("Riesgo alto")}</SelectItem>
              <SelectItem value="critical">{t("Riesgo crítico")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.alerts}
            onValueChange={(value) =>
              setFilters({ alerts: value as ClinicalBoardFilters["alerts"] })
            }
          >
            <SelectTrigger
              size="comfortable"
              aria-label={t("Filtrar por alertas")}
            >
              <SelectValue>
                {filters.alerts === "with"
                  ? t("Con alertas activas")
                  : t("Todas las alertas")}
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
                followUp: value as ClinicalBoardFilters["followUp"],
              })
            }
          >
            <SelectTrigger
              size="comfortable"
              aria-label={t("Filtrar por seguimiento")}
            >
              <SelectValue>
                {filters.followUp === "all"
                  ? t("Todo el seguimiento")
                  : followUpLabel(filters.followUp)}
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
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ status: value as ClinicalBoardFilters["status"] })
            }
          >
            <SelectTrigger
              size="comfortable"
              className="@min-[1100px]/clinical-board:col-span-2"
              aria-label={t("Filtrar por estado del paciente")}
            >
              <SelectValue>
                {filters.status === "all"
                  ? t("Todos los estados")
                  : t(filters.status)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos los estados")}</SelectItem>
              <SelectItem value="Activo">{t("Activo")}</SelectItem>
              <SelectItem value="Pendiente">{t("Pendiente")}</SelectItem>
              <SelectItem value="Inactivo">{t("Inactivo")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.insurerId}
            onValueChange={(value) => setFilters({ insurerId: value ?? "all" })}
          >
            <SelectTrigger
              size="comfortable"
              className="@min-[700px]/clinical-board:col-span-2 @min-[1100px]/clinical-board:col-span-3"
              aria-label={t("Filtrar por aseguradora")}
            >
              <SelectValue>{selectedInsurerName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todas las aseguradoras")}</SelectItem>
              {insurers.map((insurer) => (
                <SelectItem key={insurer.id} value={insurer.id}>
                  {insurer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="comfortable"
            onClick={clearAll}
            disabled={!hasFilters}
            className="justify-self-start @min-[700px]/clinical-board:w-full"
          >
            <FilterX data-icon="inline-start" />
            {t("Limpiar")}
          </Button>
        </div>

        {error && !result ? (
          <div
            role="alert"
            className="bg-destructive-soft/30 px-5 py-14 text-center"
          >
            <p className="text-base font-semibold text-foreground">
              {t("No pudimos cargar el tablero clínico")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={retry}>
              <RefreshCw data-icon="inline-start" />
              {t("Reintentar")}
            </Button>
          </div>
        ) : loading && !result ? (
          <div
            aria-label={t("Cargando pacientes")}
            aria-busy="true"
            className="bg-card p-5"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-border py-4 last:border-0"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="hidden h-4 w-32 md:block" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        ) : result && result.data.length === 0 ? (
          <div className="bg-card px-5 py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <ClipboardList className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">
              {hasFilters
                ? t("Sin resultados con los filtros")
                : t("Sin pacientes en el alcance")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters
                ? t("Prueba con otros términos o quita algún filtro.")
                : t("No hay pacientes para mostrar todavía.")}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="mt-4" onClick={clearAll}>
                <FilterX data-icon="inline-start" />
                {t("Limpiar filtros")}
              </Button>
            ) : null}
          </div>
        ) : result ? (
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p
                role="status"
                className="text-sm font-medium text-muted-foreground"
              >
                {result.total} {t("pacientes en seguimiento")}
              </p>
              {loading && (
                <span className="text-xs text-muted-foreground">
                  {t("Actualizando...")}
                </span>
              )}
            </div>
            <Table
              density="comfortable"
              aria-label={t("Estado clínico por paciente")}
              containerProps={{
                tabIndex: 0,
                role: "region",
                "aria-label": t("Tabla de pacientes"),
                className:
                  "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              }}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Paciente")}</TableHead>
                  <TableHead className="hidden @min-[1300px]/clinical-board:table-cell">
                    {t("Diagnóstico")}
                  </TableHead>
                  <TableHead className="hidden @min-[1300px]/clinical-board:table-cell">
                    {t("Ubicación")}
                  </TableHead>
                  <TableHead className="hidden @min-[900px]/clinical-board:table-cell">
                    {t("Aseguradora")}
                  </TableHead>
                  <TableHead>{t("Riesgo")}</TableHead>
                  <TableHead>{t("Alertas")}</TableHead>
                  <TableHead className="hidden @min-[700px]/clinical-board:table-cell">
                    {t("Última evaluación")}
                  </TableHead>
                  <TableHead className="hidden @min-[1300px]/clinical-board:table-cell">
                    {t("Próxima evaluación")}
                  </TableHead>
                  <TableHead>{t("Seguimiento")}</TableHead>
                  {fullScope ? (
                    <TableHead className="hidden @min-[1300px]/clinical-board:table-cell">
                      {t("Profesional")}
                    </TableHead>
                  ) : null}
                  <TableHead>{t("Estado")}</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">{t("Acciones")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((item) => (
                  <TableRow key={item.patientId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground"
                          aria-hidden="true"
                        >
                          {initials(item.firstName, item.lastName)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/patients/${item.patientId}`)
                          }
                          className="flex w-56 min-w-0 flex-col gap-1 rounded text-left focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <span className="whitespace-normal break-words text-sm font-semibold leading-snug text-foreground hover:text-primary">
                            {item.firstName} {item.lastName}
                          </span>
                          <span className="max-w-full whitespace-normal break-all text-xs leading-snug text-muted-foreground">
                            {item.medicalRecordNumber ??
                              item.documentNumber ??
                              "—"}
                          </span>
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden @min-[1300px]/clinical-board:table-cell">
                      <span className="block max-w-48 truncate">
                        {item.primaryDiagnosisDescription ??
                          item.primaryDiagnosisCode ??
                          t("Sin diagnóstico")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden @min-[1300px]/clinical-board:table-cell">
                      {item.stateName ?? item.stateCode ?? t("Sin asignar")}
                    </TableCell>
                    <TableCell className="hidden @min-[900px]/clinical-board:table-cell">
                      {item.insurerName ?? t("Sin aseguradora")}
                    </TableCell>
                    <TableCell>
                      {item.riskLevel ? (
                        <span
                          style={rainbowStyle(RISK_TONES[item.riskLevel])}
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            "spectrum-tag",
                          )}
                        >
                          {riskLabel(item.riskLevel)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {t("Sin evaluaciones")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.activeAlertCount > 0 ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                            item.maxAlertSeverity === "critical"
                              ? "text-destructive"
                              : "text-warning",
                          )}
                        >
                          <BellRing className="size-3.5" aria-hidden="true" />
                          {item.activeAlertCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden @min-[700px]/clinical-board:table-cell">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm">
                          {formatDate(item.lastEvaluationAt)}
                        </span>
                        {item.lastEvaluationInstrument ? (
                          <span className="max-w-44 truncate text-xs text-muted-foreground">
                            {item.lastEvaluationInstrument}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden @min-[1300px]/clinical-board:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-sm",
                          item.followUpState === "vencido" &&
                            "font-semibold text-destructive",
                        )}
                      >
                        <CalendarClock
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        {formatDate(item.nextEvaluationDueAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        style={rainbowStyle(
                          FOLLOW_UP_TONES[item.followUpState],
                        )}
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          "spectrum-tag",
                        )}
                      >
                        {followUpLabel(item.followUpState)}
                      </span>
                      {item.nextEvaluationDueAt && (
                        <span className="mt-1 block text-xs text-muted-foreground @min-[1300px]/clinical-board:hidden">
                          {formatDate(item.nextEvaluationDueAt)}
                        </span>
                      )}
                    </TableCell>
                    {fullScope ? (
                      <TableCell className="hidden @min-[1300px]/clinical-board:table-cell">
                        <span className="block max-w-40 truncate">
                          {item.professionalNames.length > 0
                            ? item.professionalNames.join(", ")
                            : t("Sin asignar")}
                        </span>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {canEdit && item.status !== "Pendiente" ? (
                        <PatientStatusToggle
                          patient={{
                            id: item.patientId,
                            firstName: item.firstName,
                            lastName: item.lastName,
                            status: item.status,
                          }}
                          onChanged={refresh}
                        />
                      ) : (
                        <StatusBadge
                          status={t(item.status)}
                          color={statusColor(item.status)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {can("Program.View") && (
                        <Button
                          variant="outline"
                          className="mr-2 min-h-11"
                          render={<Link href={`/patients/${encodeURIComponent(item.patientId)}/360`} />}
                          nativeButton={false}
                        >
                          {t("Perfil 360")}
                          <span className="sr-only"> · {item.firstName} {item.lastName}</span>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("Acciones para {name}", {
                                name: `${item.firstName} ${item.lastName}`,
                              })}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/patients/${item.patientId}`)
                            }
                          >
                            <Eye aria-hidden="true" />
                            {t("Ver ficha")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/health-tests/pacientes/${item.patientId}`,
                              )
                            }
                          >
                            <ClipboardList aria-hidden="true" />
                            {t("Ver evaluaciones")}
                          </DropdownMenuItem>
                          {canEdit || canDelete ? (
                            <DropdownMenuSeparator />
                          ) : null}
                          {canEdit ? (
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/patients/${item.patientId}/edit`)
                              }
                            >
                              <Pencil aria-hidden="true" />
                              {t("Editar")}
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(item);
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                              {t("Eliminar")}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground">
              <span>
                {t("Página")} {result.page} {t("de")} {result.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="comfortable"
                  disabled={result.page <= 1 || loading}
                  onClick={() => setPage(result.page - 1)}
                >
                  {t("Anterior")}
                </Button>
                <Button
                  variant="outline"
                  size="comfortable"
                  disabled={result.page >= result.totalPages || loading}
                  onClick={() => setPage(result.page + 1)}
                >
                  {t("Siguiente")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar paciente?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Se eliminará el registro de {name}. Esta acción no se puede deshacer.",
                {
                  name: `${deleting?.firstName ?? ""} ${deleting?.lastName ?? ""}`,
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>
              {t("Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
