"use client";

import { useT } from "@/providers/i18n-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardList,
  Eye,
  FileUp,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { useAppContext } from "@/providers/context-provider";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { StatCard } from "@/components/feedback/stat-card";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePatients } from "../hooks/use-patients";
import { usePatientDashboard } from "../hooks/use-patient-dashboard";
import { PatientStatusToggle } from "./patient-status-toggle";
import { PatientSummaryView } from "./patient-summary-view";
import { PatientGeoView } from "./patient-geo-view";
import { ClinicalBoardView } from "./clinical-board-view";
import type { PatientListItem, PatientSortKey } from "../types";

/** Preferencia de vista (tabla vs cards) persistida en el navegador. */
const VIEW_KEY = "patients-view-mode";
type PatientViewMode = "table" | "cards";

/**
 * Directorio de pacientes con el lenguaje visual del módulo de Citas, en el
 * azul de la plataforma (navy). Router declarativo por permisos: con
 * Patients.View se presenta la vista global (todos los pacientes +
 * profesionales asignados); con solo Patients.ViewOwn, "Mis pacientes" (los
 * datos ya vienen scoped por el backend desde el JWT — aquí solo se adapta
 * la presentación).
 */
/**
 * Directorio de pacientes (tab del dashboard): stats scoped, filtros
 * combinables, tabla/tarjetas con toggle de estado inline. `stateCode` llega
 * de la selección del mapa y filtra server-side.
 */
