"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import type { Permission } from "@/features/permissions/types";
import {
  fetchPermissions,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchRolePermissions,
} from "../services/roles-service";
import type { Role, RoleCreateInput, RoleUpdateInput } from "../types";
import { RoleCard } from "./role-card";
import { RoleCreateDialog } from "./role-create-dialog";
import { RoleFormDialog } from "./role-form-dialog";
import { RolePermissionsPanel } from "./role-permissions-panel";

export function RolesPageContent() {
  const t = useT();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("Roles.Create");
  const canUpdate = hasPermission("Roles.Update");
  const canDelete = hasPermission("Roles.Delete");
  const canAssignPermissions = hasPermission("Permissions.Assign");
  // Los roles de sistema solo se editan/eliminan con System.AdminSettings
  // (el backend lo rechaza igual; acá se deshabilita la acción).
  const canSystemChanges = hasPermission("System.AdminSettings");

  const [roles, setRoles] = useState<Role[] | null>(null);
  const [catalog, setCatalog] = useState<Permission[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  /** Hay cambios sin guardar en el panel (para custodiar el cambio de rol). */
  const [panelDirty, setPanelDirty] = useState(false);
  /** Rol destino pendiente de confirmar cuando hay cambios sin guardar. */
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

  /**
   * Cantidad de permisos por rol: el listado del backend no la incluye, se
   * resuelve con 1 request por rol en segundo plano (roles acotados: decenas).
   */
  const loadCounts = useCallback(async (rolesData: Role[]) => {
    const results = await Promise.allSettled(
      rolesData.map(async (role) => ({
        id: role.id,
        count: (await fetchRolePermissions(role.id)).length,
      })),
    );
    const next: Record<string, number> = {};
    results.forEach((result) => {
      if (result.status === "fulfilled")
        next[result.value.id] = result.value.count;
    });
    setCounts(next);
  }, []);

  const refreshRoles = useCallback(async () => {
    const rolesData = await fetchRoles();
    applyRoles(rolesData);
    void loadCounts(rolesData);
  }, [applyRoles, loadCounts]);

  // Carga inicial: roles + catálogo de permisos (paralelo); counts en 2º plano.
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
      void loadCounts(rolesData);
    } catch (err) {
      setRoles(null);
      setError(
        err instanceof Error ? err.message : t("Error al cargar los roles."),
      );
    } finally {
      setLoading(false);
    }
  }, [applyRoles, loadCounts, t]);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  /** Cambio de rol con custodia: si hay cambios sin guardar, pide confirmación. */
  const requestSelect = useCallback(
    (roleId: string) => {
      if (roleId === selectedRoleId) return;
      if (panelDirty) {
        setPendingRoleId(roleId);
        return;
      }
      setSelectedRoleId(roleId);
    },
    [panelDirty, selectedRoleId],
  );

  const confirmSwitch = () => {
    if (pendingRoleId) setSelectedRoleId(pendingRoleId);
    setPendingRoleId(null);
  };

  const openCreate = () => {
    setEditing(undefined);
    setCreateDialogOpen(true);
  };
  const openEdit = (role: Role) => {
    setEditing(role);
    setFormOpen(true);
  };

  /** Gating de roles de sistema (el backend también lo valida). */
  const canTouchRole = useCallback(
    (role: Role | null) =>
      Boolean(role && (!role.isSystem || canSystemChanges)),
    [canSystemChanges],
  );

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
      await refreshRoles();
      setFormOpen(false);
    } finally {
      setSavingRole(false);
    }
  };

  /** Callback tras crear rol personalizado: refresca la lista y selecciona. */
  const handleCustomRoleCreated = useCallback(
    (createdRole: Role) => {
      void refreshRoles().then(() => {
        setSelectedRoleId(createdRole.id);
      });
    },
    [refreshRoles],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setSavingRole(true);
    setActionError(null);
    try {
      await deleteRole(deleting.id);
      setDeleting(undefined);
      await refreshRoles();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("Error al eliminar el rol."),
      );
      setDeleting(undefined);
    } finally {
      setSavingRole(false);
    }
  };

  /** Tras guardar permisos: actualiza el contador del rol en el listado. */
  const handleSaved = useCallback((roleId: string, permissionCount: number) => {
    setCounts((prev) => ({ ...prev, [roleId]: permissionCount }));
  }, []);

  const selectedRole =
    roles?.find((role) => role.id === selectedRoleId) ?? null;
  const normalizedSearch = roleSearch.trim().toLowerCase();
  const filteredRoles = useMemo(() => {
    const all = roles ?? [];
    if (!normalizedSearch) return all;
    return all.filter(
      (role) =>
        role.name.toLowerCase().includes(normalizedSearch) ||
        (role.description ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [roles, normalizedSearch]);

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

      {/* Mobile: selector horizontal de roles, sticky bajo el topbar. */}
      <div className="sticky top-0 z-10 -mx-6 bg-background/90 px-6 py-2 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(roles ?? []).map((role) => {
            const isSelected = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => requestSelect(role.id)}
                aria-pressed={isSelected}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {role.name}
                <span
                  className={`text-[10px] font-medium ${
                    isSelected
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {counts[role.id] ?? "…"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Listado de roles: sticky mientras se recorre el panel de permisos */}
        <aside className="hidden flex-col gap-3 lg:sticky lg:top-0 lg:flex lg:max-h-[calc(100vh-6.5rem)]">
          <div className="flex items-center gap-2 px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("Todos los roles")}
            </h2>
            <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {(roles ?? []).length}
            </span>
          </div>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={roleSearch}
              onChange={(event) => setRoleSearch(event.target.value)}
              placeholder={t("Buscar rol...")}
              aria-label={t("Buscar rol...")}
              className="h-9 pl-9 pr-8 text-[12.5px]"
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch("")}
                aria-label={t("Limpiar búsqueda")}
                className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pb-1 pr-0.5">
            {filteredRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={role.id === selectedRoleId}
                permissionCount={counts[role.id]}
                onSelect={() => requestSelect(role.id)}
              />
            ))}

            {filteredRoles.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
                <p className="text-[13px] font-medium text-foreground">
                  {t("Sin roles que coincidan")}
                </p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {t("Ajustá el término de búsqueda.")}
                </p>
              </div>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {t("Nuevo rol")}
              </button>
            )}
          </div>
        </aside>

        {/* Panel de permisos del rol seleccionado */}
        <RolePermissionsPanel
          role={selectedRole}
          catalog={catalog ?? []}
          canAssignPermissions={canAssignPermissions}
          canEditRole={
            Boolean(selectedRole) && canUpdate && canTouchRole(selectedRole)
          }
          canDeleteRole={
            Boolean(selectedRole) && canDelete && canTouchRole(selectedRole)
          }
          onEdit={() => selectedRole && openEdit(selectedRole)}
          onDelete={() => selectedRole && setDeleting(selectedRole)}
          onDirtyChange={setPanelDirty}
          onSaved={handleSaved}
          onError={setActionError}
        />
      </div>

      <RoleFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        role={editing}
        saving={savingRole}
        onOpenChange={setFormOpen}
        onSubmit={submitRole}
      />

      <RoleCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCustomRoleCreated}
      />

      {/* Confirmación: cambiar de rol con cambios sin guardar */}
      <AlertDialog
        open={Boolean(pendingRoleId)}
        onOpenChange={(open) => !open && setPendingRoleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-warning-soft text-warning-foreground">
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Descartar cambios?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Tenés cambios sin guardar en el rol "{role}". Si cambiás de rol, se perderán.',
                {
                  role: roles?.find((r) => r.id === selectedRoleId)?.name ?? "",
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Seguir editando")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>
              {t("Descartar y cambiar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {t(
                'Se eliminará el rol "{name}". Los usuarios que lo tengan asignado perderán sus permisos. Esta acción no se puede deshacer.',
                { name: deleting?.name ?? "" },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRole}>
              {t("Cancelar")}
            </AlertDialogCancel>
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
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 lg:flex">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 rounded-lg" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[92px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-2xl" />
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
