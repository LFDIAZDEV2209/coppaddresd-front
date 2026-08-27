"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Key,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
import { StatusBadge } from "@/components/feedback/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import type { Permission } from "@/features/permissions/types";
import {
  fetchPermissions,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  formatDate,
  getStatusColor,
} from "../services/roles-service";
import type { Role, RoleCreateInput, RoleUpdateInput } from "../types";
import { RoleFormDialog } from "./role-form-dialog";
import { RolePermissionsPanel } from "./role-permissions-panel";

export function RolesPageContent() {
  const t = useT();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("Roles.Create");
  const canUpdate = hasPermission("Roles.Update");
  const canDelete = hasPermission("Roles.Delete");
  const canAssignPermissions = hasPermission("Permissions.Assign");

  const [roles, setRoles] = useState<Role[] | null>(null);
  const [catalog, setCatalog] = useState<Permission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | undefined>();
  const [savingRole, setSavingRole] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Role | undefined>();

  /**
   * Aplica la lista de roles conservando el rol seleccionado si sigue
   * existiendo; si no (o sin selección), pasa al primero. Es el único lugar
   * que decide la selección tras cargas/creación/borrado.
   */
  const applyRoles = useCallback((rolesData: Role[]) => {
    setRoles(rolesData);
    setSelectedRoleId((prev) =>
      prev && rolesData.some((role) => role.id === prev)
        ? prev
        : (rolesData[0]?.id ?? null),
    );
  }, []);

  // Carga inicial: roles + catálogo de permisos (paralelo).
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
      ]);
      setCatalog(permissionsData);
      applyRoles(rolesData);
    } catch (err) {
      setRoles(null);
      setError(
        err instanceof Error ? err.message : t("Error al cargar los roles."),
      );
    } finally {
      setLoading(false);
    }
  }, [applyRoles, t]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditing(role);
    setFormOpen(true);
  };

  /**
   * Guarda el rol y recarga la lista. Los errores (ej. "El nombre del rol ya
   * existe") se propagan al dialog, que los muestra dentro del modal.
   */
  const submitRole = async (
    input: RoleCreateInput | RoleUpdateInput,
    id?: string,
  ) => {
    setSavingRole(true);
    try {
      if (id) {
        await updateRole(id, input as RoleUpdateInput);
      } else {
        const created = await createRole(input as RoleCreateInput);
        setSelectedRoleId(created.id);
      }
      // Se aplica la lista antes de cerrar: si la recarga falla, el dialog
      // queda abierto mostrando el error.
      applyRoles(await fetchRoles());
      setFormOpen(false);
    } finally {
      setSavingRole(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSavingRole(true);
    setActionError(null);
    try {
      await deleteRole(deleting.id);
      setDeleting(undefined);
      applyRoles(await fetchRoles());
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("Error al eliminar el rol."),
      );
      setDeleting(undefined);
    } finally {
      setSavingRole(false);
    }
  };

  const selectedRole = roles?.find((role) => role.id === selectedRoleId) ?? null;

  if (loading) {
    return <RolesSkeleton />;
  }

  if (error && !roles) {
    return <RolesErrorState message={error} onRetry={retry} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t("Roles y permisos")}
        description={t("Administración de roles y permisos del sistema")}
        icon={ShieldCheck}
        actions={
          canCreate && (
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
              onClick={openCreate}
            >
              <Plus className="size-[15px]" />
              {t("Nuevo rol")}
            </Button>
          )
        }
      />

      {actionError && (
        <div
          className="rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
        {/* Tarjetas de roles */}
        <div className="flex flex-col gap-3">
          {(roles ?? []).map((role) => {
            const isSelected = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary-soft shadow-sm"
                    : "border-border bg-card hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="size-4" />
                    </div>
                    <h3 className="truncate text-[13px] font-semibold text-foreground">
                      {role.name}
                    </h3>
                  </div>
                  <StatusBadge
                    status={role.isActive ? t("Activo") : t("Inactivo")}
                    color={getStatusColor(role.isActive)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {role.description || t("Sin descripción")}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Key className="size-3" />
                  <span>{t("Permisos")}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(role.createdAt)}
                  </span>
                </div>
              </button>
            );
          })}
          {roles?.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("No hay roles todavía")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canCreate
                  ? t("Creá el primer rol para comenzar.")
                  : t("No hay roles creados.")}
              </p>
            </div>
          )}
        </div>

        {/* Panel de permisos del rol seleccionado */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`Permisos de ${selectedRole?.name ?? ""}`}
            description={t("Configurá qué permisos tiene este rol")}
            icon={ShieldCheck}
            variant="primary"
            actions={
              <div className="flex items-center gap-2">
                {canUpdate && selectedRole && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 border-white/20 text-white hover:bg-white/10"
                    onClick={() => openEdit(selectedRole)}
                  >
                    <Pencil className="size-[15px]" />
                    {t("Editar")}
                  </Button>
                )}
                {canDelete && selectedRole && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 border-white/20 text-white hover:bg-white/10"
                    onClick={() => setDeleting(selectedRole)}
                  >
                    <Trash2 className="size-[15px]" />
                    {t("Eliminar")}
                  </Button>
                )}
              </div>
            }
          />
          <RolePermissionsPanel
            role={selectedRole}
            catalog={catalog ?? []}
            canAssignPermissions={canAssignPermissions}
            onError={setActionError}
          />
        </div>
      </div>

      <RoleFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        role={editing}
        saving={savingRole}
        onOpenChange={setFormOpen}
        onSubmit={submitRole}
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
            <AlertDialogTitle>{t("¿Eliminar rol?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará el rol "{name}". Los usuarios que lo tengan asignado perderán sus permisos. Esta acción no se puede deshacer.', { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRole}>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={savingRole}
              onClick={confirmDelete}
            >
              {savingRole ? t("Eliminando...") : t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RolesSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-[88px] rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}

function RolesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 p-6 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        {t("No pudimos cargar los roles")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}