function PatientsDirectory({ stateCode }: { stateCode: string | null }) {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const {
    result,
    stats,
    statsError,
    filters,
    insurers,
    loading,
    error,
    actionLoading,
    fullScope,
    setFilters,
    setSort,
    setPage,
    remove,
    retry,
  } = usePatients(10, stateCode);
  const [deleting, setDeleting] = useState<PatientListItem | undefined>();

  /** Refresco para el toggle de estado: true cuando el listado se recargó. */
  const refreshDirectory = async () => {
    await retry();
    return true;
  };
  const [view, setView] = useState<PatientViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return window.localStorage.getItem(VIEW_KEY) === "cards"
      ? "cards"
      : "table";
  });

  const canCreate = can("Patients.Create");
  const canEdit = can("Patients.Update");
  const canDelete = can("Patients.Delete");

  const openCreate = () => router.push("/people/new?context=patient");
  const openDetail = (patient: PatientListItem) =>
    router.push(`/patients/${patient.id}`);
  const openEdit = (patient: PatientListItem) =>
    router.push(`/patients/${patient.id}/edit`);

  const changeView = (next: PatientViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  const isFiltered =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.insurerId !== "all";

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards en el azul de la plataforma (navy), scoped por el backend. */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          fullScope ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <StatCard
          label={fullScope ? "Total de pacientes" : "Mis pacientes"}
          value={stats ? String(stats.total) : "—"}
          icon={Users}
          variant="primary"
          context={fullScope ? "Directorio completo" : "A tu cargo"}
        />
        <StatCard
          label={t("Activos")}
          value={stats ? String(stats.active) : "—"}
          icon={UserCheck}
          variant="success"
          context={t("En seguimiento activo")}
        />
        <StatCard
          label={t("Nuevos este mes")}
          value={stats ? String(stats.newThisMonth) : "—"}
          icon={UserPlus}
          variant="info"
          context={t("Registrados en el mes")}
        />
        {fullScope && (
          <StatCard
            label={t("Sin profesional asignado")}
            value={stats ? String(stats.withoutProfessional) : "—"}
            icon={UserRoundX}
            variant="warning"
            context={t("Requieren asignación")}
          />
        )}
      </div>

      {statsError && (
        <p
          className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground"
          role="alert"
        >
          No pudimos cargar las estadísticas: {statsError}
        </p>
      )}

      {/* Filtros con header navy e icono, toggle de vista y actualizar. */}
      <section
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        aria-label={t("Filtros de pacientes")}
      >
        <SectionHeader
          title={fullScope ? "Directorio de pacientes" : "Directorio"}
          description={t("Busca por nombre, documento o correo electrónico")}
          icon={SlidersHorizontal}
          variant="primary"
          actions={
            <>
              <ToggleGroup
                value={[view]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next === "table" || next === "cards") changeView(next);
                  else changeView(view);
                }}
                aria-label={t("Cambiar vista de los registros")}
              >
                <ToggleGroupItem
                  value="table"
                  aria-label={t("Vista tabla")}
                  className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                >
                  <Rows3 />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="cards"
                  aria-label={t("Vista tarjetas")}
                  className="data-pressed:bg-white data-pressed:text-[var(--sidebar)]"
                >
                  <LayoutGrid />
                </ToggleGroupItem>
              </ToggleGroup>
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
                Actualizar
              </Button>
            </>
          }
        />
        <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_220px] sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder={t("Buscar paciente...")}
              aria-label={t("Buscar pacientes")}
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters({ status: (value ?? "all") as typeof filters.status })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por estado")}
            >
              <SelectValue>
                {filters.status === "all"
                  ? "Todos los estados"
                  : filters.status}
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
              className="w-full"
              aria-label={t("Filtrar por aseguradora")}
            >
              <SelectValue>
                {filters.insurerId === "all"
                  ? "Todas las aseguradoras"
                  : (insurers.find((i) => i.id === filters.insurerId)?.name ??
                    "Todas las aseguradoras")}
              </SelectValue>
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
        </div>
      </section>

      {error && !result ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          {error && (
            <p
              className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {loading && !result ? (
            <PatientsSkeleton fullScope={fullScope} view={view} />
          ) : result?.data.length ? (
            view === "table" ? (
              <PatientTable
                patients={result.data}
                fullScope={fullScope}
                sortBy={filters.sortBy ?? "createdAt"}
                sortDir={filters.sortDir ?? "desc"}
                canEdit={canEdit}
                canDelete={canDelete}
                onSort={setSort}
                onOpen={openDetail}
                onEdit={openEdit}
                onDelete={setDeleting}
                onStatusChanged={refreshDirectory}
              />
            ) : (
              <PatientCards
                patients={result.data}
                fullScope={fullScope}
                canEdit={canEdit}
                canDelete={canDelete}
                onOpen={openDetail}
                onEdit={openEdit}
                onDelete={setDeleting}
                onStatusChanged={refreshDirectory}
              />
            )
          ) : (
            <EmptyState
              filtered={isFiltered}
              canCreate={canCreate}
              onCreate={openCreate}
            />
          )}
          {result && result.total > 0 && (
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              pageSize={result.pageSize}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el registro de {deleting?.firstName}{" "}
              {deleting?.lastName}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
                setDeleting(undefined);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const PATIENT_TABS = [
  { value: "resumen", label: "Vista general", icon: LayoutDashboard },
  { value: "mapa", label: "Mapa geográfico", icon: MapPin },
  { value: "estado-clinico", label: "Estado clínico", icon: ClipboardList },
  { value: "directorio", label: "Directorio", icon: UserRound },
] as const;

type PatientTab = (typeof PATIENT_TABS)[number]["value"];

const TAB_VALUES = new Set<string>(PATIENT_TABS.map((tab) => tab.value));

/** Tab inicial desde la URL (`?tab=`), con fallback a Vista general. */
function readInitialTab(): PatientTab {
  if (typeof window === "undefined") return "resumen";
  const value = new URLSearchParams(window.location.search).get("tab");
  return value && TAB_VALUES.has(value) ? (value as PatientTab) : "resumen";
}

/** Estado seleccionado en el mapa (`?state=CA`), compartido con el Directorio. */
function readInitialState(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("state");
  return value ? value.trim().toUpperCase() : null;
}

/**
 * Dashboard general de pacientes: cuatro secciones enlazables por `?tab=`
 * (deep-link y compartición), con el filtro de estado del mapa compartido por
 * URL entre Vista general, Mapa y Directorio. Vista general y Mapa comparten
 * una sola carga de agregados.
 */
export function PatientsPage() {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const [tab, setTabState] = useState<PatientTab>(readInitialTab);
  const [stateCode, setStateCodeState] = useState<string | null>(
    readInitialState,
  );
  const dashboard = usePatientDashboard(stateCode);

  const canCreate = can("Patients.Create");
  const fullScope = can("Patients.View");
  const canView = fullScope || can("Patients.ViewOwn");

  const updateUrl = (nextTab: PatientTab, nextState: string | null) => {
    const params = new URLSearchParams();
    if (nextTab !== "resumen") params.set("tab", nextTab);
    if (nextState) params.set("state", nextState);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/patients?${query}` : "/patients",
    );
  };

  const setTab = (value: PatientTab) => {
    setTabState(value);
    updateUrl(value, stateCode);
  };

  const setStateCode = (value: string | null) => {
    setStateCodeState(value);
    updateUrl(tab, value);
  };

  if (!canView) {
    return (
      <div className="p-6">
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
          {t("No tienes permiso para ver el módulo de pacientes.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={fullScope ? t("Pacientes") : t("Mis pacientes")}
        description={t(
          "Gestión completa · seguimiento clínico · mapa geográfico EE. UU.",
        )}
        icon={UserRound}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/people/importar")}
              >
                <FileUp data-icon="inline-start" />
                {t("Importar CSV")}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/people/new?context=patient")}
              >
                <Plus data-icon="inline-start" />
                {t("Nuevo paciente")}
              </Button>
            </div>
          ) : undefined
        }
      />

      {stateCode && tab !== "estado-clinico" && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <MapPin aria-hidden className="size-3.5" />
            {t("Filtrado por estado")}: {stateCode}
            <button
              type="button"
              onClick={() => setStateCode(null)}
              aria-label={t("Quitar filtro de estado")}
              className="rounded-full p-0.5 hover:bg-primary/10"
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      <nav
        role="tablist"
        aria-label={t("Secciones de pacientes")}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {PATIENT_TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(item.value)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--sidebar)] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {t(item.label)}
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        aria-label={t(
          PATIENT_TABS.find((item) => item.value === tab)?.label ?? "",
        )}
      >
        {tab === "resumen" && (
          <PatientSummaryView
            data={dashboard.data}
            loading={dashboard.loading}
            error={dashboard.error}
            months={dashboard.months}
            onMonthsChange={dashboard.setMonths}
            onRetry={dashboard.retry}
          />
        )}
        {tab === "mapa" && (
          <PatientGeoView
            states={dashboard.data?.states ?? []}
            selected={stateCode}
            onSelect={setStateCode}
            loading={dashboard.loading && !dashboard.data}
          />
        )}
        {tab === "estado-clinico" && <ClinicalBoardView />}
        {tab === "directorio" && <PatientsDirectory stateCode={stateCode} />}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: PatientSortKey;
  activeKey: PatientSortKey;
  dir: "asc" | "desc";
  onSort: (key: PatientSortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const SortIcon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label}`}
        title={`Ordenar por ${label}`}
        className={cn(
          "inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
          active ? "text-white" : "text-white/80 hover:text-white",
        )}
      >
        {label}
        <SortIcon className="size-3.5" />
      </button>
    </TableHead>
  );
}

function PatientTable({
  patients,
  fullScope,
  sortBy,
  sortDir,
  canEdit,
  canDelete,
  onSort,
  onOpen,
  onEdit,
  onDelete,
  onStatusChanged,
}: {
  patients: PatientListItem[];
  fullScope: boolean;
  sortBy: PatientSortKey;
  sortDir: "asc" | "desc";
  canEdit: boolean;
  canDelete: boolean;
  onSort: (key: PatientSortKey) => void;
  onOpen: (patient: PatientListItem) => void;
  onEdit: (patient: PatientListItem) => void;
  onDelete: (patient: PatientListItem) => void;
  onStatusChanged: () => Promise<boolean>;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${patients.length} pacientes visibles`}
        description={fullScope ? "Directorio clínico" : "Pacientes a tu cargo"}
        icon={UserRound}
        variant="primary"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader
              label={t("Paciente")}
              sortKey="firstName"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label={t("Documento")}
              sortKey="documentNumber"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label={t("Contacto")}
              sortKey="phoneNumber"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
              className="hidden lg:table-cell"
            />
            <SortableHeader
              label={t("Aseguradora")}
              sortKey="insurerName"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            <SortableHeader
              label={t("Clínica")}
              sortKey="clinicName"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
              className="hidden xl:table-cell"
            />
            <TableHead className="hidden lg:table-cell">
              {t("Diagnóstico")}
            </TableHead>
            <TableHead className="hidden xl:table-cell">
              {t("Ubicación")}
            </TableHead>
            {fullScope && (
              <TableHead className="hidden xl:table-cell">
                Profesional
              </TableHead>
            )}
            <SortableHeader
              label={t("Estado")}
              sortKey="status"
              activeKey={sortBy}
              dir={sortDir}
              onSort={onSort}
            />
            <TableHead className="w-10">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onOpen(patient)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {patient.gender ?? "Sin género"} ·{" "}
                      {getAge(patient.dateOfBirth)} años
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">
                  {patient.documentNumber ?? patient.medicalRecordNumber ?? "—"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {patient.documentTypeName ?? "MRN"}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="block text-sm">
                  {formatPhone(patient) ?? "—"}
                </span>
                <span className="block max-w-44 truncate text-xs text-muted-foreground">
                  {patient.email ?? "—"}
                </span>
              </TableCell>
              <TableCell className="hidden text-sm md:table-cell">
                {patient.insurerName ?? "Sin aseguradora"}
              </TableCell>
              <TableCell className="hidden text-sm xl:table-cell">
                {patient.clinicName ?? "Sin asignar"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="block max-w-44 truncate text-sm">
                  {patient.primaryDiagnosisDescription ??
                    patient.primaryDiagnosisCode ??
                    t("Sin diagnóstico")}
                </span>
              </TableCell>
              <TableCell className="hidden text-sm xl:table-cell">
                {patient.stateCode ?? t("Sin asignar")}
              </TableCell>
              {fullScope && (
                <TableCell className="hidden xl:table-cell">
                  {patient.professionalNames.length > 0 ? (
                    <span className="line-clamp-2 max-w-44 text-sm">
                      {patient.professionalNames.join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sin asignar
                    </span>
                  )}
                </TableCell>
              )}
              <TableCell>
                {canEdit && patient.status !== "Pendiente" ? (
                  <PatientStatusToggle
                    patient={patient}
                    onChanged={onStatusChanged}
                  />
                ) : (
                  <StatusBadge
                    status={patient.status}
                    color={statusColor(patient.status)}
                  />
                )}
              </TableCell>
              <TableCell>
                <ActionsMenu
                  patient={patient}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PatientCards({
  patients,
  fullScope,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
  onStatusChanged,
}: {
  patients: PatientListItem[];
  fullScope: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (patient: PatientListItem) => void;
  onEdit: (patient: PatientListItem) => void;
  onDelete: (patient: PatientListItem) => void;
  onStatusChanged: () => Promise<boolean>;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${patients.length} pacientes visibles`}
        description={fullScope ? "Directorio clínico" : "Pacientes a tu cargo"}
        icon={UserRound}
        variant="primary"
      />
      <div className="grid grid-cols-1 gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {patients.map((patient) => (
          <article
            key={patient.id}
            className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                className="flex min-w-0 items-center gap-3 text-left"
                onClick={() => onOpen(patient)}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {patient.firstName[0]}
                  {patient.lastName[0]}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {patient.gender ?? "Sin género"} ·{" "}
                    {getAge(patient.dateOfBirth)} años
                  </span>
                </span>
              </button>
              <ActionsMenu
                patient={patient}
                canEdit={canEdit}
                canDelete={canDelete}
                onOpen={onOpen}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">{t("Documento")}</span>
                <span className="truncate font-medium">
                  {patient.documentNumber ?? patient.medicalRecordNumber ?? "—"}
                </span>
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">
                  {t("Aseguradora")}
                </span>
                <span className="truncate font-medium">
                  {patient.insurerName ?? "Sin aseguradora"}
                </span>
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">{t("Contacto")}</span>
                <span className="truncate font-medium">
                  {formatPhone(patient) ?? patient.email ?? "—"}
                </span>
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">{t("Clínica")}</span>
                <span className="truncate font-medium">
                  {patient.clinicName ?? "Sin asignar"}
                </span>
              </span>
              {fullScope && (
                <span className="flex flex-col gap-px">
                  <span className="text-muted-foreground">
                    {t("Profesional")}
                  </span>
                  <span className="line-clamp-1 font-medium">
                    {patient.professionalNames.length > 0
                      ? patient.professionalNames.join(", ")
                      : "Sin asignar"}
                  </span>
                </span>
              )}
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">
                  {t("Diagnóstico")}
                </span>
                <span className="truncate font-medium">
                  {patient.primaryDiagnosisDescription ??
                    patient.primaryDiagnosisCode ??
                    t("Sin diagnóstico")}
                </span>
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">{t("Ubicación")}</span>
                <span className="truncate font-medium">
                  {patient.stateCode ?? t("Sin asignar")}
                </span>
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-muted-foreground">{t("Estado")}</span>
                <span>
                  {canEdit && patient.status !== "Pendiente" ? (
                    <PatientStatusToggle
                      patient={patient}
                      onChanged={onStatusChanged}
                    />
                  ) : (
                    <StatusBadge
                      status={patient.status}
                      color={statusColor(patient.status)}
                    />
                  )}
                </span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ActionsMenu({
  patient,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
}: {
  patient: PatientListItem;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (patient: PatientListItem) => void;
  onEdit: (patient: PatientListItem) => void;
  onDelete: (patient: PatientListItem) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${patient.firstName} ${patient.lastName}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(patient)}>
          <Eye />
          Ver detalles
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(patient)}>
            <Pencil />
            Editar
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(patient)}
            >
              <Trash2 />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PatientsSkeleton({
  fullScope,
  view,
}: {
  fullScope: boolean;
  view: PatientViewMode;
}) {
  const statCount = fullScope ? 4 : 3;
  return (
    <div className="flex flex-col gap-6">
      <div
        className={`grid grid-cols-1 gap-4 ${
          fullScope ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {Array.from({ length: statCount }).map((_, index) => (
          <Skeleton key={index} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
      {view === "table" ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="flex items-center gap-4 border-b border-border py-4 last:border-0"
              key={index}
            >
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="hidden h-4 w-28 md:block" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[190px] rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  filtered,
  canCreate,
  onCreate,
}: {
  filtered: boolean;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <UserRound className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">
          {filtered
            ? "Sin resultados con los filtros"
            : "No encontramos pacientes"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {filtered
            ? "Prueba con otros términos o quita algún filtro."
            : "Registra el primer paciente para comenzar."}
        </p>
      </div>
      {canCreate && !filtered && (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Nuevo paciente
        </Button>
      )}
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar el directorio
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        Mostrando {from}–{to} de {total} pacientes
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function getAge(date: string | null) {
  if (!date) return "—";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()))
    age -= 1;
  return Math.max(0, age);
}

function formatPhone(patient: PatientListItem): string | null {
  if (!patient.phoneNumber) return null;
  return patient.phoneCountryCode
    ? `+${patient.phoneCountryCode} ${patient.phoneNumber}`
    : patient.phoneNumber;
}

function statusColor(status: PatientListItem["status"]) {
  const colors = {
    Activo: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    Pendiente: {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    Inactivo: {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
  };
  return (
    colors[status] ?? {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    }
  );
}
