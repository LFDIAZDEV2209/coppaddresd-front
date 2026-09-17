"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  Inbox,
  LayoutGrid,
  ListFilter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Table as TableIcon,
  Timer,
  User,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/feedback/stat-card";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useScopedAppointments, useScopedSummary } from "../hooks/use-admin";
import { toggleActiveOnDarkClass } from "./dashboard/range-toggle";
import {
  appointmentStatusColor,
  appointmentStatusLabel,
  formatRange,
} from "../utils/format";
import {
  fetchOrganizationTree,
  fetchPatients,
  fetchProfessionalsCatalog,
  fetchSpecialties,
} from "../services/reference-service";
import { fetchMyContext } from "@/lib/api/context-service";
import type { AdminAppointmentsFilters } from "../services/appointments-service";
import type {
  AppointmentStatus,
  ProfessionalCatalogItemDto,
  SpecialtyDto,
} from "../types";
import type { PatientListItem } from "../services/reference-service";

type ViewMode = "table" | "cards";
type SortKey =
  | "patientName"
  | "professionalName"
  | "specialtyName"
  | "scheduledStart"
  | "locationName"
  | "status";
type SortDir = "asc" | "desc";

const ALL = "all";

interface AppointmentFilters {
  status: string;
  professionalId: string;
  patientId: string;
  locationId: string;
  from: string;
  to: string;
}

const emptyFilters: AppointmentFilters = {
  status: "",
  professionalId: "",
  patientId: "",
  locationId: "",
  from: "",
  to: "",
};

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "Requested", label: "Solicitada" },
  { value: "Confirmed", label: "Confirmada" },
  { value: "InProgress", label: "En curso" },
  { value: "Completed", label: "Completada" },
  { value: "Cancelled", label: "Cancelada" },
  { value: "NoShow", label: "No asistió" },
];

