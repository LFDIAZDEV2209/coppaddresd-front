"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronsUpDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGroups } from "@/components/permissions/permission-groups";
import { useAuth } from "@/providers/auth-provider";
import { groupPermissionsByModule } from "@/features/permissions/types";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import {
  splitBackendErrors,
  validateUserForm,
  type UserFieldErrors,
} from "@/features/auth-common/utils/validation";
import type { User, UserFormValues } from "../types";
import {
  fetchUserPermissions,
  fetchUserRoles,
} from "../services/users-service";
import { useT } from "@/providers/i18n-provider";

interface UserFormDialogProps {
  open: boolean;
  /** undefined = creación. */
  user?: User;
  saving: boolean;
  roles: Role[];
  permissions: Permission[];
  /** Error al cargar el catálogo de roles/permisos (se muestra en el form). */
  catalogError?: string | null;
  onOpenChange: (open: boolean) => void;
  /**
   * Guarda el usuario (la página orquesta el diff de roles/permisos y la
   * sesión invalidada). Si falla, debe lanzar para que el dialog muestre el
   * error dentro del modal.
   */
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const emptyForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  isActive: true,
};

const emptyFieldErrors: UserFieldErrors = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
};

const ALL_FIELDS = ["email", "password", "firstName", "lastName"] as const;

