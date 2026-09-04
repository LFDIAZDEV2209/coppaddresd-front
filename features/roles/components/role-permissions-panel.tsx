"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/providers/i18n-provider";
import { PermissionGroups } from "@/components/permissions/permission-groups";
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
  /** Propaga errores de guardado hacia el banner de la página. */
  onError: (message: string | null) => void;
}

/**
 * Panel de asignación de permisos de un rol.
 *
 * Responsabilidades:
 * - Carga los permisos actuales del rol cada vez que cambia la selección.
 * - Edita la selección con checkboxes agrupados por módulo (solo con
 *   Permissions.Assign).
 * - Guarda calculando el diff contra el estado REAL del servidor en el
 *   momento de guardar (nunca contra el snapshot cacheado), para que los
 *   reintentos no re-emitan DELETEs sobre asignaciones ya removidas.
 * - "Cancelar" restaura desde el servidor, no desde el snapshot stale.
 */
export function RolePermissionsPanel({
  role,
  catalog,
  canAssignPermissions,
  onError,
}: RolePermissionsPanelProps) {
  const t = useT();
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Carga los permisos del rol cada vez que cambia la selección.
  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      fetchRolePermissions(role.id)
        .then((data) => {
          if (cancelled) return;
          setPermissionsFor(role.id);
          setChecked(new Set(data.map((permission) => permission.id)));
        })
        .catch((err) => {
          if (cancelled) return;
          setPermissionsFor(role.id);
          setChecked(new Set());
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
  }, [role, t]);

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
      setPermissionsFor(role.id);
      setChecked(new Set(updated.map((permission) => permission.id)));

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
      setPermissionsFor(role.id);
      setChecked(new Set(fresh.map((permission) => permission.id)));
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
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
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
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-0 overflow-y-auto p-5">
        {showSkeleton ? (
          <PermissionsSkeleton />
        ) : (
          <>
            <label className="flex items-center gap-2 pb-4">
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
              <Badge variant="outline" className="ml-auto text-[10px]">
                {checked.size} / {allPermissionIds.size}
              </Badge>
            </label>

            <Separator />

            <PermissionGroups
              groups={permissionGroups}
              selected={checked}
              onToggle={togglePermission}
              disabled={!canAssignPermissions}
              className="pt-4"
            />

            {!canAssignPermissions && (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {t(
                  "No tenés permiso para modificar la asignación de permisos (Permissions.Assign).",
                )}
              </p>
            )}
          </>
        )}

        {loadError && (
          <p
            className="mt-4 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {loadError}
          </p>
        )}
      </div>

      {canAssignPermissions && (
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={resetChecked}
            disabled={saving}
          >
            {t("Cancelar")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
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
      )}
    </div>
  );
}

function PermissionsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
