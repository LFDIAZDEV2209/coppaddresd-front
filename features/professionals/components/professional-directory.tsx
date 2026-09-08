"use client";

import { useT } from "@/providers/i18n-provider";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Check,
  Eye,
  FileUp,
  MailPlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  UserCheck,
  UserRound,
  UserRoundCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ViewToggle, type DataView } from "@/components/feedback/view-toggle";
import { useAppContext } from "@/providers/context-provider";
import { CatalogManagement } from "./catalog-management";
import { useProfessionals } from "../hooks/use-professionals";
import type { EmployeeListItem } from "../services/employees-service";
import { inviteEmployee } from "../services/employees-service";
import { ApiError } from "@/lib/api/http";
import {
  fullName,
  ProfessionalAvatar,
  ProfessionalStatusBadge,
  statusLabel,
} from "./professional-visuals";

/**
 * Directorio de profesionales del ERP con el lenguaje visual del módulo de
 * Usuarios: PageHeader con gradiente, stats cards clicables (aplican el
 * filtro asociado), toolbar con chips de filtros removibles, tabla/tarjetas
 * con selección múltiple, invitación en lote y animaciones escalonadas.
 * El filtro por rol y el alcance de datos los resuelve siempre el backend.
 */
export function ProfessionalDirectory() {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const {
    result,
    stats,
    statsError,
    filters,
    specialties,
    roles,
    clinics,
    loading,
    error,
    canManageCatalogs,
    setFilters,
    setPage,
    retry,
  } = useProfessionals();
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkInviting, setBulkInviting] = useState(false);
  const [view, setView] = useState<DataView>("table");

  const canCreate = can("Professionals.Create");
  const canInvite = can("Professionals.Update");

  const openCreate = () => router.push("/professionals/new");
  const openDetail = (employee: EmployeeListItem) =>
    router.push(`/professionals/${employee.id}`);

  const isFiltered =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.specialtyId !== "all" ||
    filters.roleId !== "all" ||
    filters.clinicId !== "all";

  const clearFilters = () =>
    setFilters({
      search: "",
      status: "all",
      specialtyId: "all",
      roleId: "all",
      clinicId: "all",
    });

  const copyLink = async (employee: EmployeeListItem, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(employee.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setFeedback({
        kind: "error",
        message: t("No se pudo copiar el enlace."),
      });
    }
  };

  const onInvite = async (employee: EmployeeListItem) => {
    setInvitingId(employee.id);
    setFeedback(null);
    try {
      const result = await inviteEmployee(employee.id);
      if (result.invitationLink) {
        await copyLink(employee, result.invitationLink);
        setFeedback({
          kind: "ok",
          message: t(
            "Invitación enviada a {email}. El enlace quedó copiado: {link}",
            {
              email: employee.email,
              link: result.invitationLink,
            },
          ),
        });
      } else {
        setFeedback({
          kind: "ok",
          message: t(
            "Invitación enviada a {email}. El profesional recibirá el enlace por correo.",
            {
              email: employee.email,
            },
          ),
        });
      }
      await retry();
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : t("No se pudo enviar la invitación."),
      });
    } finally {
      setInvitingId(null);
    }
  };

  // --- Selección múltiple ---
  const visibleEmployees = result?.data ?? [];
  const allVisibleSelected =
    visibleEmployees.length > 0 &&
    visibleEmployees.every((e) => selected.has(e.id));
  const someVisibleSelected =
    visibleEmployees.some((e) => selected.has(e.id)) && !allVisibleSelected;

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const e of visibleEmployees) next.delete(e.id);
      } else {
        for (const e of visibleEmployees) next.add(e.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedInvited = visibleEmployees.filter(
    (e) => selected.has(e.id) && e.status === "Invited",
  );

  const onBulkInvite = async () => {
    if (selectedInvited.length === 0) return;
    setBulkInviting(true);
    setFeedback(null);
    let ok = 0;
    let failed = 0;
    for (const employee of selectedInvited) {
      try {
        await inviteEmployee(employee.id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkInviting(false);
    setSelected(new Set());
    setFeedback({
      kind: failed === 0 ? "ok" : "error",
      message:
        failed === 0
          ? t("Invitación reenviada a {count} profesional(es).", {
              count: String(ok),
            })
          : t("{ok} invitaciones enviadas, {failed} fallaron.", {
              ok: String(ok),
              failed: String(failed),
            }),
    });
    await retry();
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.search.trim() !== "") {
      chips.push({
        key: "search",
        label: `"${filters.search.trim()}"`,
        onRemove: () => setFilters({ search: "" }),
      });
    }
    if (filters.status !== "all") {
      chips.push({
        key: "status",
        label: `${t("Estado")}: ${statusLabel(filters.status)}`,
        onRemove: () => setFilters({ status: "all" }),
      });
    }
    if (filters.specialtyId !== "all") {
      chips.push({
        key: "specialty",
        label: `${t("Especialidad")}: ${specialties.find((s) => s.id === filters.specialtyId)?.name ?? filters.specialtyId}`,
        onRemove: () => setFilters({ specialtyId: "all" }),
      });
    }
    if (filters.roleId !== "all") {
      chips.push({
        key: "role",
        label: `${t("Rol")}: ${roles.find((r) => r.id === filters.roleId)?.name ?? filters.roleId}`,
        onRemove: () => setFilters({ roleId: "all" }),
      });
    }
    if (filters.clinicId !== "all") {
      chips.push({
        key: "clinic",
        label: `${t("Clínica")}: ${clinics.find((c) => c.id === filters.clinicId)?.name ?? filters.clinicId}`,
        onRemove: () => setFilters({ clinicId: "all" }),
      });
    }
    return chips;
  }, [filters, specialties, roles, clinics, setFilters, t]);

  return (
    <div className="stagger-children flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Profesionales")}
        description={t(
          "Gestiona el equipo clínico, sus especialidades, roles y acceso al ERP",
        )}
        icon={Stethoscope}
        actions={
          canCreate ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/professionals/importar")}
              >
                <FileUp data-icon="inline-start" />
                {t("Creación masiva")}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus data-icon="inline-start" />
                {t("Nuevo profesional")}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Stats cards clicables: cada métrica aplica su filtro (clic de nuevo lo quita). */}
      <DirectoryStats
        stats={stats}
        filters={filters}
        onStatFilter={setFilters}
      />

      {statsError && (
        <p
          className="animate-slide-down rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground"
          role="alert"
        >
          {t("No pudimos cargar las estadísticas")}: {statsError}
        </p>
      )}

      {feedback && (
        <p
          className={cn(
            "animate-slide-down rounded-xl px-4 py-3 text-sm",
            feedback.kind === "ok"
              ? "bg-success-soft text-success-foreground"
              : "bg-destructive-soft text-destructive",
          )}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      {/* Toolbar de filtros con chips activos y contador de resultados. */}
      <DirectoryToolbar
        filters={filters}
        specialties={specialties}
        roles={roles}
        clinics={clinics}
        view={view}
        onViewChange={setView}
        loading={loading}
        onRefresh={retry}
        onFilterChange={setFilters}
        activeChips={activeChips}
        onClearFilters={clearFilters}
        resultCount={result?.total ?? 0}
        isFiltered={isFiltered}
      />

      {error && !result ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          {error && (
            <p
              className="animate-slide-down rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {loading && !result ? (
            <DirectorySkeleton />
          ) : result && result.data.length > 0 ? (
            <>
              {view === "table" ? (
                <DirectoryTable
                  employees={result.data}
                  canInvite={canInvite}
                  invitingId={invitingId}
                  copiedId={copiedId}
                  selected={selected}
                  allSelected={allVisibleSelected}
                  someSelected={someVisibleSelected}
                  onToggleAll={toggleAllVisible}
                  onToggleOne={toggleOne}
                  onOpen={openDetail}
                  onInvite={onInvite}
                />
              ) : (
                <DirectoryCards
                  employees={result.data}
                  canInvite={canInvite}
                  invitingId={invitingId}
                  copiedId={copiedId}
                  selected={selected}
                  onToggleOne={toggleOne}
                  onOpen={openDetail}
                  onInvite={onInvite}
                />
              )}
              {selected.size > 0 && (
                <BulkBar
                  count={selected.size}
                  invitedCount={selectedInvited.length}
                  busy={bulkInviting}
                  onInvite={onBulkInvite}
                  onClear={() => setSelected(new Set())}
                />
              )}
            </>
          ) : (
            <EmptyState
              filtered={isFiltered}
              canCreate={canCreate}
              onCreate={openCreate}
              onClear={clearFilters}
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

      {/* Gestión de catálogos (tipos y especialidades): solo Super Admin. */}
      {canManageCatalogs && <CatalogManagement />}
    </div>
  );
}

// --- Stats clicables (patrón del módulo Usuarios) ---

interface StatDef {
  key: string;
  label: string;
  icon: typeof Users;
  iconBg: string;
  accent: string;
  getValue: (stats: {
    total: number;
    active: number;
    invited: number;
    inactive: number;
  }) => number;
  context: string;
  isActive: (filters: { status: string }) => boolean;
  filter: { status: string };
}

function DirectoryStats({
  stats,
  filters,
  onStatFilter,
}: {
  stats: {
    total: number;
    active: number;
    invited: number;
    inactive: number;
  } | null;
  filters: { status: string };
  onStatFilter: (partial: { status: string }) => void;
}) {
  const t = useT();
  const defs: StatDef[] = [
    {
      key: "total",
      label: "Total de profesionales",
      icon: Users,
      iconBg: "bg-brand-gradient text-white shadow-sm",
      accent: "var(--brand-gradient)",
      getValue: (s) => s.total,
      context: "Directorio completo",
      isActive: () => filters.status === "all",
      filter: { status: "all" },
    },
    {
      key: "active",
      label: "Activos",
      icon: UserCheck,
      iconBg: "bg-success text-white",
      accent: "var(--success)",
      getValue: (s) => s.active,
      context: "En el equipo activo",
      isActive: (f) => f.status === "Active",
      filter: { status: "Active" },
    },
    {
      key: "invited",
      label: "Invitados",
      icon: MailPlus,
      iconBg: "bg-warning text-white",
      accent: "var(--warning)",
      getValue: (s) => s.invited,
      context: "Pendientes de primer acceso",
      isActive: (f) => f.status === "Invited",
      filter: { status: "Invited" },
    },
    {
      key: "inactive",
      label: "Inactivos",
      icon: UserX,
      iconBg: "bg-slate-400 text-white",
      accent: "#94a3b8",
      getValue: (s) => s.inactive,
      context: "Sin actividad en el ERP",
      isActive: (f) => f.status === "Inactive",
      filter: { status: "Inactive" },
    },
  ];

  return (
    <div className="stagger-children grid grid-cols-2 gap-3 xl:grid-cols-4">
      {defs.map((def) => {
        const value = stats ? def.getValue(stats) : null;
        const active = def.isActive(filters);
        return (
          <button
            key={def.key}
            type="button"
            disabled={!stats}
            onClick={() => onStatFilter(def.filter)}
            aria-pressed={active}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3.5 pl-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none",
              active
                ? "border-primary ring-1 ring-primary/30"
                : "border-border/70 hover:border-border",
            )}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: def.accent }}
            />
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                def.iconBg,
              )}
            >
              <def.icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t(def.label)}
              </span>
              {stats ? (
                <span className="text-xl leading-none font-bold tabular-nums text-foreground">
                  {value}
                </span>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
              <span className="truncate text-[10.5px] text-muted-foreground">
                {stats ? t(def.context) : "—"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- Toolbar con chips de filtros ---

function DirectoryToolbar({
  filters,
  specialties,
  roles,
  clinics,
  view,
  onViewChange,
  loading,
  onRefresh,
  onFilterChange,
  activeChips,
  onClearFilters,
  resultCount,
  isFiltered,
}: {
  filters: {
    search: string;
    status: string;
    specialtyId: string;
    roleId: string;
    clinicId: string;
  };
  specialties: { id: string; name: string; isActive: boolean }[];
  roles: { id: string; name: string }[];
  clinics: { id: string; name: string }[];
  view: DataView;
  onViewChange: (view: DataView) => void;
  loading: boolean;
  onRefresh: () => void;
  onFilterChange: (
    partial: Partial<{
      search: string;
      status: string;
      specialtyId: string;
      roleId: string;
      clinicId: string;
    }>,
  ) => void;
  activeChips: { key: string; label: string; onRemove: () => void }[];
  onClearFilters: () => void;
  resultCount: number;
  isFiltered: boolean;
}) {
  const t = useT();
  // El debounce (300 ms) vive en el hook: aquí notificamos en cada tecla y
  // el input es controlado (los chips y "Limpiar filtros" lo sincronizan).
  return (
    <section
      className="flex flex-col gap-2.5"
      aria-label={t("Filtros de profesionales")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-[200px] sm:w-[240px]">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 bg-card pr-8 pl-9"
            value={filters.search}
            onChange={(event) => onFilterChange({ search: event.target.value })}
            placeholder={t("Buscar profesional...")}
            aria-label={t("Buscar profesionales")}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t("Limpiar búsqueda")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange({ status: value ?? "all" })}
        >
          <SelectTrigger
            className="h-9 w-[170px] bg-card"
            aria-label={t("Filtrar por estado")}
          >
            <UserRound className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.status === "all"
                ? t("Estado")
                : t(statusLabel(filters.status))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todos los estados")}</SelectItem>
            <SelectItem value="Active">{t("Activo")}</SelectItem>
            <SelectItem value="Invited">{t("Invitado")}</SelectItem>
            <SelectItem value="Inactive">{t("Inactivo")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.specialtyId}
          onValueChange={(value) =>
            onFilterChange({ specialtyId: value ?? "all" })
          }
        >
          <SelectTrigger
            className="h-9 w-[175px] bg-card"
            aria-label={t("Filtrar por especialidad")}
          >
            <Stethoscope className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.specialtyId === "all"
                ? t("Especialidades")
                : (specialties.find((s) => s.id === filters.specialtyId)
                    ?.name ?? t("Especialidades"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas las especialidades")}</SelectItem>
            {specialties
              .filter((s) => s.isActive)
              .map((specialty) => (
                <SelectItem key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.roleId}
          onValueChange={(value) => onFilterChange({ roleId: value ?? "all" })}
        >
          <SelectTrigger
            className="h-9 w-[140px] bg-card"
            aria-label={t("Filtrar por rol")}
          >
            <UserCheck className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.roleId === "all"
                ? t("Roles")
                : (roles.find((r) => r.id === filters.roleId)?.name ??
                  t("Roles"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todos los roles")}</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clinicId}
          onValueChange={(value) =>
            onFilterChange({ clinicId: value ?? "all" })
          }
        >
          <SelectTrigger
            className="h-9 w-[150px] bg-card"
            aria-label={t("Filtrar por clínica")}
          >
            <Building2 className="mr-2 size-3.5 text-muted-foreground" />
            <SelectValue>
              {filters.clinicId === "all"
                ? t("Clínicas")
                : (clinics.find((c) => c.id === filters.clinicId)?.name ??
                  t("Clínicas"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas las clínicas")}</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label={t("Actualizar directorio")}
            title={t("Actualizar directorio")}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
          <ViewToggle value={view} onValueChange={onViewChange} />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="animate-slide-down flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <SlidersHorizontal className="size-3" />
            {t("{count} filtros activos", {
              count: String(activeChips.length),
            })}
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="animate-scale-in inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pr-1 pl-2.5 text-[11px] font-medium text-primary transition-all hover:bg-primary/15"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-primary/20"
                aria-label={t("Quitar filtro {label}", { label: chip.label })}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={onClearFilters}
          >
            <X data-icon="inline-start" />
            {t("Limpiar filtros")}
          </Button>
          {isFiltered && resultCount > 0 && (
            <span className="ml-1 text-[11px] text-muted-foreground">
              {t("{count} resultados", { count: String(resultCount) })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

// --- Tabla ---

type SortField = "name" | "type" | "status";
interface SortState {
  field: SortField;
  dir: "asc" | "desc";
}

function sortEmployees(
  employees: EmployeeListItem[],
  sort: SortState,
): EmployeeListItem[] {
  const sorted = [...employees];
  sorted.sort((a, b) => {
    let cmp = 0;
    if (sort.field === "name") {
      cmp = fullName(a).localeCompare(fullName(b));
    } else if (sort.field === "type") {
      cmp = (a.professionalTypeName ?? "").localeCompare(
        b.professionalTypeName ?? "",
      );
    } else {
      cmp = a.status.localeCompare(b.status);
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function SortableHead({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort.field === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-primary",
        )}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function DirectoryTable({
  employees,
  canInvite,
  invitingId,
  copiedId,
  selected,
  allSelected,
  someSelected,
  onToggleAll,
  onToggleOne,
  onOpen,
  onInvite,
}: {
  employees: EmployeeListItem[];
  canInvite: boolean;
  invitingId: string | null;
  copiedId: string | null;
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  const [sort, setSort] = useState<SortState>({ field: "name", dir: "asc" });
  const sorted = useMemo(
    () => sortEmployees(employees, sort),
    [employees, sort],
  );
  const onSort = (field: SortField) =>
    setSort((current) =>
      current.field === field
        ? { field, dir: current.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${employees.length} ${t("profesionales visibles")}`}
        description={t("Equipo del ERP")}
        icon={UserRound}
        variant="primary"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected || someSelected}
                onCheckedChange={onToggleAll}
                aria-label={t("Seleccionar todos los visibles")}
              />
            </TableHead>
            <SortableHead
              label={t("Profesional")}
              field="name"
              sort={sort}
              onSort={onSort}
            />
            <SortableHead
              label={t("Tipo")}
              field="type"
              sort={sort}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            <TableHead className="hidden lg:table-cell">
              {t("Especialidades")}
            </TableHead>
            <TableHead className="hidden xl:table-cell">
              {t("Clínicas")}
            </TableHead>
            <SortableHead
              label={t("Estado")}
              field="status"
              sort={sort}
              onSort={onSort}
            />
            <TableHead className="w-10">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((employee, index) => (
            <TableRow
              key={employee.id}
              className="group animate-slide-up"
              style={{
                animationDelay: `${Math.min(index * 30, 300)}ms`,
              }}
            >
              <TableCell>
                <Checkbox
                  checked={selected.has(employee.id)}
                  onCheckedChange={() => onToggleOne(employee.id)}
                  aria-label={t("Seleccionar {name}", {
                    name: fullName(employee),
                  })}
                />
              </TableCell>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onOpen(employee)}
                >
                  <ProfessionalAvatar employee={employee} size="sm" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {fullName(employee)}
                    </span>
                    <span className="max-w-52 truncate text-xs text-muted-foreground">
                      {employee.email}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {employee.professionalTypeName ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                    <Stethoscope className="size-3 text-primary" />
                    {employee.professionalTypeName}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t("Sin tipo")}
                  </span>
                )}
                {employee.jobTitle && (
                  <span className="block text-xs text-muted-foreground">
                    {employee.jobTitle}
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex max-w-52 flex-wrap gap-1">
                  {employee.specialtyNames?.length ? (
                    employee.specialtyNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {(employee.specialtyNames?.length ?? 0) > 2 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      +{(employee.specialtyNames?.length ?? 0) - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="flex max-w-52 flex-wrap gap-1">
                  {employee.clinicNames.length ? (
                    employee.clinicNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <Building2 className="size-3" />
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {employee.clinicNames.length > 2 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      +{employee.clinicNames.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <ProfessionalStatusBadge status={employee.status} />
              </TableCell>
              <TableCell>
                <ActionsMenu
                  employee={employee}
                  canInvite={canInvite}
                  inviting={invitingId === employee.id}
                  copied={copiedId === employee.id}
                  onOpen={onOpen}
                  onInvite={onInvite}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// --- Vista de tarjetas ---

function DirectoryCards({
  employees,
  canInvite,
  invitingId,
  copiedId,
  selected,
  onToggleOne,
  onOpen,
  onInvite,
}: {
  employees: EmployeeListItem[];
  canInvite: boolean;
  invitingId: string | null;
  copiedId: string | null;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  return (
    <div className="stagger-children grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee) => (
        <div
          key={employee.id}
          className={cn(
            "hover-lift flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all",
            selected.has(employee.id)
              ? "border-primary ring-1 ring-primary/30"
              : "border-border/70",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Checkbox
              checked={selected.has(employee.id)}
              onCheckedChange={() => onToggleOne(employee.id)}
              aria-label={t("Seleccionar {name}", { name: fullName(employee) })}
            />
            <ActionsMenu
              employee={employee}
              canInvite={canInvite}
              inviting={invitingId === employee.id}
              copied={copiedId === employee.id}
              onOpen={onOpen}
              onInvite={onInvite}
            />
          </div>

          <button
            className="flex items-center gap-3 text-left"
            onClick={() => onOpen(employee)}
          >
            <ProfessionalAvatar employee={employee} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {fullName(employee)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {employee.email}
              </span>
            </span>
          </button>

          {employee.professionalTypeName && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
              <Stethoscope className="size-3 text-primary" />
              {employee.professionalTypeName}
            </span>
          )}

          {employee.specialtyNames?.length ? (
            <div className="flex flex-wrap gap-1">
              {employee.specialtyNames.slice(0, 3).map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {name}
                </span>
              ))}
              {employee.specialtyNames.length > 3 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  +{employee.specialtyNames.length - 3}
                </span>
              )}
            </div>
          ) : null}

          {employee.clinicNames.length > 0 && (
            <p className="flex items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              {employee.clinicNames.join(", ")}
            </p>
          )}

          <div className="mt-auto border-t border-border/60 pt-3">
            <ProfessionalStatusBadge status={employee.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Barra de acciones masivas ---

function BulkBar({
  count,
  invitedCount,
  busy,
  onInvite,
  onClear,
}: {
  count: number;
  invitedCount: number;
  busy: boolean;
  onInvite: () => void;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="animate-slide-up sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg shadow-black/5">
      <span className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12.5px] font-semibold text-primary">
        <UserRound className="size-3.5" />
        {t("{count} seleccionados", { count: String(count) })}
      </span>
      <Button
        size="sm"
        onClick={onInvite}
        disabled={invitedCount === 0 || busy}
        title={
          invitedCount === 0
            ? t("Solo profesionales con estado Invitado")
            : undefined
        }
      >
        <MailPlus
          data-icon="inline-start"
          className={busy ? "animate-pulse" : undefined}
        />
        {t("Reenviar invitación ({count})", { count: String(invitedCount) })}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto text-muted-foreground"
        onClick={onClear}
      >
        <X data-icon="inline-start" />
        {t("Limpiar selección")}
      </Button>
    </div>
  );
}

// --- Menú de acciones de fila ---

function ActionsMenu({
  employee,
  canInvite,
  inviting,
  copied,
  onOpen,
  onInvite,
}: {
  employee: EmployeeListItem;
  canInvite: boolean;
  inviting: boolean;
  copied: boolean;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Acciones de {name}", { name: fullName(employee) })}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(employee)}>
          <Eye />
          {t("Ver detalles")}
        </DropdownMenuItem>
        {canInvite && employee.status === "Invited" && (
          <DropdownMenuItem
            disabled={inviting}
            onClick={() => onInvite(employee)}
          >
            <MailPlus />
            {inviting ? t("Enviando...") : t("Reenviar invitación")}
          </DropdownMenuItem>
        )}
        {copied && (
          <DropdownMenuItem disabled>
            <Check />
            {t("Enlace copiado")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Estados ---

function DirectorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="flex items-center gap-4 border-b border-border py-4 last:border-0"
            key={index}
          >
            <Skeleton className="size-4" />
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
    </div>
  );
}

function EmptyState({
  filtered,
  canCreate,
  onCreate,
  onClear,
}: {
  filtered: boolean;
  canCreate: boolean;
  onCreate: () => void;
  onClear: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <UserRoundCheck className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">
          {filtered
            ? t("Sin resultados con los filtros")
            : t("No encontramos profesionales")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {filtered
            ? t("Prueba con otros términos o quita algún filtro.")
            : t("Crea el primer profesional del equipo para comenzar.")}
        </p>
      </div>
      {filtered ? (
        <Button size="sm" variant="outline" onClick={onClear}>
          <X data-icon="inline-start" />
          {t("Limpiar filtros")}
        </Button>
      ) : canCreate ? (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          {t("Nuevo profesional")}
        </Button>
      ) : null}
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
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        {t("No pudimos cargar el directorio")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
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
  const t = useT();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {t("Mostrando {from}–{to} de {total} profesionales", {
          from: String(from),
          to: String(to),
          total: String(total),
        })}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          {t("Página {page} de {totalPages}", {
            page: String(page),
            totalPages: String(totalPages),
          })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("Anterior")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("Siguiente")}
        </Button>
      </div>
    </div>
  );
}