export function UserFormDialog({
  open,
  user,
  saving,
  roles,
  permissions,
  catalogError = null,
  onOpenChange,
  onSubmit,
}: UserFormDialogProps) {
  const { hasPermission } = useAuth();
  const canAssignRoles = hasPermission("Roles.Assign");
  const canAssignPermissions = hasPermission("Permissions.Assign");
  const t = useT();

  const [form, setForm] = useState(() =>
    user
      ? {
          email: user.email,
          password: "",
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
        }
      : emptyForm,
  );
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [permissionIds, setPermissionIds] = useState<Set<string>>(new Set());
  // Snapshots de la precarga: permiten detectar si las asignaciones cambiaron
  // al guardar (el backend solo invalida el security stamp con cambios reales).
  const [originalRoleIds, setOriginalRoleIds] = useState<Set<string>>(new Set());
  const [originalPermissionIds, setOriginalPermissionIds] = useState<Set<string>>(new Set());
  // En edición arranca cargando (skeleton); en creación no hay nada que cargar.
  const [loadingAssignments, setLoadingAssignments] = useState(Boolean(user));
  // Precarga fallida = submit bloqueado (guardar mandaría conjuntos vacíos y
  // el sync total del backend borraría roles/permisos en silencio).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Validación client-side por campo (solo se muestran campos tocados).
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>(emptyFieldErrors);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Errores del backend/red: se muestran en una caja dentro del modal.
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateAll = useCallback(() => {
    return validateUserForm({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      isEditing: Boolean(user),
    });
  }, [form, user]);

  const handleBlur = (field: (typeof ALL_FIELDS)[number]) => () => {
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setFieldErrors(validateAll());
  };

  // Al editar, carga los roles y permisos DIRECTOS actuales del usuario para
  // precargar los selectores. En creación arrancan vacíos. `retryKey` permite
  // reintentar tras una precarga fallida.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingAssignments(true);
      setLoadError(null);
      Promise.all([fetchUserRoles(user.id), fetchUserPermissions(user.id)])
        .then(([userRoles, userPermissions]) => {
          if (cancelled) return;
          const roles = new Set(userRoles.map((role) => role.id));
          const permissions = new Set(
            userPermissions.map((permission) => permission.id),
          );
          setRoleIds(roles);
          setOriginalRoleIds(new Set(roles));
          setPermissionIds(permissions);
          setOriginalPermissionIds(new Set(permissions));
        })
        .catch(() => {
          if (!cancelled) {
            setLoadError(
              t('No se pudieron cargar los roles y permisos del usuario. Para evitar cambios no deseados, el guardado está deshabilitado hasta reintentar.'),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingAssignments(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, user, retryKey]);

  const toggleRole = useCallback((roleId: string) => {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }, []);

  const togglePermission = useCallback((permissionId: string) => {
    setPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Precarga fallida: nunca enviar (mandaría conjuntos vacíos y el sync
    // total del backend borraría roles/permisos en silencio).
    if (loadError) return;

    // Validación client-side (espejo del backend): no se envía si hay errores.
    const errors = validateAll();
    setFieldErrors(errors);
    setTouched(new Set(ALL_FIELDS));
    const hasErrors = ALL_FIELDS.some((field) => errors[field]);
    if (hasErrors) return;

    setSubmitErrors(null);
    try {
      // En edición, detecta si roles/permisos cambiaron respecto de la
      // precarga (el backend solo invalida el security stamp con cambios
      // efectivos). En creación no hay estado previo → false.
      const assignmentsChanged = user
        ? !setsEqual(originalRoleIds, roleIds) ||
          !setsEqual(originalPermissionIds, permissionIds)
        : false;

      await onSubmit({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        isActive: form.isActive,
        roleIds: [...roleIds],
        permissionIds: [...permissionIds],
        assignmentsChanged,
      });
    } catch (err) {
      // Errores del backend (400/404 con { message }) o de red/5xx: el dialog
      // queda abierto y muestra el mensaje (las reglas de Identity en lista).
      setSubmitErrors(
        splitBackendErrors(
          err instanceof Error
            ? err.message
            : t('Error inesperado. Intenta de nuevo.'),
        ),
      );
    }
  };

  const permissionGroups = groupPermissionsByModule(permissions);
  const rolesAvailable = canAssignRoles && roles.length > 0;
  const showPermissionsSection =
    canAssignPermissions && permissionGroups.length > 0;
  const emailDisabled = saving || Boolean(user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-2xl max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UserRound className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>
                {user ? t('Editar usuario') : t('Nuevo usuario')}
              </DialogTitle>
              <DialogDescription>
                {user
                  ? t('Actualizá los datos y las asignaciones del usuario.')
                  : t('Creá el usuario y asignale roles y permisos adicionales.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingAssignments ? (
          <div className="flex flex-col gap-3 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            {catalogError && (
              <p
                className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground"
                role="status"
              >
                {t('No se pudieron cargar los roles y permisos del catálogo. Podés guardar los datos básicos, pero no asignar roles ni permisos hasta que el catálogo esté disponible.')}
              </p>
            )}

            {loadError && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                <span className="flex-1">{loadError}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryKey((key) => key + 1)}
                  disabled={saving}
                >
                  <RefreshCw data-icon="inline-start" />
                  {t('Reintentar')}
                </Button>
              </div>
            )}

            {submitErrors && submitErrors.length > 0 && (
              <div
                className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
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

            <fieldset className="flex flex-col gap-4">
              <legend className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {t('Información del usuario')}
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email"
                  required
                  error={touched.has("email") ? fieldErrors.email : ""}
                >
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    onBlur={handleBlur("email")}
                    placeholder="ej. usuario@coppaddresd.com"
                    disabled={emailDisabled}
                    aria-invalid={Boolean(fieldErrors.email)}
                    autoComplete="off"
                  />
                  {user && (
                    <p className="text-[11px] text-muted-foreground">
                      {t('El email no se puede cambiar.')}
                    </p>
                  )}
                </Field>
                {!user && (
                  <Field
                    label={t('Contraseña')}
                    required
                    error={touched.has("password") ? fieldErrors.password : ""}
                  >
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      onBlur={handleBlur("password")}
                      placeholder={t('Contraseña inicial')}
                      disabled={saving}
                      aria-invalid={Boolean(fieldErrors.password)}
                      autoComplete="new-password"
                    />
                  </Field>
                )}
                <Field
                  label={t('Nombre')}
                  required
                  error={touched.has("firstName") ? fieldErrors.firstName : ""}
                >
                  <Input
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                    onBlur={handleBlur("firstName")}
                    placeholder="Ej. María"
                    disabled={saving}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                  />
                </Field>
                <Field
                  label={t('Apellido')}
                  required
                  error={touched.has("lastName") ? fieldErrors.lastName : ""}
                >
                  <Input
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    onBlur={handleBlur("lastName")}
                    placeholder="Ej. González"
                    disabled={saving}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                  />
                </Field>
              </div>
              {user && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{t('Usuario activo')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('Los usuarios inactivos no pueden iniciar sesión.')}
                    </span>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => update("isActive", checked)}
                    disabled={saving}
                    aria-label={t('Usuario activo')}
                  />
                </div>
              )}
            </fieldset>

            {rolesAvailable && (
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  {t('Roles')}
                </legend>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        disabled={saving}
                      />
                    }
                  >
                    <span className="truncate">
                      {roleIds.size === 0
                        ? t('Seleccionar roles')
                        : roleIds.size === 1
                          ? t('1 rol seleccionado')
                          : t('{count} roles seleccionados', { count: String(roleIds.size) })}
                    </span>
                    <ChevronsUpDown className="size-4 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-72 w-full">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>
                        {t('Roles disponibles')}
                      </DropdownMenuLabel>
                      {roles.map((role) => {
                        const checked = roleIds.has(role.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={role.id}
                            checked={checked}
                            onCheckedChange={() => toggleRole(role.id)}
                          >
                            {role.name}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </fieldset>
            )}

            {showPermissionsSection && (
              <fieldset className="flex flex-col gap-3">
                <legend className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <ShieldCheck className="size-3.5" />
                  {t('Permisos adicionales')}
                </legend>
                <p className="text-[11.5px] text-muted-foreground">
                  {t('Permisos directos del usuario, además de los que obtiene por sus roles.')}
                </p>
                <Separator />
                <PermissionGroups
                  groups={permissionGroups}
                  selected={permissionIds}
                  onToggle={togglePermission}
                  disabled={saving}
                />
              </fieldset>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('Cancelar')}
              </Button>
              <Button
                type="submit"
                disabled={saving || Boolean(loadError)}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="animate-spin" data-icon="inline-start" />
                    {t('Guardando...')}
                  </>
                ) : user ? (
                  t('Guardar cambios')
                ) : (
                  t('Crear usuario')
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p
          className="text-xs leading-snug whitespace-pre-line text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Compara dos Sets de ids (roles/permisos) para detectar cambios reales. */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
