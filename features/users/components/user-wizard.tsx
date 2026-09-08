"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users as UsersIcon,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import { fetchRoles } from "@/features/roles/services/roles-service";
import {
  fetchPermissions,
  fetchRolePermissions,
} from "@/features/permissions/services/permissions-service";
import {
  splitBackendErrors,
  validatePassword,
  validateUserForm,
  type UserFieldErrors,
} from "@/features/auth-common/utils/validation";
import type { User } from "../types";
import {
  createUser,
  fetchUser,
  fetchUserPermissions,
  fetchUserRoles,
  updateUser,
} from "../services/users-service";
import { generatePassword } from "../services/users-mock";
import { PermissionSelector } from "./permission-selector";

interface UserWizardProps {
  /** "create" en /users/nuevo · "edit" en /users/{id}/editar. */
  mode: "create" | "edit";
  userId?: string;
  /** Cuando se renderiza embebido en people-wizard, oculta el PageHeader propio. */
  embedded?: boolean;
  /** Callback para volver al selector de modo del people-wizard. */
  onBackToSelector?: () => void;
}

interface WizardStep {
  label: string;
  hint: string;
  icon: LucideIcon;
}

const STEPS: WizardStep[] = [
  {
    label: "Información básica",
    hint: "Identidad y credenciales",
    icon: UserRound,
  },
  {
    label: "Roles",
    hint: "Qué puede hacer por su rol",
    icon: ShieldCheck,
  },
  {
    label: "Permisos adicionales",
    hint: "Ajustes finos por módulo",
    icon: KeyRound,
  },
];

const emptyFieldErrors: UserFieldErrors = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
};

const ALL_FIELDS = ["email", "password", "firstName", "lastName"] as const;

/**
 * Experiencia dedicada de creación/edición de usuario (reemplaza al modal
 * gigante). Flujo guiado en 3 pasos:
 * 1. Datos + contraseña (con generación automática y checklist en vivo).
 * 2. Roles con preview DINÁMICO de los permisos que hereda cada rol.
 * 3. Permisos directos agrupados por módulo, con descripción humana;
 *    los heredados por roles aparecen bloqueados para evitar duplicar.
 */
