"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  Lock,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/providers/i18n-provider";
import { PermissionGroups } from "@/components/permissions/permission-groups";
import { SectionHeader } from "@/components/layout/section-header";
import {
  groupPermissionsByModule,
  type Permission,
} from "@/features/permissions/types";
import {
  fetchRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} from "@/features/permissions/services/permissions-service";
import { syncAssignments } from "@/features/auth-common/services/assignments";
import type { Role } from "../types";

interface RolePermissionsPanelProps {
  /** Rol seleccionado (null si no hay roles para mostrar). */
  role: Role | null;
  /** Catálogo de permisos para agrupar los checkboxes. */
  catalog: Permission[];
  canAssignPermissions: boolean;
  /** Editar/eliminar del rol seleccionado, ya con gating de rol de sistema. */
  canEditRole: boolean;
  canDeleteRole: boolean;
  onEdit: () => void;
  onDelete: () => void;
  /** Notifica si hay cambios sin guardar (la página custodia el cambio de rol). */
  onDirtyChange: (dirty: boolean) => void;
  /** Tras guardar: cantidad final de permisos del rol (para el listado). */
  onSaved: (roleId: string, permissionCount: number) => void;
  /** Propaga errores de guardado hacia el banner de la página. */
  onError: (message: string | null) => void;
}

/**
 * Panel de asignación de permisos de un rol.
 *
 * Responsabilidades:
 * - Carga los permisos actuales del rol cada vez que cambia la selección.
 * - Edita la selección con checkboxes agrupados por módulo (solo con
 *   Permissions.Assign), con búsqueda y grupos colapsables.
 * - Detecta cambios sin guardar (diff contra el estado del servidor) y
 *   muestra una barra sticky de guardado; la página impide cambiar de rol
 *   sin confirmar cuando hay cambios pendientes.
 * - Guarda calculando el diff contra el estado REAL del servidor en el
 *   momento de guardar (nunca contra el snapshot cacheado), para que los
 *   reintentos no re-emitan DELETEs sobre asignaciones ya removidas.
 * - "Cancelar" restaura desde el servidor, no desde el snapshot stale.
 */
