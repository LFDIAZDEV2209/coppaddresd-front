"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
  SearchX,
  Trash2,
  Upload,
  Users as UsersIcon,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
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
import { useAuth } from "@/providers/auth-provider";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import { useUsers } from "../hooks/use-users";
import {
  deleteUser,
  fetchPermissions,
  fetchRoles,
  fetchUserRoles,
  fetchUserStats,
  updateUser,
} from "../services/users-service";
import type { User, UserStats } from "../types";
import type { DataView } from "@/components/feedback/view-toggle";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { UsersStats } from "./users-stats";
import { UsersToolbar } from "./users-toolbar";
import { UsersTable } from "./users-table";
import { UsersCards } from "./users-cards";
import { BulkRolesProvider, UsersBulkBar } from "./users-bulk-bar";
import { useT } from "@/providers/i18n-provider";

/**
 * Página de usuarios: stats accionables + filtros reales + tabla/cards con
 * ordenamiento + acciones masivas + paginación. La creación/edición vive en
 * rutas dedicadas (/users/nuevo, /users/{id}/editar) y el detalle en
 * /users/{id}.
 */
export function UsersPageContent() {
  const { user: session, hasPermission, logout } = useAuth();
  const canCreate = hasPermission("Users.Create");
  const canUpdate = hasPermission("Users.Update");
  const canDelete = hasPermission("Users.Delete");
  const canAssignRoles = hasPermission("Roles.Assign");
  const t = useT();
  const router = useRouter();

  const {
    result,
    loading,
    error,
    filters,
    sort,
    selectedIds,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch,
    retry,
  } = useUsers();

  const [view, setView] = useState<DataView>("table");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [catalog, setCatalog] = useState<{
    roles: Role[];
    permissions: Permission[];
  } | null>(null);
  const [deleting, setDeleting] = useState<User | undefined>();
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);

  // Catálogo de roles/permisos: alimenta el filtro por rol y la barra masiva.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoles(), fetchPermissions()])
      .then(([roles, permissions]) => {
        if (!cancelled) setCatalog({ roles, permissions });
      })
      .catch(() => {
        // El filtro por rol queda vacío; el resto del módulo sigue funcionando.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchUserStats());
    } catch {
      // Los stats son informativos: sin ellos la lista sigue funcionando.
    }
  }, []);

  // Sincroniza stats con el total de resultados (setState en callback, no
  // síncrono en el cuerpo del effect).
  useEffect(() => {
    let cancelled = false;
    fetchUserStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        // Sin stats la lista sigue funcionando.
      });
    return () => {
      cancelled = true;
    };
  }, [result?.total]);

  const roleNames = (catalog?.roles ?? []).map((role) => role.name);

  const dismissNotice = useCallback(() => setNotice(null), []);

  // --- Acciones individuales ---

  const toggleActive = async (user: User) => {
    setNotice(null);
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      if (session?.id === user.id && user.isActive) {
        // Desactivarse a sí mismo invalida la sesión (security stamp del backend).
        setNotice({
          tone: "info",
          text: t(
            "Te desactivaste: la sesión se cerrará para aplicar el cambio.",
          ),
        });
        setTimeout(() => logout("expired"), 1200);
        return;
      }
      setNotice({
        tone: "info",
        text: !user.isActive
          ? t("Usuario activado. Ya puede iniciar sesión.")
          : t(
              "Usuario desactivado. No podrá iniciar sesión hasta reactivarlo.",
            ),
      });
      await refetch();
      void loadStats();
    } catch (err) {
      setNotice({
        tone: "error",
        text:
          err instanceof Error ? err.message : t("Error al cambiar el estado."),
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      await deleteUser(deleting.id);
      setDeleting(undefined);
      clearSelection();
      await refetch();
      void loadStats();
    } catch (err) {
      setNotice({
        tone: "error",
        text:
          err instanceof Error
            ? err.message
            : t("Error al eliminar el usuario."),
      });
      setDeleting(undefined);
    } finally {
      setDeleteSaving(false);
    }
  };

  // --- Acciones masivas (reales, sobre la API existente) ---

  const bulkSetActive = async (active: boolean) => {
    setBulkBusy(true);
    setNotice(null);
    let done = 0;
    let failed = 0;
    let selfSkipped = 0;
    for (const id of selectedIds) {
      if (id === session?.id) {
        selfSkipped++;
        continue;
      }
      try {
        await updateUser(id, { isActive: active });
        done++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    await refetch();
    void loadStats();
    setBulkBusy(false);
    const parts: string[] = [
      `${done} ${done === 1 ? t("usuario actualizado") : t("usuarios actualizados")}`,
    ];
    if (failed > 0) parts.push(`${failed} ${t("con error")}`);
    if (selfSkipped > 0)
      parts.push(
        `${selfSkipped} ${t("omitido(s): no podés cambiarte el estado a vos mismo")}`,
      );
    setNotice({ tone: failed > 0 ? "error" : "info", text: parts.join(" · ") });
  };

  const bulkAssignRole = async (roleId: string) => {
    setBulkBusy(true);
    setNotice(null);
    let done = 0;
    let failed = 0;
    const roleName =
      catalog?.roles.find((role) => role.id === roleId)?.name ?? "";
    for (const id of selectedIds) {
      try {
        // El backend hace sync TOTAL: primero leemos los roles actuales para
        // AGREGAR el nuevo sin perder los existentes.
        const current = await fetchUserRoles(id);
        if (current.some((role) => role.id === roleId)) {
          done++;
          continue;
        }
        await updateUser(id, {
          roleIds: [...current.map((role) => role.id), roleId],
        });
        done++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    await refetch();
    setBulkBusy(false);
    setNotice({
      tone: failed > 0 ? "error" : "info",
      text:
        failed > 0
          ? `${done} ${t("asignados")} · ${failed} ${t("con error")}`
          : `${t("Rol")} "${roleName}" ${t("asignado a")} ${done} ${done === 1 ? t("usuario") : t("usuarios")}`,
    });
  };

  const bulkDelete = async () => {
    setBulkBusy(true);
    setNotice(null);
    let done = 0;
    let failed = 0;
    let selfSkipped = 0;
    for (const id of selectedIds) {
      if (id === session?.id) {
        selfSkipped++;
        continue;
      }
      try {
        await deleteUser(id);
        done++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    await refetch();
    void loadStats();
    setBulkBusy(false);
    const parts: string[] = [
      `${done} ${done === 1 ? t("usuario eliminado") : t("usuarios eliminados")}`,
    ];
    if (failed > 0) parts.push(`${failed} ${t("con error")}`);
    if (selfSkipped > 0)
      parts.push(`${selfSkipped} ${t("omitido(s): eres tú")}`);
    setNotice({ tone: failed > 0 ? "error" : "info", text: parts.join(" · ") });
  };

  return (
    <BulkRolesProvider roles={catalog?.roles ?? []}>
      <div className="flex flex-col gap-5 p-6">
        <PageHeader
          title={t("Usuarios")}
          description={t(
            "Gestioná las cuentas, roles y permisos de la plataforma.",
          )}
          icon={UsersIcon}
          actions={
            canCreate && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/users/importar")}
                  title={t("Crear usuarios masivamente")}
                >
                  <Upload data-icon="inline-start" />
                  <span className="hidden sm:inline">
                    {t("Importar masivamente")}
                  </span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/users/nuevo")}
                  className="bg-brand-gradient text-white shadow-md shadow-brand-navy/25 transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow-lg"
                >
                  <Plus data-icon="inline-start" />
                  {t("Nuevo usuario")}
                </Button>
              </div>
            )
          }
        />

        {notice && (
          <div
            className={
              notice.tone === "error" ? noticeErrorClass : noticeInfoClass
            }
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.tone === "error" ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={dismissNotice}
              className="text-xs font-medium underline-offset-2 hover:underline"
            >
              {t("Cerrar")}
            </button>
          </div>
        )}

        <UsersStats stats={stats} filters={filters} onStatFilter={setFilters} />

        <UsersToolbar
          filters={filters}
          roles={roleNames}
          view={view}
          onViewChange={setView}
          onFilterChange={setFilters}
        />

        {loading ? (
          <UsersTableSkeleton />
        ) : error ? (
          <UsersErrorState message={error} onRetry={retry} />
        ) : result && result.data.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
            <SectionHeader
              title={`${result.total} ${result.total === 1 ? t("usuario") : t("usuarios")} ${t("encontrados")}`}
              description={t("Administra los usuarios de la plataforma")}
              icon={UsersIcon}
              variant="primary"
              actions={
                selectedIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {t("Limpiar selección")}
                  </button>
                ) : undefined
              }
            />
            {view === "table" ? (
              <UsersTable
                users={result.data}
                selectedIds={selectedIds}
                sort={sort}
                onSortChange={setSort}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onView={(user) => router.push(`/users/${user.id}`)}
                onEdit={(user) => router.push(`/users/${user.id}/editar`)}
                onToggleActive={(user) => void toggleActive(user)}
                onDelete={setDeleting}
              />
            ) : (
              <UsersCards
                users={result.data}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onView={(user) => router.push(`/users/${user.id}`)}
                onEdit={(user) => router.push(`/users/${user.id}/editar`)}
                onToggleActive={(user) => void toggleActive(user)}
                onDelete={setDeleting}
              />
            )}
          </div>
        ) : (
          <EmptyState
            hasUsers={(stats?.total ?? 0) > 0}
            hasFilters={
              Boolean(filters.search) ||
              filters.status !== "all" ||
              filters.role !== "all" ||
              filters.createdWithin !== "all"
            }
            onCreate={() => router.push("/users/nuevo")}
            onClearFilters={() =>
              setFilters({
                search: "",
                status: "all",
                role: "all",
                createdWithin: "all",
              })
            }
            canCreate={canCreate}
          />
        )}

        {result && result.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
            <span>
              {t("Página {page} de {totalPages}", {
                page: String(result.page),
                totalPages: String(result.totalPages),
              })}{" "}
              · {result.total}{" "}
              {result.total === 1 ? t("usuario") : t("usuarios")}
            </span>
            <div className="flex items-center gap-3">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={result.pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                aria-label={t("Usuarios por página")}
              >
                <option value={5}>{t("5 por página")}</option>
                <option value={10}>{t("10 por página")}</option>
                <option value={20}>{t("20 por página")}</option>
              </select>
              <Pagination className="w-auto justify-start">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      text={t("Anterior")}
                      aria-disabled={result.page === 1}
                      className={
                        result.page === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(result.page - 1);
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      text={t("Siguiente")}
                      aria-disabled={result.page === result.totalPages}
                      className={
                        result.page === result.totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(result.page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}

        {/* Barra de acciones masivas */}
        <UsersBulkBar
          selectedCount={selectedIds.size}
          busy={bulkBusy}
          onClear={clearSelection}
          onAssignRole={bulkAssignRole}
          onSetActive={bulkSetActive}
          onDelete={bulkDelete}
          canAssignRoles={canAssignRoles}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />

        {/* Confirmación de eliminación individual */}
        <AlertDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
        >
          <AlertDialogContent>
            <AlertDialogMedia className="bg-destructive-soft text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("¿Eliminar usuario?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("Se eliminará el usuario")}
                {deleting
                  ? ` "${deleting.firstName} ${deleting.lastName}"`
                  : ""}{" "}
                {t(
                  "y todas sus asignaciones. Esta acción no se puede deshacer.",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteSaving}>
                {t("Cancelar")}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleteSaving}
                onClick={confirmDelete}
              >
                {deleteSaving ? (
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Trash2 data-icon="inline-start" />
                )}
                {t("Eliminar")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BulkRolesProvider>
  );
}

const noticeInfoClass =
  "flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground";
const noticeErrorClass =
  "flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive";

function UsersTableSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="size-4 animate-pulse rounded bg-muted" />
          <div className="size-8 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function UsersErrorState({
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
        {t("No pudimos cargar los usuarios")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}

function EmptyState({
  hasUsers,
  hasFilters,
  onCreate,
  onClearFilters,
  canCreate,
}: {
  hasUsers: boolean;
  hasFilters: boolean;
  onCreate: () => void;
  onClearFilters: () => void;
  canCreate: boolean;
}) {
  const t = useT();
  const isFilterIssue = hasUsers && hasFilters;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16">
      <div
        className={
          isFilterIssue
            ? "flex size-12 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground"
            : "flex size-12 items-center justify-center rounded-xl bg-muted"
        }
      >
        {isFilterIssue ? (
          <SearchX className="size-6" />
        ) : (
          <UserX className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground">
          {isFilterIssue
            ? t("Sin resultados para estos filtros")
            : t("Aún no hay usuarios")}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {isFilterIssue
            ? t("Probá ajustar o limpiar los filtros de búsqueda.")
            : t(
                "Creá el primer usuario o importá una lista completa desde un archivo.",
              )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isFilterIssue ? (
          <Button size="sm" variant="outline" onClick={onClearFilters}>
            {t("Limpiar filtros")}
          </Button>
        ) : null}
        {canCreate && (
          <Button
            size="sm"
            onClick={onCreate}
            className="bg-brand-gradient text-white hover:opacity-95"
          >
            <Plus data-icon="inline-start" />
            {t("Nuevo usuario")}
          </Button>
        )}
      </div>
    </div>
  );
}