export function UserWizard({ mode, userId, embedded, onBackToSelector }: UserWizardProps) {
  const isEdit = mode === "edit" && Boolean(userId);
  const t = useT();
  const router = useRouter();
  const { user: session, hasPermission, logout } = useAuth();
  const canAssignRoles = hasPermission("Roles.Assign");
  const canAssignPermissions = hasPermission("Permissions.Assign");

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isActive: true,
    autoPassword: true,
    showPassword: false,
  });
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [permissionIds, setPermissionIds] = useState<Set<string>>(new Set());
  const [originalRoleIds, setOriginalRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [originalPermissionIds, setOriginalPermissionIds] = useState<
    Set<string>
  >(new Set());
  /** Snapshot del isActive original (para el security stamp del backend). */
  const [originalActive, setOriginalActive] = useState(true);

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  // Cache roleId → permisos del rol (para el preview dinámico del paso 2).
  const rolePermissionsCache = useRef<Map<string, Permission[]>>(new Map());
  const [rolePreview, setRolePreview] = useState<Map<string, Permission[]>>(
    new Map(),
  );
  const [previewLoading, setPreviewLoading] = useState<Set<string>>(new Set());

  const [fieldErrors, setFieldErrors] =
    useState<UserFieldErrors>(emptyFieldErrors);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const requests: Promise<unknown>[] = [fetchRoles(), fetchPermissions()];
      if (isEdit && userId) {
        requests.push(
          fetchUser(userId),
          fetchUserRoles(userId),
          fetchUserPermissions(userId),
        );
      }
      const [roleList, permissionList, ...rest] = await Promise.all(requests);
      setRoles(roleList as Role[]);
      setPermissions(permissionList as Permission[]);

      if (isEdit && userId) {
        const [user, userRoles, userPermissions] = rest as [
          User,
          Role[],
          Permission[],
        ];
        setForm({
          email: user.email,
          password: "",
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          autoPassword: false,
          showPassword: false,
        });
        const roleSet = new Set(userRoles.map((role) => role.id));
        const permissionSet = new Set(
          userPermissions.map((permission) => permission.id),
        );
        setRoleIds(roleSet);
        setOriginalRoleIds(new Set(roleSet));
        setPermissionIds(permissionSet);
        setOriginalPermissionIds(new Set(permissionSet));
        setOriginalActive(user.isActive);
        // Precarga del preview de los roles ya asignados.
        setRolePreview(
          new Map(userRoles.map((role) => [role.id, [] as Permission[]])),
        );
      }
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("No se pudo cargar la información necesaria."),
      );
    } finally {
      setLoading(false);
    }
  }, [isEdit, userId, t]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCatalog(), 0);
    return () => clearTimeout(timer);
  }, [loadCatalog, retryKey]);

  // Carga perezosa de los permisos de los roles seleccionados (preview dinámico).
  useEffect(() => {
    const pending = [...roleIds].filter(
      (id) => !rolePermissionsCache.current.has(id) && !previewLoading.has(id),
    );
    if (pending.length === 0) return;

    let cancelled = false;
    setPreviewLoading((prev) => new Set([...prev, ...pending]));
    Promise.all(
      pending.map(async (id) => ({
        id,
        permissions: await fetchRolePermissions(id),
      })),
    )
      .then((entries) => {
        if (cancelled) return;
        for (const entry of entries) {
          rolePermissionsCache.current.set(entry.id, entry.permissions);
        }
        setRolePreview(new Map(rolePermissionsCache.current));
      })
      .catch(() => {
        // El preview es informativo: si falla, el paso sigue usable.
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading((prev) => {
            const next = new Set(prev);
            for (const id of pending) next.delete(id);
            return next;
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleIds]);

  /** Permisos heredados de TODOS los roles seleccionados (unión). */
  const inherited = useMemo(() => {
    const map = new Map<string, { permission: Permission; roleName: string }>();
    for (const roleId of roleIds) {
      const roleName = roles.find((role) => role.id === roleId)?.name ?? "";
      for (const permission of rolePreview.get(roleId) ?? []) {
        if (!map.has(permission.id)) {
          map.set(permission.id, { permission, roleName });
        }
      }
    }
    return map;
  }, [roleIds, rolePreview, roles]);

  const inheritedIds = useMemo(() => new Set(inherited.keys()), [inherited]);

  const update = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateStep1 = useCallback(() => {
    return validateUserForm({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      isEditing: isEdit,
    });
  }, [form, isEdit]);

  const handleBlur = (field: (typeof ALL_FIELDS)[number]) => () => {
    setTouched((prev) => new Set(prev).add(field));
    setFieldErrors(validateStep1());
  };

  const handleGenerate = () => {
    const password = generatePassword();
    setForm((current) => ({
      ...current,
      password,
      autoPassword: true,
      showPassword: true,
    }));
    setTouched((prev) => new Set(prev).add("password"));
    setFieldErrors((prev) => ({ ...prev, password: "" }));
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard puede estar bloqueado; la contraseña sigue visible.
    }
  };

  const canNext =
    step === 0
      ? ALL_FIELDS.filter((field) => !(isEdit && field === "password")).every(
          (field) => !fieldErrors[field],
        )
      : true;

  const goNext = () => {
    if (step === 0) {
      const errors = validateStep1();
      setFieldErrors(errors);
      setTouched(
        new Set(
          ALL_FIELDS.filter((field) => !(isEdit && field === "password")),
        ),
      );
      if (ALL_FIELDS.some((field) => errors[field])) return;
    }
    setSubmitErrors(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setSubmitErrors(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  const toggleRole = (roleId: string) => {
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const togglePermission = (permissionId: string) => {
    setPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const submit = async () => {
    if (loadError) return;
    setSubmitErrors(null);
    setSaving(true);
    try {
      const assignmentsChanged = isEdit
        ? !setsEqual(originalRoleIds, roleIds) ||
          !setsEqual(originalPermissionIds, permissionIds)
        : false;

      if (isEdit && userId) {
        await updateUser(userId, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          isActive: form.isActive,
          roleIds: canAssignRoles ? [...roleIds] : undefined,
          permissionIds: canAssignPermissions ? [...permissionIds] : undefined,
        });
        // ¿Cambió algo que invalide tokens? El backend bumpea el security
        // stamp SOLO con cambios de asignaciones o isActive → false.
        const somethingChanged =
          assignmentsChanged || form.isActive !== originalActive;
        const selfEdit = session?.id === userId;
        if (selfEdit && somethingChanged) {
          logout("expired");
          return;
        }
        router.push(
          somethingChanged
            ? `/users/${userId}?updated=assignments`
            : `/users/${userId}`,
        );
      } else {
        const user = await createUser({
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          roleIds: canAssignRoles ? [...roleIds] : undefined,
          permissionIds: canAssignPermissions ? [...permissionIds] : undefined,
        });
        setCreatedUser(user);
        setGeneratedPassword(form.autoPassword ? form.password : null);
      }
    } catch (err) {
      setSubmitErrors(
        splitBackendErrors(
          err instanceof Error
            ? err.message
            : t("Error inesperado. Intenta de nuevo."),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const passwordRules = validatePassword(form.password);

  // --- Pantalla de éxito (solo creación) ---
  if (createdUser) {
    return (
      <CreatedScreen
        user={createdUser}
        generatedPassword={generatedPassword}
        copied={copied}
        onCopy={() => void copyPassword()}
        onView={() => router.push(`/users/${createdUser.id}`)}
        onRepeat={() => {
          setCreatedUser(null);
          setGeneratedPassword(null);
          setStep(0);
          setForm({
            email: "",
            password: "",
            firstName: "",
            lastName: "",
            isActive: true,
            autoPassword: true,
            showPassword: false,
          });
          setRoleIds(new Set());
          setPermissionIds(new Set());
          setTouched(new Set());
          setFieldErrors(emptyFieldErrors);
        }}
        onList={() => router.push("/users")}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", embedded ? "" : "p-6")}>
      {!embedded && (
        <PageHeader
          title={isEdit ? t("Editar usuario") : t("Nuevo usuario")}
          description={
            isEdit
              ? t("Actualizá los datos, roles y permisos del usuario.")
              : t(
                  "Creá el usuario en 3 pasos: datos, roles y permisos adicionales.",
                )
          }
          icon={UsersIcon}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(isEdit && userId ? `/users/${userId}` : "/users")
              }
            >
              <ArrowLeft data-icon="inline-start" />
              {t("Volver")}
            </Button>
          }
        />
      )}

      {/* Stepper */}
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((stepDef, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li
              key={stepDef.label}
              className="flex flex-1 items-center gap-2 sm:gap-3"
            >
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200 sm:px-3.5",
                  current
                    ? "border-primary/30 bg-primary/[0.06] shadow-sm"
                    : done
                      ? "border-success/30 bg-success/[0.06]"
                      : "border-border/70 bg-card",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold transition-all duration-300",
                    current
                      ? "scale-105 bg-brand-gradient text-white shadow-sm"
                      : done
                        ? "bg-success text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <stepDef.icon className="size-3.5" />
                  )}
                </span>
                <span className="hidden min-w-0 flex-col leading-tight min-[520px]:flex">
                  <span
                    className={cn(
                      "truncate text-[12px] font-semibold",
                      current ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(stepDef.label)}
                  </span>
                  <span className="hidden truncate text-[10.5px] text-muted-foreground/80 sm:inline">
                    {t(stepDef.hint)}
                  </span>
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    done ? "bg-success/60" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {loading ? (
        <div className={cn("flex flex-col gap-4 p-6", !embedded && "rounded-2xl border border-border bg-card")}>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : loadError ? (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3.5", !embedded && "rounded-2xl border border-destructive/20 bg-destructive-soft")}>
          <span className="text-sm text-destructive">{loadError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            <RefreshCw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-5 p-5 sm:p-6", !embedded && "rounded-2xl border border-border bg-card")}>
          {submitErrors && submitErrors.length > 0 && (
            <div
              className="rounded-lg bg-destructive-soft px-3 py-2.5 text-sm text-destructive"
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

          {/* PASO 1 — Información básica */}
          {step === 0 && (
            <div className="animate-slide-up flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("Nombre")}
                  required
                  error={touched.has("firstName") ? fieldErrors.firstName : ""}
                >
                  <Input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    onBlur={handleBlur("firstName")}
                    placeholder={t("Ej. María")}
                    disabled={saving}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                  />
                </Field>
                <Field
                  label={t("Apellido")}
                  required
                  error={touched.has("lastName") ? fieldErrors.lastName : ""}
                >
                  <Input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    onBlur={handleBlur("lastName")}
                    placeholder={t("Ej. González")}
                    disabled={saving}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                  />
                </Field>
                <Field
                  label={t("Email")}
                  required
                  error={touched.has("email") ? fieldErrors.email : ""}
                  hint={isEdit ? t("El email no se puede cambiar.") : undefined}
                >
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    onBlur={handleBlur("email")}
                    placeholder={t("ej. usuario@coppaddresd.com")}
                    disabled={saving || isEdit}
                    aria-invalid={Boolean(fieldErrors.email)}
                    autoComplete="off"
                  />
                </Field>

                {isEdit ? (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium">
                        {t("Usuario activo")}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground">
                        {t("Los usuarios inactivos no pueden iniciar sesión.")}
                      </span>
                    </div>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(checked) => update("isActive", checked)}
                      disabled={saving}
                      aria-label={t("Usuario activo")}
                    />
                  </div>
                ) : (
                  <Field
                    label={t("Contraseña inicial")}
                    required
                    error={touched.has("password") ? fieldErrors.password : ""}
                  >
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type={form.showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => {
                            update("password", e.target.value);
                            update("autoPassword", false);
                          }}
                          onBlur={handleBlur("password")}
                          placeholder={t("Mínimo 8 caracteres")}
                          disabled={saving}
                          aria-invalid={Boolean(fieldErrors.password)}
                          autoComplete="new-password"
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            update("showPassword", !form.showPassword)
                          }
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={
                            form.showPassword
                              ? t("Ocultar contraseña")
                              : t("Mostrar contraseña")
                          }
                        >
                          {form.showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={saving}
                        title={t("Generar contraseña segura")}
                      >
                        <Wand2 data-icon="inline-start" />
                        <span className="hidden sm:inline">{t("Generar")}</span>
                      </Button>
                    </div>
                  </Field>
                )}
              </div>

              {/* Checklist en vivo de la política de contraseñas */}
              {!isEdit && (
                <PasswordChecklist
                  password={form.password}
                  errors={passwordRules}
                />
              )}

              {form.autoPassword && form.password && !isEdit && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[12px] text-teal-800">
                    <BadgeCheck className="size-4 shrink-0" />
                    {t(
                      "Contraseña generada. Cópiala y compártela de forma segura; también podrá reiniciarla después.",
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => void copyPassword()}
                  >
                    {copied ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <ClipboardCopy data-icon="inline-start" />
                    )}
                    {copied ? t("¡Copiada!") : t("Copiar")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PASO 2 — Roles con preview dinámico */}
          {step === 1 && (
            <div className="animate-slide-up flex flex-col gap-3">
              {!canAssignRoles ? (
                <Notice
                  icon={Lock}
                  text={t(
                    "No tienes permiso para asignar roles (Roles.Assign). El usuario se creará sin roles y otro administrador podrá asignárselos.",
                  )}
                />
              ) : (
                <>
                  <p className="text-[12.5px] text-muted-foreground">
                    {t(
                      "Elegí los roles del usuario. Al seleccionar uno verás exactamente qué permisos hereda.",
                    )}
                  </p>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {roles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        checked={roleIds.has(role.id)}
                        preview={rolePreview.get(role.id)}
                        loading={previewLoading.has(role.id)}
                        onToggle={() => toggleRole(role.id)}
                        disabled={saving}
                      />
                    ))}
                  </div>
                  {roles.length === 0 && (
                    <p className="py-6 text-center text-[13px] text-muted-foreground">
                      {t("No hay roles disponibles en el catálogo.")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* PASO 3 — Permisos directos */}
          {step === 2 && (
            <div className="animate-slide-up flex flex-col gap-3">
              {!canAssignPermissions ? (
                <Notice
                  icon={Lock}
                  text={t(
                    "No tienes permiso para asignar permisos directos (Permissions.Assign). Los roles seleccionados siguen aplicando.",
                  )}
                />
              ) : (
                <>
                  {inheritedIds.size > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5">
                      <Info className="mt-0.5 size-4 shrink-0 text-teal-700" />
                      <p className="text-[12px] text-teal-800">
                        {t(
                          "{count} permisos ya vienen incluidos por los roles seleccionados.",
                          { count: String(inheritedIds.size) },
                        )}{" "}
                        {t(
                          "Abajo solo verás los permisos ADICIONALES que puedes conceder.",
                        )}
                      </p>
                    </div>
                  )}
                  <PermissionSelector
                    permissions={permissions.filter(
                      (permission) => !inheritedIds.has(permission.id),
                    )}
                    inheritedIds={inheritedIds}
                    inheritedOrigin={undefined}
                    selected={permissionIds}
                    onToggle={togglePermission}
                    disabled={saving}
                  />
                </>
              )}
            </div>
          )}

          {/* Footer de navegación */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              variant="outline"
              onClick={step === 0 && embedded && onBackToSelector ? onBackToSelector : goBack}
              disabled={step === 0 && !(embedded && onBackToSelector) || saving}
            >
              <ArrowLeft data-icon="inline-start" />
              {t("Anterior")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={goNext}
                disabled={saving || (step === 0 && !canNext)}
              >
                {t("Continuar")}
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={saving || Boolean(loadError)}
                className="bg-brand-gradient shadow-md shadow-brand-navy/25 hover:opacity-95"
              >
                {saving ? (
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <CheckCircle2 data-icon="inline-start" />
                )}
                {isEdit ? t("Guardar cambios") : t("Crear usuario")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tarjeta de rol con preview dinámico de los permisos que hereda. */
function RoleCard({
  role,
  checked,
  preview,
  loading,
  onToggle,
  disabled,
}: {
  role: Role;
  checked: boolean;
  preview: Permission[] | undefined;
  loading: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3.5 transition-all duration-200",
        checked
          ? "border-primary/50 bg-primary/[0.04] ring-1 ring-primary/20"
          : "border-border/70 bg-card hover:border-border",
      )}
    >
      <label className="flex items-start gap-2.5">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          disabled={disabled}
          className="mt-0.5"
          aria-label={role.name}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" />
            {role.name}
          </span>
          {role.description && (
            <span className="text-[11.5px] leading-snug text-muted-foreground">
              {role.description}
            </span>
          )}
        </span>
      </label>

      {checked && (
        <div className="rounded-lg bg-muted/60 p-2.5">
          <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase">
            <KeyRound className="size-3" />
            {t("Este rol proporciona acceso a:")}
          </p>
          {loading || !preview ? (
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-20 rounded-md" />
              ))}
            </div>
          ) : preview.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground">
              {t("Sin permisos asignados todavía.")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {preview.slice(0, 8).map((permission) => (
                <span
                  key={permission.id}
                  className="rounded-md bg-background px-1.5 py-0.5 text-[10.5px] font-medium text-secondary-foreground ring-1 ring-border/60"
                >
                  {permission.name}
                </span>
              ))}
              {preview.length > 8 && (
                <span className="rounded-md bg-background px-1.5 py-0.5 text-[10.5px] font-semibold text-primary ring-1 ring-border/60">
                  +{preview.length - 8}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Checklist en vivo de la política de contraseñas del backend. */
function PasswordChecklist({
  password,
  errors,
}: {
  password: string;
  errors: string[];
}) {
  const t = useT();
  const rules = [
    { met: password.length >= 8, label: t("Al menos 8 caracteres") },
    { met: !errors.some((e) => e.includes("número")), label: t("Un número") },
    {
      met: !errors.some((e) => e.includes("minúscula")),
      label: t("Una minúscula"),
    },
    {
      met: !errors.some((e) => e.includes("mayúscula")),
      label: t("Una mayúscula"),
    },
    {
      met: !errors.some((e) => e.includes("carácter especial")),
      label: t("Un carácter especial"),
    },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
      {rules.map((rule) => (
        <span
          key={rule.label}
          className={cn(
            "flex items-center gap-1 text-[11.5px] transition-colors",
            rule.met
              ? "font-medium text-success-foreground"
              : "text-muted-foreground",
          )}
        >
          {rule.met ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <span className="size-3 rounded-full border border-current opacity-40" />
          )}
          {rule.label}
        </span>
      ))}
    </div>
  );
}

/** Aviso inline (permisos faltantes, información contextual). */
function Notice({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
      <p className="text-[12px] leading-snug text-warning-foreground">{text}</p>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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

/** Pantalla de éxito tras crear el usuario. */
function CreatedScreen({
  user,
  generatedPassword,
  copied,
  onCopy,
  onView,
  onRepeat,
  onList,
}: {
  user: User;
  generatedPassword: string | null;
  copied: boolean;
  onCopy: () => void;
  onView: () => void;
  onRepeat: () => void;
  onList: () => void;
}) {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm sm:px-14">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-lg font-bold text-foreground">
          {t("¡Usuario creado correctamente!")}
        </h2>
        <p className="max-w-md text-[13px] text-muted-foreground">
          {t(
            "El usuario fue creado y ya puede iniciar sesión con las credenciales configuradas.",
          )}
        </p>

        <div className="mt-2 flex w-full max-w-sm flex-col gap-2 rounded-xl bg-muted/60 p-3.5 text-left">
          <p className="flex items-center gap-2 text-[12.5px]">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium">{user.email}</span>
          </p>
          {generatedPassword && (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-mono text-[12.5px]">
                <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                {generatedPassword}
              </p>
              <Button variant="outline" size="xs" onClick={onCopy}>
                {copied ? (
                  <Check data-icon="inline-start" />
                ) : (
                  <ClipboardCopy data-icon="inline-start" />
                )}
                {copied ? t("¡Copiada!") : t("Copiar")}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onView}>
            <UserRound data-icon="inline-start" />
            {t("Ver usuario")}
          </Button>
          <Button variant="outline" onClick={onRepeat}>
            <UserRound data-icon="inline-start" />
            {t("Crear otro usuario")}
          </Button>
          <Button variant="ghost" onClick={onList}>
            <UsersIcon data-icon="inline-start" />
            {t("Ir a la lista")}
          </Button>
        </div>
      </div>
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