function initials(name: string | null): string {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function initialsColor(name: string | null): string {
  const palette = [
    "bg-[var(--sidebar)] text-white",
    "bg-success-soft text-success",
    "bg-warning-soft text-warning",
    "bg-info-soft text-info",
    "bg-destructive-soft text-destructive",
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}

interface FilterCatalogs {
  professionals: ProfessionalCatalogItemDto[];
  patients: PatientListItem[];
  specialties: SpecialtyDto[];
  locations: Array<{ id: string; name: string }>;
}

function useAppointmentFilterCatalogs(
  scope: "admin" | "professional",
): FilterCatalogs | null {
  const [catalogs, setCatalogs] = useState<FilterCatalogs | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // En alcance profesional el filtro por profesional no existe (los datos
        // ya van acotados por identidad) y el árbol de organizaciones exige
        // Organizations.View (403 para profesionales): las sedes salen de su
        // propio contexto (/me/context), solo sus clínicas asignadas.
        const [professionals, patients, specialties, locations] =
          scope === "professional"
            ? await Promise.all([
                Promise.resolve<ProfessionalCatalogItemDto[]>([]),
                fetchPatients(),
                fetchSpecialties(),
                fetchMyContext().then((context) =>
                  context.clinics.flatMap((clinic) => clinic.locations),
                ),
              ])
            : await Promise.all([
                fetchProfessionalsCatalog({ page: 1, pageSize: 100 }).then(
                  (result) => result.data,
                ),
                fetchPatients(),
                fetchSpecialties(),
                fetchOrganizationTree().then((orgs) =>
                  orgs.flatMap((org) =>
                    org.clinics.flatMap((clinic) => clinic.locations),
                  ),
                ),
              ]);
        if (!active) return;
        setCatalogs({
          professionals,
          patients: patients.data,
          specialties,
          locations,
        });
      } catch {
        if (!active) return;
        setCatalogs(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [scope]);

  return catalogs;
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
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
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

/**
 * Listado de citas de telemedicina: KPIs operativos en una línea, panel de
 * filtros con cabecera azul (estado, profesional, paciente, sede, rango de
 * fechas) + búsqueda local, vista alterna tabla/tarjetas con ordenamiento por
 * columna y paginación.
 *
 * <c>scope="admin"</c> (default): datos globales de /admin/summary y
 * /admin/appointments. <c>scope="professional"</c>: mismo diseño, pero los
 * datos salen de /me/summary y /me/appointments (acotados por identidad del
 * JWT) y el filtro por profesional desaparece.
 */
export function AdminAppointments({
  scope = "admin",
}: {
  scope?: "admin" | "professional";
}) {
  const t = useT();
  const isProfessional = scope === "professional";
  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<AppointmentFilters>(emptyFilters);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scheduledStart");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const catalogs = useAppointmentFilterCatalogs(scope);

  const serverFilters = useMemo<AdminAppointmentsFilters>(
    () => ({
      professionalId: filters.professionalId || undefined,
      patientId: filters.patientId || undefined,
      locationId: filters.locationId || undefined,
      status: filters.status || undefined,
      from: filters.from ? `${filters.from}T00:00:00` : undefined,
      to: filters.to ? `${filters.to}T23:59:59` : undefined,
    }),
    [filters],
  );

  const { items, total, page, pageSize, totalPages, loading, error, setPage } =
    useScopedAppointments(scope, serverFilters);
  const { summary } = useScopedSummary(scope);

  const hasServerFilters = Object.values(filters).some(Boolean);
  const hasSearch = search.trim() !== "";
  const hasActiveFilters = hasServerFilters || hasSearch;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = items;
    if (query) {
      list = list.filter((appointment) =>
        [
          appointment.patientName,
          appointment.professionalName,
          appointment.specialtyName,
          appointment.locationName,
        ].some((value) => value?.toLowerCase().includes(query)),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return String(av).localeCompare(String(bv), "es") * dir;
    });
  }, [items, search, sortKey, sortDir]);

  const updateFilter = useCallback(
    (patch: Partial<AppointmentFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
      setPage(1);
    },
    [setPage],
  );

  const clearAll = useCallback(() => {
    setFilters(emptyFilters);
    setSearch("");
    setPage(1);
  }, [setPage]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const rowStart = items.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const rowEnd = (page - 1) * pageSize + items.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Citas")}
        description={
          isProfessional
            ? t("Mis citas de telemedicina")
            : t("Todas las citas de telemedicina")
        }
        icon={CalendarDays}
        leadingVisual={
          <AnimatedIcon name="medical-kit" size={40} motion={false} />
        }
        actions={
          <ToggleGroup
            value={[view]}
            onValueChange={(values) => {
              const next = values[0] as ViewMode | undefined;
              if (next) setView(next);
            }}
            size="sm"
            variant="outline"
            aria-label={t("Cambiar vista de las citas")}
          >
            <ToggleGroupItem
              value="table"
              aria-label={t("Vista de tabla")}
              className={cn(
                view === "table"
                  ? toggleActiveOnDarkClass
                  : "border-transparent bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground",
              )}
            >
              <TableIcon className="size-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="cards"
              aria-label={t("Vista de tarjetas")}
              className={cn(
                view === "cards"
                  ? toggleActiveOnDarkClass
                  : "border-transparent bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* KPIs operativos: una sola fila en desktop, colapso progresivo. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          filled
          label={t("Citas de hoy")}
          value={summary ? String(summary.appointmentsToday) : "—"}
          icon={CalendarCheck}
          variant="primary"
          context={
            summary && summary.activeSessions > 0
              ? `${summary.activeSessions} sesiones activas`
              : undefined
          }
        />
        <StatCard
          label={t("Citas pendientes")}
          value={summary ? String(summary.appointmentsPending) : "—"}
          icon={CalendarClock}
          variant="warning"
          context={t("Requieren confirmación")}
        />
        <StatCard
          label={t("Citas completadas")}
          value={summary ? String(summary.appointmentsCompleted) : "—"}
          icon={CheckCircle2}
          variant="success"
          context={t("Sesiones finalizadas")}
        />
        <StatCard
          label={t("Solicitudes pendientes")}
          value={summary ? String(summary.requestsPending) : "—"}
          icon={Inbox}
          context={t("Nuevas solicitudes por revisar")}
          variant="info"
        />
        <StatCard
          label={t("Sesiones activas")}
          value={summary ? String(summary.activeSessions) : "—"}
          icon={Video}
          variant="default"
          context={t("Videollamadas en curso")}
        />
        <StatCard
          label={t("Alertas sin leer")}
          value={summary ? String(summary.alertsUnread) : "—"}
          icon={Bell}
          variant="destructive"
          context={
            summary && summary.alertsUnread > 0
              ? t("Revisar centro de alertas")
              : undefined
          }
        />
      </div>

      {/* Panel de filtros: cabecera azul con iconos + controles. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 bg-[var(--sidebar)] px-4 py-2.5">
          <div className="flex items-center gap-2 text-primary-foreground">
            <SlidersHorizontal className="size-4" />
            <span className="text-[13px] font-semibold tracking-wide">
              {t("Filtros")}
            </span>
          </div>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
              {activeFilterCount} activo
              {activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={!hasActiveFilters}
              className={cn(
                "border-transparent transition-colors",
                hasActiveFilters
                  ? "bg-white text-[var(--sidebar)] hover:bg-white/90 hover:text-[var(--sidebar)]"
                  : "bg-white/10 text-white/60 hover:bg-white/10 hover:text-white/60",
              )}
            >
              <RotateCcw className="size-3.5" data-icon="inline-start" />
              Limpiar
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar citas…")}
                className="pl-9"
                aria-label={t("Buscar citas")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.status || ALL}
                onValueChange={(value) =>
                  updateFilter({ status: value === ALL ? "" : (value ?? "") })
                }
              >
                <SelectTrigger
                  className="w-[186px]"
                  aria-label={t("Filtrar por estado")}
                >
                  <ListFilter className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={t("Estado")}>
                    {(value) =>
                      value === ALL
                        ? t("Todos los estados")
                        : t(
                            statusOptions.find(
                              (option) => option.value === value,
                            )?.label ?? value,
                          )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>
                      {t("Todos los estados")}
                    </SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.label)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {!isProfessional && (
                <Select
                  value={filters.professionalId || ALL}
                  onValueChange={(value) =>
                    updateFilter({
                      professionalId: value === ALL ? "" : (value ?? ""),
                    })
                  }
                >
                  <SelectTrigger
                    className="w-[246px]"
                    aria-label={t("Filtrar por profesional")}
                  >
                    <Stethoscope className="size-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder={t("Profesional")}>
                      {(value) =>
                        value === ALL
                          ? t("Todos los profesionales")
                          : ((catalogs?.professionals ?? []).find(
                              (professional) => professional.id === value,
                            )?.fullName ?? value)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={ALL}>
                        {t("Todos los profesionales")}
                      </SelectItem>
                      {(catalogs?.professionals ?? []).map((professional) => (
                        <SelectItem
                          key={professional.id}
                          value={professional.id}
                        >
                          {professional.fullName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              <Select
                value={filters.patientId || ALL}
                onValueChange={(value) =>
                  updateFilter({
                    patientId: value === ALL ? "" : (value ?? ""),
                  })
                }
              >
                <SelectTrigger
                  className="w-[216px]"
                  aria-label={t("Filtrar por paciente")}
                >
                  <User className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={t("Paciente")}>
                    {(value) => {
                      if (value === ALL) return t("Todos los pacientes");
                      const patient = (catalogs?.patients ?? []).find(
                        (item) => item.id === value,
                      );
                      return patient
                        ? [patient.firstName, patient.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>
                      {t("Todos los pacientes")}
                    </SelectItem>
                    {(catalogs?.patients ?? []).map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {[patient.firstName, patient.lastName]
                          .filter(Boolean)
                          .join(" ")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={filters.locationId || ALL}
                onValueChange={(value) =>
                  updateFilter({
                    locationId: value === ALL ? "" : (value ?? ""),
                  })
                }
              >
                <SelectTrigger
                  className="w-[206px]"
                  aria-label={t("Filtrar por sede")}
                >
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={t("Sede")}>
                    {(value) =>
                      value === ALL
                        ? t("Todas las sedes")
                        : ((catalogs?.locations ?? []).find(
                            (location) => location.id === value,
                          )?.name ?? value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>{t("Todas las sedes")}</SelectItem>
                    {(catalogs?.locations ?? []).map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(event) =>
                      updateFilter({ from: event.target.value })
                    }
                    className="w-[172px] pl-8"
                    aria-label={t("Desde")}
                  />
                </div>
                <ArrowRight
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(event) =>
                      updateFilter({ to: event.target.value })
                    }
                    className="w-[172px] pl-8"
                    aria-label={t("Hasta")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Listado: tabla o tarjetas según la vista elegida. */}
      {loading ? (
        view === "table" ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        )
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--sidebar)]">
            <CalendarDays className="size-6 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilters ? t("Sin resultados") : t("No hay citas")}
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              {hasActiveFilters
                ? t("Ninguna cita coincide con los filtros aplicados.")
                : t("Cuando existan citas de telemedicina aparecerán aquí.")}
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              <RotateCcw className="size-3.5" data-icon="inline-start" />
              {t("Limpiar filtros")}
            </Button>
          )}
        </div>
      ) : view === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--sidebar)] hover:bg-[var(--sidebar)]">
                <SortableHeader
                  label={t("Paciente")}
                  sortKey="patientName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("Profesional")}
                  sortKey="professionalName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("Especialidad")}
                  sortKey="specialtyName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("Fecha y hora")}
                  sortKey="scheduledStart"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("Sede")}
                  sortKey="locationName"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("Estado")}
                  sortKey="status"
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <TableHead className="text-right text-white/80 uppercase">
                  {t("Acción")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="transition-colors odd:bg-surface/50 hover:bg-surface/80"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarFallback
                          className={cn(
                            "text-[10px] font-semibold",
                            initialsColor(appointment.patientName),
                          )}
                        >
                          {initials(appointment.patientName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">
                        {appointment.patientName ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Stethoscope className="size-3.5 text-primary" />
                      {appointment.professionalName ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <GraduationCap className="size-3.5 text-primary" />
                      {appointment.specialtyName ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3.5 text-primary" />
                      {formatRange(
                        appointment.scheduledStart,
                        appointment.scheduledEnd,
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-3.5 text-primary" />
                      {appointment.locationName ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={appointmentStatusLabel[appointment.status]}
                      color={appointmentStatusColor(appointment.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/appointments/citas/${appointment.id}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: "ghost",
                      })}
                    >
                      <Eye className="size-3.5" />
                      {t("Ver")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((appointment, index) => {
            const color = appointmentStatusColor(appointment.status);
            return (
              <article
                key={appointment.id}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md animate-in fade-in-0 zoom-in-95"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback
                        className={cn(
                          "text-[13px] font-semibold",
                          initialsColor(appointment.patientName),
                        )}
                      >
                        {initials(appointment.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[13.5px] font-semibold text-foreground">
                        {appointment.patientName ?? "—"}
                      </span>
                      <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Stethoscope className="size-3" />
                        <span className="truncate">
                          {appointment.professionalName ?? "—"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <StatusBadge
                    status={appointmentStatusLabel[appointment.status]}
                    color={color}
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-3.5 text-primary" />
                    {appointment.specialtyName ?? "—"}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    {appointment.locationName ?? "—"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="size-3.5 text-primary" />
                    {formatRange(
                      appointment.scheduledStart,
                      appointment.scheduledEnd,
                    )}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <Timer className="size-3.5" />
                    {t("{n} min", { n: String(appointment.durationMinutes) })}
                  </span>
                  <Link
                    href={`/appointments/citas/${appointment.id}`}
                    className={cn(
                      buttonVariants({
                        size: "sm",
                        variant: "outline",
                      }),
                      "border-primary/40 text-primary-strong hover:bg-primary-soft hover:border-primary/60",
                    )}
                  >
                    <Video className="size-3.5" />
                    {t("Ver detalle")}
                    <ChevronRight className="size-3.5" data-icon="inline-end" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Paginación + resumen de resultados. */}
      {totalPages > 1 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <User className="size-3.5" />
            {hasSearch
              ? t("{count} de {total} citas", {
                  count: String(visibleItems.length),
                  total: String(total),
                })
              : t("Mostrando {from}–{to} de {total} citas", {
                  from: String(rowStart),
                  to: String(rowEnd),
                  total: String(total),
                })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-3.5" data-icon="inline-start" />
              {t("Anterior")}
            </Button>
            <span className="text-[12px] text-muted-foreground">
              {t("Página {page} de {totalPages}", {
                page: String(page),
                totalPages: String(totalPages),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t("Siguiente")}
              <ChevronRight className="size-3.5" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
