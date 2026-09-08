"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Clock,
  IdCard,
  Info,
  KeyRound,
  LoaderCircle,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserRound,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { InfoItem } from "@/components/ui/info-item";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { groupPermissionsByModule } from "@/features/permissions/types";
import type { Permission } from "@/features/permissions/types";
import type { Role } from "@/features/roles/types";
import type { PermissionWithOrigin, User } from "../types";
import {
  deleteUser,
  fetchUser,
  fetchUserPermissionSummary,
  fetchUserRoles,
  formatDate,
  updateUser,
} from "../services/users-service";
import { formatRelativeTime, getMockLastAccess } from "../services/users-mock";
import { RoleChips, UserAvatar, UserStatusBadge } from "./user-visuals";

interface UserDetailProps {
  userId: string;
}

/**
 * Vista de detalle del usuario (reemplaza al "modal de ver"). Header con
 * identidad + acciones, información general, roles y mapa de permisos con
 * ORIGEN (heredado por rol vs. directo) — responde a "¿por qué este usuario
 * tiene este permiso?".
 */
export function UserDetail({ userId }: UserDetailProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: session, logout, hasPermission } = useAuth();
  const canUpdate = hasPermission("Users.Update");
  const canDelete = hasPermission("Users.Delete");

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [summary, setSummary] = useState<{
    inherited: PermissionWithOrigin[];
    direct: Permission[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("updated") === "assignments"
      ? t(
          "El usuario deberá volver a iniciar sesión para que los cambios de permisos apliquen.",
        )
      : null,
  );
  const [permissionQuery, setPermissionQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const loadedUser = await fetchUser(userId);
      const loadedRoles = await fetchUserRoles(userId);
      const loadedSummary = await fetchUserPermissionSummary(
        userId,
        loadedRoles,
      );
      setUser(loadedUser);
      setRoles(loadedRoles);
      setSummary(loadedSummary);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("Error al cargar el usuario.");
      if (
        message.includes("404") ||
        message.toLowerCase().includes("no encontrado")
      ) {
        setNotFound(true);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, retryKey]);

  const toggleActive = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      const selfEdit = session?.id === user.id;
      if (selfEdit) {
        // Desactivarse a sí mismo invalida la sesión (security stamp).
        logout("expired");
        return;
      }
      setNotice(
        !user.isActive
          ? t("Usuario activado. Ya puede iniciar sesión.")
          : t(
              "Usuario desactivado. No podrá iniciar sesión hasta reactivarlo.",
            ),
      );
      await load();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : t("Error al cambiar el estado."),
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteUser(user.id);
      router.push("/users");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : t("Error al eliminar el usuario."),
      );
      setShowDelete(false);
      setDeleting(false);
    }
  };

  const allPermissions = useMemo(() => {
    if (!summary) return [];
    return [...summary.inherited, ...summary.direct];
  }, [summary]);

  const filteredPermissions = useMemo(() => {
    const q = permissionQuery.trim().toLowerCase();
    if (!q) return allPermissions;
    return allPermissions.filter(
      (permission) =>
        permission.name.toLowerCase().includes(q) ||
        permission.code.toLowerCase().includes(q) ||
        (permission.description ?? "").toLowerCase().includes(q),
    );
  }, [allPermissions, permissionQuery]);

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(filteredPermissions),
    [filteredPermissions],
  );

  // --- Estados de carga/error/vacío ---
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || (!user && error)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <UsersIcon className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          {notFound
            ? t("No encontramos este usuario")
            : t("No pudimos cargar el usuario")}
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {notFound
            ? t("Puede haber sido eliminado o no tienes acceso.")
            : error}
        </p>
        <div className="flex items-center gap-2">
          {!notFound && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              <RefreshCw data-icon="inline-start" />
              {t("Reintentar")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/users")}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("Volver a usuarios")}
          </Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const inheritedCount = summary?.inherited.length ?? 0;
  const directCount = summary?.direct.length ?? 0;

  return (
    <div className="stagger-children flex flex-col gap-5 p-6">
      <PageHeader
        title={t("Detalle de usuario")}
        description={t("Identidad, roles y mapa de permisos del usuario.")}
        icon={UserRound}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/users")}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("Volver")}
          </Button>
        }
      />

      {notice && (
        <div
          className="animate-slide-down flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground"
          role="status"
        >
          <Info className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {t("Cerrar")}
          </button>
        </div>
      )}

      {/* Header del usuario — hero con el gradiente de marca */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar user={user} className="size-14" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {user.firstName} {user.lastName}
              </h2>
              <UserStatusBadge isActive={user.isActive} />
            </div>
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              {user.email}
            </p>
            <RoleChips roles={user.roles} max={4} className="mt-0.5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && (
              <Button
                size="sm"
                className="bg-brand-gradient text-white shadow-sm hover:opacity-95"
                onClick={() => router.push(`/users/${user.id}/editar`)}
              >
                <Pencil data-icon="inline-start" />
                {t("Editar")}
              </Button>
            )}
            {canUpdate && (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => void toggleActive()}
                variant="outline"
              >
                {busy ? (
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : user.isActive ? (
                  <UserX data-icon="inline-start" />
                ) : (
                  <UserCheck data-icon="inline-start" />
                )}
                {user.isActive ? t("Desactivar") : t("Activar")}
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                onClick={() => setShowDelete(true)}
                variant="destructive"
              >
                <Trash2 data-icon="inline-start" />
                {t("Eliminar")}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Información general */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Información general")}
            icon={UserRound}
            variant="primary"
          />
          <div className="flex flex-col gap-3 p-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InfoItem
                label={t("Nombre")}
                value={user.firstName}
                icon={UserIcon}
              />
              <InfoItem
                label={t("Apellido")}
                value={user.lastName}
                icon={IdCard}
              />
              <InfoItem
                label={t("Email")}
                value={user.email}
                mono
                icon={Mail}
              />
              <InfoItem
                label={t("Estado")}
                value={user.isActive ? t("Activo") : t("Inactivo")}
                icon={Activity}
              />
              <InfoItem
                label={t("Fecha de creación")}
                value={formatDate(user.createdAt)}
                icon={CalendarDays}
              />
              <InfoItem
                label={t("Último acceso")}
                value={formatRelativeTime(getMockLastAccess(user.id))}
                icon={Clock}
                hint={t("Referencia (mock)")}
              />
            </dl>
          </div>
        </section>

        {/* Roles */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card">
          <SectionHeader
            title={t("Roles asignados")}
            icon={ShieldCheck}
            variant="primary"
          />
          <div className="flex flex-col gap-3 p-5">
            {roles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-warning/40 bg-warning-soft px-3 py-3">
                <p className="text-[12.5px] text-warning-foreground">
                  {t(
                    "Este usuario no tiene roles: solo puede acceder con permisos directos. Asígnales uno desde Editar para heredar permisos automáticamente.",
                  )}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {roles.map((role) => {
                  const rolePermissionCount = summary?.inherited.filter(
                    (permission) => permission.originRole === role.name,
                  ).length;
                  return (
                    <li
                      key={role.id}
                      className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5"
                    >
                      <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <ShieldCheck className="size-3.5" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[13px] font-semibold text-foreground">
                          {role.name}
                        </span>
                        {role.description && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {role.description}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {rolePermissionCount}{" "}
                        {rolePermissionCount === 1
                          ? t("permiso")
                          : t("permisos")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Permisos con origen — la banda queda a sangre: es el borde superior de la tarjeta */}
      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Permisos efectivos")}
          icon={KeyRound}
          variant="primary"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-1 text-[10.5px] font-semibold text-white">
                {inheritedCount} {t("heredados")}
              </span>
              <span className="rounded-md bg-white/15 px-2 py-1 text-[10.5px] font-semibold text-white">
                {directCount} {t("directos")}
              </span>
              <div className="relative w-full max-w-[210px]">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/70" />
                <Input
                  value={permissionQuery}
                  onChange={(e) => setPermissionQuery(e.target.value)}
                  placeholder={t("Buscar permiso...")}
                  className="h-8 border-white/20 bg-white/95 pl-8 text-xs placeholder:text-slate-400"
                  aria-label={t("Buscar permisos")}
                />
              </div>
            </div>
          }
        />
        <div className="flex flex-col gap-3 p-5">
          {permissionGroups.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              {allPermissions.length === 0
                ? t(
                    "Sin permisos: este usuario no tiene roles ni permisos directos.",
                  )
                : t("Sin permisos que coincidan con la búsqueda.")}
            </p>
          ) : (
            <div className="max-h-[460px] overflow-y-auto pr-1">
              <div className="stagger-children grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                {permissionGroups.map((group) => (
                  <div key={group.module} className="flex flex-col gap-1">
                    <p className="text-[10.5px] font-bold tracking-wide text-foreground uppercase">
                      {group.module}
                    </p>
                    {group.permissions.map((permission) => {
                      const originRole =
                        "originRole" in permission
                          ? (permission as PermissionWithOrigin).originRole
                          : null;
                      const direct = !originRole;
                      return (
                        <div
                          key={permission.id}
                          className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold",
                              direct
                                ? "bg-primary/12 text-primary"
                                : "bg-teal-100 text-teal-700",
                            )}
                          >
                            {direct ? "D" : "R"}
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[12.5px] font-medium text-foreground">
                                {permission.name}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center rounded px-1.5 py-px text-[9.5px] font-semibold",
                                  direct
                                    ? "bg-primary/10 text-primary"
                                    : "bg-teal-50 text-teal-700",
                                )}
                              >
                                {direct
                                  ? t("Directo")
                                  : `${t("Rol")}: ${originRole}`}
                              </span>
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/70">
                              {permission.code}
                            </span>
                            {permission.description && (
                              <span className="text-[11px] leading-snug text-muted-foreground">
                                {permission.description}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Confirmación de eliminación */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar usuario?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Se eliminará")}{" "}
              <strong>
                {user.firstName} {user.lastName}
              </strong>{" "}
              {t("y todas sus asignaciones. Esta acción no se puede deshacer.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
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
  );
}
