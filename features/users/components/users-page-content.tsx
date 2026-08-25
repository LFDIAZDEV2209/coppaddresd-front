"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Info,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users as UsersIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import { useUsers } from "../hooks/use-users";
import {
  createUser,
  updateUser,
  deleteUser,
  fetchRoles,
  fetchPermissions,
} from "../services/users-service";
import type { User, UserFormValues } from "../types";
import type { DataView } from "@/components/feedback/view-toggle";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { UsersToolbar } from "./users-toolbar";
import { UsersTable } from "./users-table";
import { UsersCards } from "./users-cards";
import { UserFormDialog } from "./user-form-dialog";

export function UsersPageContent() {
  const { user: session, hasPermission, logout } = useAuth();
  const canCreate = hasPermission("Users.Create");

  const {
    result,
    loading,
    error,
    filters,
    selectedIds,
    setFilters,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch,
    retry,
  } = useUsers();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();
  const [deleting, setDeleting] = useState<User | undefined>();
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<DataView>("table");

  // Catálogo de roles y permisos. Se carga en el montaje de la página para
  // alimentar el filtro por rol del toolbar; se reutiliza en los forms.
  const [catalog, setCatalog] = useState<{
    roles: Role[];
    permissions: Permission[];
  } | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);
    try {
      const [roles, permissions] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);
      setCatalog({ roles, permissions });
    } catch (err) {
      setCatalogError(
        err instanceof Error
          ? err.message
          : "Error al cargar roles y permisos.",
      );
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadCatalog, 0);
    return () => clearTimeout(timer);
  }, [loadCatalog]);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (user: User) => {
    setEditing(user);
    setFormOpen(true);
  };

  /**
   * Guarda el usuario en UN solo request: el backend crea/actualiza el perfil
   * y hace sync total de roles y permisos en una transacción (rol/permiso
   * inválido o fallo de asignación → todo se revierte y llega un único error).
   *
   * Las asignaciones se envían SOLO si el caller tiene los permisos para
   * asignar (si no, se omiten → el backend no las toca y no exige
   * Roles.Assign/Permissions.Assign: un admin con solo Users.Update puede
   * corregir datos básicos).
   *
   * El logout/aviso de sesión se hace SOLO si algo cambió efectivamente
   * (asignaciones o isActive), que es cuando el backend bumpea el security
   * stamp. Los errores se Lanzan para que el dialog los muestre en el modal.
   */
  const submit = async (values: UserFormValues) => {
    setSaving(true);
    setNotice(null);
    try {
      const canAssignRoles = hasPermission("Roles.Assign");
      const canAssignPermissions = hasPermission("Permissions.Assign");

      const userId = editing?.id ?? (
        await createUser({
          email: values.email,
          password: values.password ?? "",
          firstName: values.firstName,
          lastName: values.lastName,
          roleIds: canAssignRoles ? values.roleIds : undefined,
          permissionIds: canAssignPermissions
            ? values.permissionIds
            : undefined,
        })
      ).id;

      if (editing) {
        await updateUser(editing.id, {
          firstName: values.firstName,
          lastName: values.lastName,
          isActive: values.isActive,
          roleIds: canAssignRoles ? values.roleIds : undefined,
          permissionIds: canAssignPermissions
            ? values.permissionIds
            : undefined,
        });
      }

      // ¿Cambió algo que invalide tokens en el backend? El security stamp se
      // bumpea SOLO con cambios de asignaciones o transición IsActive → false.
      const changedAssignments = editing ? values.assignmentsChanged : false;
      const changedState = editing
        ? values.isActive !== editing.isActive
        : false;
      const somethingChanged = changedAssignments || changedState;

      setFormOpen(false);
      await refetch();

      if (session?.id === userId) {
        if (somethingChanged) {
          logout("expired");
        }
        return;
      }
      if (somethingChanged) {
        setNotice(
          "El usuario deberá volver a iniciar sesión para que los cambios apliquen.",
        );
      }
    } catch (err) {
      // El error del endpoint único se muestra dentro del modal (submitErrors).
      throw new Error(
        err instanceof Error ? err.message : "Error al guardar el usuario.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setActionError(null);
    try {
      await deleteUser(deleting.id);
      setDeleting(undefined);
      clearSelection();
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Error al eliminar el usuario.",
      );
      setDeleting(undefined);
    } finally {
      setSaving(false);
    }
  };

  const roleNames = Array.from(
    new Set((catalog?.roles ?? []).map((role) => role.name)),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        icon={UsersIcon}
        actions={
          canCreate && (
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
              onClick={openCreate}
            >
              <Plus className="size-[15px]" />
              Nuevo usuario
            </Button>
          )
        }
      />

      {notice && (
        <div
          className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground"
          role="status"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {actionError && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {catalogError && !catalog && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning-foreground"
          role="alert"
        >
          <span className="flex-1">
            No se pudieron cargar los roles y permisos del catálogo:{" "}
            {catalogError}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadCatalog()}
          >
            <RefreshCw data-icon="inline-start" />
            Reintentar
          </Button>
        </div>
      )}

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
        view === "table" ? (
          <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
            <SectionHeader
              title={`${result.total} ${result.total === 1 ? "usuario" : "usuarios"} encontrados`}
              description="Administra los usuarios de la plataforma"
              icon={UsersIcon}
              variant="primary"
              actions={
                selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-white/80">
                      {selectedIds.size} seleccionado
                      {selectedIds.size !== 1 ? "s" : ""}
                    </span>
                  </div>
                ) : undefined
              }
            />
            <UsersTable
              users={result.data}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={`${result.total} ${result.total === 1 ? "usuario" : "usuarios"} encontrados`}
              description="Administra los usuarios de la plataforma"
              icon={UsersIcon}
              variant="primary"
            />
            <UsersCards
              users={result.data}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          </div>
        )
      ) : (
        <EmptyState onCreate={openCreate} canCreate={canCreate} />
      )}

      {result && result.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>
            Página {result.page} de {result.totalPages} · {result.total}{" "}
            {result.total === 1 ? "usuario" : "usuarios"}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label="Usuarios por página"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
            </select>
            <Pagination className="w-auto justify-start">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    text="Anterior"
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
                    text="Siguiente"
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

      <UserFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        user={editing}
        saving={saving}
        roles={catalog?.roles ?? []}
        permissions={catalog?.permissions ?? []}
        catalogError={catalogError}
        onOpenChange={setFormOpen}
        onSubmit={submit}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el usuario
              {deleting ? ` “${deleting.firstName} ${deleting.lastName}”` : ""}{" "}
              y todas sus asignaciones. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={saving}
              onClick={confirmDelete}
            >
              {saving ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
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
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar los usuarios
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function EmptyState({
  onCreate,
  canCreate,
}: {
  onCreate: () => void;
  canCreate: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <UsersIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground">
          No se encontraron usuarios
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {canCreate
            ? "Intentá ajustar los filtros o creá un nuevo usuario."
            : "Intentá ajustar los filtros de búsqueda."}
        </p>
      </div>
      {canCreate && (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Nuevo usuario
        </Button>
      )}
    </div>
  );
}