export function RolePermissionsPanel({
  role,
  catalog,
  canAssignPermissions,
  canEditRole,
  canDeleteRole,
  onEdit,
  onDelete,
  onDirtyChange,
  onSaved,
  onError,
}: RolePermissionsPanelProps) {
  const t = useT();
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Carga los permisos del rol cada vez que cambia la selección. Al iniciar,
  // se limpia el estado de "cambios sin guardar" de la página.
  useEffect(() => {
    if (!role) return;
    onDirtyChange(false);
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      setQuery("");
      fetchRolePermissions(role.id)
        .then((data) => {
          if (cancelled) return;
          const ids = new Set(data.map((permission) => permission.id));
          setPermissionsFor(role.id);
          setChecked(ids);
          setBaseline(new Set(ids));
        })
        .catch((err) => {
          if (cancelled) return;
          setPermissionsFor(role.id);
          setChecked(new Set());
          setBaseline(new Set());
          setLoadError(
            err instanceof Error
              ? err.message
              : t("Error al cargar los permisos del rol."),
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // onDirtyChange/setQuery/setBaseline son estables; el disparador es el rol.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Feedback de guardado exitoso: se autodesmite a los 4 s.
  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 4000);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  const togglePermission = useCallback((permissionId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }, []);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(catalog),
    [catalog],
  );
  const allPermissionIds = useMemo(
    () => new Set(catalog.map((permission) => permission.id)),
    [catalog],
  );

  const toggleAll = useCallback(() => {
    setChecked((prev) => {
      if (prev.size === allPermissionIds.size && allPermissionIds.size > 0) {
        return new Set();
      }
      return new Set(allPermissionIds);
    });
  }, [allPermissionIds]);

  // Diff contra el baseline del servidor: define la barra de guardado.
  const dirty = useMemo(() => {
    if (baseline.size !== checked.size) return true;
    for (const id of checked) {
      if (!baseline.has(id)) return true;
    }
    return false;
  }, [baseline, checked]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const addedCount = useMemo(
    () => [...checked].filter((id) => !baseline.has(id)).length,
    [checked, baseline],
  );
  const removedCount = useMemo(
    () => [...baseline].filter((id) => !checked.has(id)).length,
    [checked, baseline],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const hasVisibleGroups = useMemo(() => {
    if (!normalizedQuery) return permissionGroups.length > 0;
    return permissionGroups.some((group) =>
      group.permissions.some(
        (permission) =>
          permission.name.toLowerCase().includes(normalizedQuery) ||
          permission.code.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [permissionGroups, normalizedQuery]);

  const savePermissions = async () => {
    if (!role) return;
    setSaving(true);
    setLoadError(null);
    onError(null);
    try {
      const result = await syncAssignments(
        // Baseline fresco al momento de guardar (evita diffs stale).
        async () =>
          (await fetchRolePermissions(role.id)).map(
            (permission) => permission.id,
          ),
        [...checked],
        (permissionId) => assignPermissionToRole(role.id, permissionId),
        (permissionId) => removePermissionFromRole(role.id, permissionId),
      );

      // Refresca el estado local con el resultado real del servidor.
      const updated = await fetchRolePermissions(role.id);
      const ids = new Set(updated.map((permission) => permission.id));
      setPermissionsFor(role.id);
      setChecked(ids);
      setBaseline(new Set(ids));
      onSaved(role.id, updated.length);

      if (result.errors.length > 0) {
        onError(
          t(
            "Se aplicaron {applied} cambios, pero {errors} asignaciones fallaron. Reintentá guardar: las pendientes se completarán.",
            {
              applied: String(result.applied),
              errors: String(result.errors.length),
            },
          ),
        );
      } else {
        setSavedFlash(true);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("Error al guardar los permisos."),
      );
    } finally {
      setSaving(false);
    }
  };

  // "Cancelar" restaura desde el servidor (no desde el snapshot cacheado).
  const resetChecked = async () => {
    if (!role) return;
    setSaving(true);
    setLoadError(null);
    try {
      const fresh = await fetchRolePermissions(role.id);
      const ids = new Set(fresh.map((permission) => permission.id));
      setPermissionsFor(role.id);
      setChecked(ids);
      setBaseline(new Set(ids));
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("Error al actualizar los permisos del rol."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!role) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <ShieldCheck className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {t("Seleccioná un rol para configurar sus permisos")}
        </p>
      </div>
    );
  }

  const showSkeleton = loading || permissionsFor !== role.id;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-hidden rounded-t-2xl">
        <SectionHeader
          title={`Permisos de ${role.name}`}
          description={t("Configurá qué permisos tiene este rol")}
          icon={ShieldCheck}
          variant="primary"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={onEdit}
                disabled={!canEditRole}
                title={
                  canEditRole
                    ? undefined
                    : t(
                        "Rol de sistema: se requiere System.AdminSettings para editarlo",
                      )
                }
              >
                <Pencil className="size-[15px]" />
                {t("Editar")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/20 bg-white/10 text-white hover:bg-white/20"
                onClick={onDelete}
                disabled={!canDeleteRole}
                title={
                  canDeleteRole
                    ? undefined
                    : t(
                        "Rol de sistema: se requiere System.AdminSettings para eliminarlo",
                      )
                }
              >
                <Trash2 className="size-[15px]" />
                {t("Eliminar")}
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex flex-col gap-4 p-5">
        {showSkeleton ? (
          <PermissionsSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="relative w-full max-w-64">
                <Search
                  className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("Buscar permiso...")}
                  aria-label={t("Buscar permiso...")}
                  className="h-9 pl-8 text-[12.5px]"
                />
              </div>
              <Badge
                variant="outline"
                className="ml-auto shrink-0 text-[10.5px] font-semibold text-muted-foreground"
              >
                {t("{checked} de {total} asignados", {
                  checked: String(checked.size),
                  total: String(allPermissionIds.size),
                })}
              </Badge>
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={
                  checked.size === allPermissionIds.size &&
                  allPermissionIds.size > 0
                }
                indeterminate={
                  checked.size > 0 && checked.size < allPermissionIds.size
                }
                onCheckedChange={toggleAll}
                disabled={!canAssignPermissions}
              />
              <span className="text-[12px] font-semibold text-foreground">
                {t("Seleccionar todos")}
              </span>
            </label>

            <Separator />

            {normalizedQuery && !hasVisibleGroups ? (
              <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border py-8 text-center">
                <p className="text-[13px] font-medium text-foreground">
                  {t("Ningún permiso coincide con la búsqueda")}
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  {t("Probá con otro término.")}
                </p>
              </div>
            ) : (
              <PermissionGroups
                groups={permissionGroups}
                selected={checked}
                onToggle={togglePermission}
                disabled={!canAssignPermissions}
                search={query}
              />
            )}

            {!canAssignPermissions && (
              <p className="mt-1 flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t(
                  "No tenés permiso para modificar la asignación de permisos (Permissions.Assign).",
                )}
              </p>
            )}
          </>
        )}

        {savedFlash && !loadError && (
          <div
            className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-[13px] font-medium text-success-foreground animate-slide-down"
            role="status"
          >
            <CheckCircle2
              className="size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            {t("Cambios guardados")}
          </div>
        )}

        {loadError && (
          <p
            className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {loadError}
          </p>
        )}
      </div>

      {/* Barra sticky de guardado: visible solo con cambios sin guardar. */}
      {dirty && canAssignPermissions && !showSkeleton && (
        <div className="sticky bottom-3 z-10 mx-4 mb-3 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft/95 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur animate-slide-up">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
            <TriangleAlert className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold text-warning-foreground">
              {t("Cambios sin guardar")}
            </span>
            <span className="truncate text-[11px] text-warning-foreground/80">
              {t("{added} para agregar · {removed} para quitar", {
                added: String(addedCount),
                removed: String(removedCount),
              })}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={resetChecked}
              disabled={saving}
            >
              {t("Cancelar")}
            </Button>
            <Button
              size="sm"
              onClick={savePermissions}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-[15px] animate-spin" />
                  {t("Guardando...")}
                </>
              ) : (
                t("Guardar cambios")
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl border border-border p-3"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
