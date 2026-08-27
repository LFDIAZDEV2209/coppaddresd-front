"use client";

import { useT } from "@/providers/i18n-provider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
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
  Users,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { StatCard } from "@/components/feedback/stat-card";
import { Button } from "@/components/ui/button";
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
import { useAppContext } from "@/providers/context-provider";
import { CatalogManagement } from "./catalog-management";
import { useProfessionals } from "../hooks/use-professionals";
import type { EmployeeListItem } from "../services/employees-service";
import { inviteEmployee } from "../services/employees-service";
import { ApiError } from "@/lib/api/http";

const STATUS_LABELS: Record<string, string> = {
  Invited: "Invitado",
  Active: "Activo",
  Inactive: "Inactivo",
};

function statusColor(status: string) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    Active: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    Invited: {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    Inactive: {
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

/**
 * Directorio de profesionales del ERP con el lenguaje visual del módulo de
 * Citas: PageHeader navy, StatCards con métricas reales, filtros shadcn
 * (búsqueda/estado/especialidad/rol/clínica), tabla con avatares y badges,
 * estados skeleton/empty/error y paginación. El filtro por rol y el alcance
 * de datos los resuelve siempre el backend.
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

  const copyLink = async (employee: EmployeeListItem, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(employee.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setFeedback({ kind: "error", message: "No se pudo copiar el enlace." });
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
          message: `Invitación enviada a ${employee.email}. El enlace quedó copiado: ${result.invitationLink}`,
        });
      } else {
        setFeedback({
          kind: "ok",
          message: `Invitación enviada a ${employee.email}. El profesional recibirá el enlace por correo.`,
        });
      }
      await retry();
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "No se pudo enviar la invitación.",
      });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Profesionales")}
        description={t("Gestiona el equipo clínico, sus especialidades, roles y acceso al ERP")}
        icon={Stethoscope}
        actions={
          canCreate ? (
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Nuevo profesional
            </Button>
          ) : undefined
        }
      />

      {/* Stats cards con métricas reales del backend (mismo alcance del listado). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Total de profesionales")}
          value={stats ? String(stats.total) : "—"}
          icon={Users}
          variant="primary"
          context={t("Directorio completo")}
        />
        <StatCard
          label={t("Activos")}
          value={stats ? String(stats.active) : "—"}
          icon={UserCheck}
          variant="success"
          context={t("En el equipo activo")}
        />
        <StatCard
          label={t("Invitados")}
          value={stats ? String(stats.invited) : "—"}
          icon={MailPlus}
          variant="warning"
          context={t("Pendientes de primer acceso")}
        />
        <StatCard
          label={t("Inactivos")}
          value={stats ? String(stats.inactive) : "—"}
          icon={UserX}
          variant="destructive"
          context={t("Sin actividad en el ERP")}
        />
      </div>

      {statsError && (
        <p
          className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground"
          role="alert"
        >
          No pudimos cargar las estadísticas: {statsError}
        </p>
      )}

      {feedback && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            feedback.kind === "ok"
              ? "bg-success-soft text-success-foreground"
              : "bg-destructive-soft text-destructive",
          )}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      {/* Filtros con header navy e icono y botón de actualizar. */}
      <section
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        aria-label={t("Filtros de profesionales")}
      >
        <SectionHeader
          title={t("Directorio de profesionales")}
          description={t("Busca por nombre, correo o cargo; filtra por estado, especialidad, rol o clínica")}
          icon={SlidersHorizontal}
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
              Actualizar
            </Button>
          }
        />
        <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_150px_180px_170px] sm:p-5 lg:grid-cols-[minmax(0,1fr)_150px_180px_170px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder={t("Buscar profesional...")}
              aria-label={t("Buscar profesionales")}
            />
          </div>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value ?? "all" })}
          >
            <SelectTrigger className="w-full" aria-label={t("Filtrar por estado")}>
              <SelectValue>
                {filters.status === "all"
                  ? "Todos los estados"
                  : (STATUS_LABELS[filters.status] ?? filters.status)}
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
              setFilters({ specialtyId: value ?? "all" })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-label={t("Filtrar por especialidad")}
            >
              <SelectValue>
                {filters.specialtyId === "all"
                  ? "Todas las especialidades"
                  : (specialties.find((s) => s.id === filters.specialtyId)
                      ?.name ?? "Todas las especialidades")}
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
            onValueChange={(value) => setFilters({ roleId: value ?? "all" })}
          >
            <SelectTrigger className="w-full" aria-label={t("Filtrar por rol")}>
              <SelectValue>
                {filters.roleId === "all"
                  ? "Todos los roles"
                  : (roles.find((r) => r.id === filters.roleId)?.name ??
                    "Todos los roles")}
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
            onValueChange={(value) => setFilters({ clinicId: value ?? "all" })}
          >
            <SelectTrigger className="w-full" aria-label={t("Filtrar por clínica")}>
              <SelectValue>
                {filters.clinicId === "all"
                  ? "Todas las clínicas"
                  : (clinics.find((c) => c.id === filters.clinicId)?.name ??
                    "Todas las clínicas")}
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
            <DirectorySkeleton />
          ) : result && result.data.length > 0 ? (
            <DirectoryTable
              employees={result.data}
              canInvite={canInvite}
              invitingId={invitingId}
              copiedId={copiedId}
              onOpen={openDetail}
              onInvite={onInvite}
            />
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

      {/* Gestión de catálogos (tipos y especialidades): solo Super Admin. */}
      {canManageCatalogs && <CatalogManagement />}
    </div>
  );
}

