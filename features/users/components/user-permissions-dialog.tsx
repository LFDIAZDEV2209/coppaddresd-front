"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import { groupPermissionsByModule } from "@/features/permissions/types";
import type { Permission } from "@/features/permissions/types";
import {
  fetchPermissions,
  fetchUserPermissions,
  assignPermissionToUser,
  removePermissionFromUser,
} from "@/features/permissions/services/permissions-service";
import { fetchRoles } from "@/features/roles/services/roles-service";
import { fetchRolePermissions } from "@/features/permissions/services/permissions-service";

interface UserPermissionsDialogProps {
  userId: string;
  userName: string;
  roles: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo de permisos directos de un usuario:
 * - Carga catálogo + permisos directos del usuario + permisos heredados por roles.
 * - Los permisos heredados se muestran como solo lectura (badge "vía rol").
 * - Los directos se pueden asignar/quitar instantáneamente (toggle optimista).
 * - Revertir si falla la llamada al backend + toast con el mensaje del servidor.
 */
export function UserPermissionsDialog({
  userId,
  userName,
  roles,
  open,
  onOpenChange,
}: UserPermissionsDialogProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [directIds, setDirectIds] = useState<Set<string>>(new Set());
  const [inheritedIds, setInheritedIds] = useState<Set<string>>(new Set());
  const [inheritedOrigin, setInheritedOrigin] = useState<Map<string, string>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  // Banner de error al asignar/quitar (se auto-oculta tras 5 s).
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQuery("");
    try {
      const [catalogData, directPerms, allRoles] = await Promise.all([
        fetchPermissions(),
        fetchUserPermissions(userId),
        fetchRoles().catch(() => null),
      ]);

      setCatalog(catalogData);
      setDirectIds(new Set(directPerms.map((p) => p.id)));

      // Permisos heredados: unión de los permisos de cada rol asignado al usuario.
      if (allRoles) {
        const userRoles = allRoles.filter((r) => roles.includes(r.name));
        const roleResults = await Promise.all(
          userRoles.map(async (r) => ({
            roleName: r.name,
            permissions: await fetchRolePermissions(r.id),
          })),
        );
        const inheritedSet = new Set<string>();
        const originMap = new Map<string, string>();
        for (const entry of roleResults) {
          for (const perm of entry.permissions) {
            inheritedSet.add(perm.id);
            if (!originMap.has(perm.id)) originMap.set(perm.id, entry.roleName);
          }
        }
        setInheritedIds(inheritedSet);
        setInheritedOrigin(originMap);
      } else {
        // Degradar: no se pudieron cargar roles — la sección heredada queda vacía.
        setInheritedIds(new Set());
        setInheritedOrigin(new Map());
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Error al cargar los permisos del usuario."),
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, roles, open]);

  // Carga los datos cuando el diálogo se abre.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void loadData();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-ocultar error de acción tras 5 s.
  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(timer);
  }, [actionError]);

  const handleToggle = useCallback(
    async (permissionId: string) => {
      const wasDirect = directIds.has(permissionId);
      // Optimista: flip inmediato.
      setDirectIds((prev) => {
        const next = new Set(prev);
        if (wasDirect) next.delete(permissionId);
        else next.add(permissionId);
        return next;
      });
      setToggling(permissionId);
      setActionError(null);
      try {
        if (wasDirect) {
          await removePermissionFromUser(userId, permissionId);
        } else {
          await assignPermissionToUser(userId, permissionId);
        }
      } catch (err) {
        // Revertir el cambio optimista.
        setDirectIds((prev) => {
          const next = new Set(prev);
          if (wasDirect) next.add(permissionId);
          else next.delete(permissionId);
          return next;
        });
        const message =
          err instanceof Error ? err.message : t("Error al actualizar permiso.");
        setActionError(message);
      } finally {
        setToggling(null);
      }
    },
    [directIds, userId, t],
  );

  const groups = useMemo(
    () => groupPermissionsByModule(catalog),
    [catalog],
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="flex items-center gap-2">
                {t("Permisos de ")} {userName}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "Permisos directos del usuario, además de los que obtiene por sus roles.",
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Banner de error de acción (asignar/quitar). */}
        {actionError && (
          <div
            className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{actionError}</span>
          </div>
        )}

        {loading ? (
          <PermissionsDialogSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <RefreshCw data-icon="inline-start" />
              {t("Reintentar")}
            </Button>
          </div>
        ) : (
          <>
            {/* Buscador */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Buscar permisos")}
                  aria-label={t("Buscar permisos")}
                  className="h-9 pl-8 text-[12.5px]"
                />
              </div>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary">
                {directIds.size}{" "}
                {directIds.size === 1
                  ? t("permiso directo")
                  : t("permisos directos")}
              </span>
            </div>

            {/* Lista de permisos agrupados por módulo */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-border/70 bg-card/60 p-2">
              {filteredGroups.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  {t("Sin permisos que coincidan con la búsqueda.")}
                </p>
              ) : (
                filteredGroups.map((group) => {
                  const open = Boolean(query.trim());
                  return (
                    <DialogPermissionGroup
                      key={group.module}
                      module={group.module}
                      permissions={group.permissions}
                      directIds={directIds}
                      inheritedIds={inheritedIds}
                      inheritedOrigin={inheritedOrigin}
                      onToggle={handleToggle}
                      toggling={toggling}
                      defaultOpen={open}
                    />
                  );
                })
              )}
            </div>

            {/* Leyenda de heredados */}
            {inheritedIds.size > 0 && (
              <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-teal-600" />
                {t(
                  "Los permisos que tus roles ya incluyen aparecen bloqueados: no hace falta concederlos de nuevo.",
                )}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grupo de permisos colapsable dentro del diálogo                            */
/* -------------------------------------------------------------------------- */

interface DialogPermissionGroupProps {
  module: string;
  permissions: Permission[];
  directIds: Set<string>;
  inheritedIds: Set<string>;
  inheritedOrigin: Map<string, string>;
  onToggle: (permissionId: string) => void;
  toggling: string | null;
  defaultOpen: boolean;
}

function DialogPermissionGroup({
  module,
  permissions,
  directIds,
  inheritedIds,
  inheritedOrigin,
  onToggle,
  toggling,
  defaultOpen,
}: DialogPermissionGroupProps) {
  const t = useT();
  // Expandir automáticamente cuando se busca: solo cambia a true, nunca a false
  // (respeta la decisión del usuario de colapsar).
  const [expanded, setExpanded] = useState(defaultOpen);

  const selectedCount = permissions.filter((p) => directIds.has(p.id)).length;

  return (
    <section className="mb-2 overflow-hidden rounded-xl border border-border/60 bg-card/70">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[12px] font-bold tracking-wide text-foreground uppercase">
            {module}
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            {permissions.length} {t("permisos")}
            {selectedCount > 0 &&
              ` · ${selectedCount} ${t("seleccionados")}`}
          </span>
        </span>
        {selectedCount > 0 && (
          <span className="animate-scale-in rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-bold text-success-foreground">
            {selectedCount}
          </span>
        )}
        <svg
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 border-t border-border/50 px-2 py-2">
          {permissions.map((perm) => {
            const isDirect = directIds.has(perm.id);
            const isInherited = inheritedIds.has(perm.id);
            const originRole = inheritedOrigin.get(perm.id);
            const isToggling = toggling === perm.id;
            return (
              <label
                key={perm.id}
                className={`flex items-start gap-2.5 rounded-lg p-2 transition-colors ${
                  isInherited && !isDirect
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-muted/60"
                }`}
              >
                <Checkbox
                  checked={isDirect}
                  disabled={isInherited && !isDirect}
                  onCheckedChange={() => {
                    if (!isInherited || isDirect) void onToggle(perm.id);
                  }}
                  className="mt-0.5"
                  aria-label={perm.name}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[12.5px] leading-tight font-medium text-foreground">
                      {perm.name}
                    </span>
                    {isToggling && (
                      <LoaderCircle className="size-3 animate-spin text-primary" />
                    )}
                    {isInherited && originRole && (
                      <Badge
                        variant="outline"
                        className="border-teal-200 bg-teal-50 px-1.5 py-px text-[9.5px] font-semibold text-teal-700"
                      >
                        <CheckCircle2 className="mr-0.5 size-2.5" />
                        {t("vía")} {originRole}
                      </Badge>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    {perm.code}
                  </span>
                  {perm.description && (
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {perm.description}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton de carga                                                          */
/* -------------------------------------------------------------------------- */

function PermissionsDialogSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
