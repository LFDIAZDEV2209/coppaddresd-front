"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  Search,
  ShieldPlus,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import { groupPermissionsByModule } from "@/features/permissions/types";
import type { Permission } from "@/features/permissions/types";
import {
  fetchPermissions,
} from "@/features/permissions/services/permissions-service";
import { createRole, setRolePermissions } from "../services/roles-service";
import {
  splitBackendErrors,
  validateRoleForm,
  type RoleFieldErrors,
} from "@/features/auth-common/utils/validation";

/**
 * Página dedicada de creación de roles (/roles/new): reemplaza al antiguo
 * modal "Rol personalizado". Mismo flujo — nombre/descripción + selector de
 * permisos agrupados — y tras crear regresa a /roles con feedback.
 */
export function RoleCreatePage() {
  const t = useT();
  const router = useRouter();

  // Formulario básico
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<RoleFieldErrors>({ name: "", description: "" });
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Catálogo de permisos
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Búsqueda
  const [query, setQuery] = useState("");

  // Estados de envío
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);

  // Cargar catálogo al montar (la página es una entrada directa).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const data = await fetchPermissions();
        if (!cancelled) setCatalog(data);
      } catch {
        // El catálogo es esencial: si falla, el usuario puede reintentar
        // volviendo a entrar a la página.
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const validateAll = () =>
    validateRoleForm({ name, description });

  const handleBlur = (field: "name" | "description") => () => {
    setTouched((prev) => new Set(prev).add(field));
    setFieldErrors(validateAll());
  };

  // Agrupar permisos por módulo
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

  // Toggle un permiso individual
  const togglePermission = useCallback((permissionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }, []);

  // Select-all / deselect-all para un módulo
  const toggleModule = useCallback(
    (modulePermissions: Permission[]) => {
      const moduleIds = new Set(modulePermissions.map((p) => p.id));
      const allSelected = modulePermissions.every((p) =>
        selectedIds.has(p.id),
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) {
          for (const id of moduleIds) next.delete(id);
        } else {
          for (const id of moduleIds) next.add(id);
        }
        return next;
      });
    },
    [selectedIds],
  );

  const handleSubmit = async () => {
    const errors = validateAll();
    setFieldErrors(errors);
    setTouched(new Set(["name", "description"]));
    if (errors.name || errors.description) return;

    setSubmitting(true);
    setSubmitErrors(null);
    try {
      // 1) Crear el rol
      const created = await createRole({
        name: name.trim(),
        description: description.trim() || null,
      });
      // 2) Asignar permisos seleccionados (si hay alguno)
      if (selectedIds.size > 0) {
        await setRolePermissions(created.id, [...selectedIds]);
      }
      // 3) Volver al listado con feedback (la lista se recarga al montar).
      router.push(`/roles?creado=${created.id}`);
    } catch (err) {
      setSubmitErrors(
        splitBackendErrors(
          err instanceof Error
            ? err.message
            : t("Error inesperado. Intenta de nuevo."),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/roles")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a roles")}
      </Button>

      <PageHeader
        title={t("Rol personalizado")}
        description={t(
          "Creá un rol con nombre, descripción y los permisos que necesite.",
        )}
        icon={ShieldPlus}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {/* Errores del backend */}
        {submitErrors && submitErrors.length > 0 && (
          <div
            className="rounded-none bg-destructive-soft px-6 py-3 text-sm text-destructive"
            role="alert"
          >
            {submitErrors.length === 1 ? (
              <p>{submitErrors[0]}</p>
            ) : (
              <ul className="list-inside list-disc">
                {submitErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Campos nombre + descripción */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                {t("Nombre")}
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlur("name")}
                placeholder={t("Ej. Analista")}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {touched.has("name") && fieldErrors.name && (
                <p
                  className="text-xs leading-snug whitespace-pre-line text-destructive"
                  role="alert"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Descripción (opcional)")}</Label>
              <textarea
                className="min-h-16 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleBlur("description")}
                placeholder={t("Describí el propósito del rol")}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Selector de permisos */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Buscar permisos")}
                  aria-label={t("Buscar permisos")}
                  className="h-9 pl-8 text-[12.5px]"
                  disabled={submitting}
                />
              </div>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary">
                {selectedIds.size}{" "}
                {selectedIds.size === 1
                  ? t("permiso seleccionado")
                  : t("permisos seleccionados")}
              </span>
            </div>

            {catalogLoading ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-3.5 w-40" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-card/60 p-2">
                {filteredGroups.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    {t("Sin permisos que coincidan con la búsqueda.")}
                  </p>
                ) : (
                  filteredGroups.map((group) => {
                    const allInModuleSelected = group.permissions.every((p) =>
                      selectedIds.has(p.id),
                    );
                    const moduleSelectedCount = group.permissions.filter((p) =>
                      selectedIds.has(p.id),
                    ).length;

                    return (
                      <CreatePermissionGroup
                        key={group.module}
                        module={group.module}
                        permissions={group.permissions}
                        selectedIds={selectedIds}
                        allSelected={allInModuleSelected}
                        moduleSelectedCount={moduleSelectedCount}
                        onToggleModule={toggleModule}
                        onTogglePermission={togglePermission}
                        disabled={submitting}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/roles")}
              disabled={submitting}
            >
              {t("Cancelar")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !name.trim()}
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  {t("Creando...")}
                </>
              ) : (
                t("Crear rol con permisos")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grupo de permisos colapsable (modo creación con checkboxes)               */
/* -------------------------------------------------------------------------- */

interface CreatePermissionGroupProps {
  module: string;
  permissions: Permission[];
  selectedIds: Set<string>;
  allSelected: boolean;
  moduleSelectedCount: number;
  onToggleModule: (permissions: Permission[]) => void;
  onTogglePermission: (permissionId: string) => void;
  disabled: boolean;
}

function CreatePermissionGroup({
  module,
  permissions,
  selectedIds,
  allSelected,
  moduleSelectedCount,
  onToggleModule,
  onTogglePermission,
  disabled,
}: CreatePermissionGroupProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-2 overflow-hidden rounded-xl border border-border/60 bg-card/70">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => onToggleModule(permissions)}
          disabled={disabled}
          aria-label={t("Seleccionar todos de {module}", { module })}
        />
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
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left transition-colors hover:bg-muted/50"
          aria-expanded={expanded}
        >
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[12px] font-bold tracking-wide text-foreground uppercase">
              {module}
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {permissions.length} {t("permisos")}
              {moduleSelectedCount > 0 &&
                ` · ${moduleSelectedCount} ${t("seleccionados")}`}
            </span>
          </span>
          {moduleSelectedCount > 0 && (
            <span className="animate-scale-in rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-bold text-success-foreground">
              {moduleSelectedCount}
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
      </div>
      {expanded && (
        <div className="flex flex-col gap-0.5 border-t border-border/50 px-2 py-2">
          {permissions.map((perm) => (
            <label
              key={perm.id}
              className="flex items-start gap-2.5 rounded-lg p-2 cursor-pointer transition-colors hover:bg-muted/60"
            >
              <Checkbox
                checked={selectedIds.has(perm.id)}
                onCheckedChange={() => onTogglePermission(perm.id)}
                disabled={disabled}
                className="mt-0.5"
                aria-label={perm.name}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[12.5px] leading-tight font-medium text-foreground">
                  {perm.name}
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
          ))}
        </div>
      )}
    </section>
  );
}