function DirectoryTable({
  employees,
  canInvite,
  invitingId,
  copiedId,
  onOpen,
  onInvite,
}: {
  employees: EmployeeListItem[];
  canInvite: boolean;
  invitingId: string | null;
  copiedId: string | null;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${employees.length} profesionales visibles`}
        description={t("Equipo del ERP")}
        icon={UserRound}
        variant="primary"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("Profesional")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("Tipo")}</TableHead>
            <TableHead className="hidden lg:table-cell">
              Especialidades
            </TableHead>
            <TableHead className="hidden xl:table-cell">{t("Clínicas")}</TableHead>
            <TableHead>{t("Estado")}</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onOpen(employee)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {employee.firstName[0]}
                    {employee.lastName[0]}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {employee.firstName} {employee.middleName}{" "}
                      {employee.lastName}
                    </span>
                    <span className="max-w-52 truncate text-xs text-muted-foreground">
                      {employee.email}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-sm">
                  {employee.professionalTypeName ?? (
                    <span className="text-muted-foreground">{t("Sin tipo")}</span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {employee.jobTitle ?? ""}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="line-clamp-2 max-w-44 text-sm text-muted-foreground">
                  {employee.specialtyNames?.length
                    ? employee.specialtyNames.join(", ")
                    : "—"}
                </span>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="line-clamp-2 max-w-44 text-sm text-muted-foreground">
                  {employee.clinicNames.length
                    ? employee.clinicNames.join(", ")
                    : "—"}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={STATUS_LABELS[employee.status] ?? employee.status}
                  color={statusColor(employee.status)}
                />
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${employee.firstName} ${employee.lastName}`}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(employee)}>
          <Eye />
          Ver detalles
        </DropdownMenuItem>
        {canInvite && employee.status === "Invited" && (
          <DropdownMenuItem
            disabled={inviting}
            onClick={() => onInvite(employee)}
          >
            <MailPlus />
            {inviting ? "Enviando..." : "Reenviar invitación"}
          </DropdownMenuItem>
        )}
        {copied && (
          <DropdownMenuItem disabled>
            <Check />
            Enlace copiado
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DirectorySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[110px] w-full rounded-2xl" />
        ))}
      </div>
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
        <UserRoundCheck className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">
          {filtered
            ? "Sin resultados con los filtros"
            : "No encontramos profesionales"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {filtered
            ? "Prueba con otros términos o quita algún filtro."
            : "Crea el primer profesional del equipo para comenzar."}
        </p>
      </div>
      {canCreate && !filtered && (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Nuevo profesional
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
        Mostrando {from}–{to} de {total} profesionales
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
