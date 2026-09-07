"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  Check,
  Copy,
  IdCard,
  Loader2,
  Mail,
  MailPlus,
  Phone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { InfoItem } from "@/components/ui/info-item";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  fetchEmployee,
  inviteEmployee,
  fetchProfessionalScopes,
  updateProfessionalScopes,
  type EmployeeDetail,
  type ProfessionalScopes,
} from "@/features/professionals/services/employees-service";
import { fetchRoles } from "@/features/roles/services/roles-service";
import type { Role } from "@/features/roles/types";
import { ApiError } from "@/lib/api/http";
import {
  fullName,
  ProfessionalAvatar,
  ProfessionalStatusBadge,
} from "./professional-visuals";

/**
 * Vista de detalle del profesional con el patrón del módulo Usuarios:
 * card de identidad blanca, secciones con barra de gradiente, grid de
 * datos con iconos y selects nativos estilizados. Toda la lógica
 * (invitar, scopes por clínica) se conserva intacta.
 */
export function ProfessionalDetail({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [scopes, setScopes] = useState<ProfessionalScopes | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);
  const [roleByClinic, setRoleByClinic] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const [emp, sc] = await Promise.all([
          fetchEmployee(id),
          fetchProfessionalScopes(id),
        ]);
        setEmployee(emp);
        setScopes(sc);
        if (sc && !sc.requiresInvitation) {
          const map: Record<string, string> = {};
          for (const role of sc.roles) {
            if (role.scopeId) map[role.scopeId] = role.roleId;
          }
          setRoleByClinic(map);
        }
        setDirty(false);
      } catch {
        setFeedback({
          kind: "error",
          message: t("No se pudo cargar el profesional."),
        });
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emp, sc, rs] = await Promise.all([
          fetchEmployee(id),
          fetchProfessionalScopes(id),
          fetchRoles(),
        ]);
        if (cancelled) return;
        setEmployee(emp);
        setScopes(sc);
        setRoles(rs);
        if (sc && !sc.requiresInvitation) {
          const map: Record<string, string> = {};
          for (const role of sc.roles) {
            if (role.scopeId) map[role.scopeId] = role.roleId;
          }
          setRoleByClinic(map);
        }
      } catch {
        if (!cancelled) {
          setFeedback({
            kind: "error",
            message: t("No se pudo cargar el profesional."),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const canManageScopes = useMemo(
    () =>
      Boolean(employee?.userId) &&
      scopes !== null &&
      !scopes.requiresInvitation,
    [employee, scopes],
  );

  const onInvite = async () => {
    setBusy(true);
    setFeedback(null);
    setInvitationLink(null);
    try {
      const result = await inviteEmployee(id);
      setInvitationLink(result.invitationLink);
      const message = result.invitationLink
        ? t("Invitación enviada. El enlace quedó listo para copiar.")
        : t("Invitación enviada a {email}. Recibirá el enlace por correo.", {
            email: employee?.email ?? "",
          });
      setFeedback({ kind: "ok", message });
      await load(true);
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : t("No se pudo enviar la invitación."),
      });
    } finally {
      setBusy(false);
    }
  };

  const copyInvitationLink = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({
        kind: "error",
        message: t("No se pudo copiar el enlace."),
      });
    }
  };

  const onSaveScopes = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const rolesToApply: Array<{
        roleId: string;
        scopeType: string;
        scopeId: string | null;
      }> = Object.entries(roleByClinic)
        .filter(([, roleId]) => roleId)
        .map(([clinicId, roleId]) => ({
          roleId,
          scopeType: "Clinic",
          scopeId: clinicId,
        }));

      await updateProfessionalScopes(id, {
        roles: rolesToApply,
        permissions: scopes?.permissions ?? [],
      });
      setFeedback({
        kind: "ok",
        message: t("Permisos por clínica actualizados."),
      });
      await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : t("No se pudieron guardar los permisos."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="stagger-children mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="mb-3 flex items-center gap-4 border-b border-border/60 py-3 last:border-0"
                key={index}
              >
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-48 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          title={t("Profesional")}
          description={t("No se encontró el profesional.")}
          icon={Stethoscope}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/employees")}
        >
          {t("Volver al directorio")}
        </Button>
      </div>
    );
  }

  return (
    <div className="stagger-children mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        title={t("Profesional")}
        description={t("Equipo clínico del ERP")}
        icon={Stethoscope}
      />

      {/* Card de identidad (patrón Usuarios): avatar, datos y acciones. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ProfessionalAvatar employee={employee} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-lg leading-tight font-bold text-foreground">
                {fullName(employee)}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                {employee.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ProfessionalStatusBadge status={employee.status} />
                {employee.professionalTypeName && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                    <Stethoscope className="size-3 text-primary" />
                    {employee.professionalTypeName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(!employee.userId || employee.status === "Invited") && (
              <Button size="sm" onClick={onInvite} disabled={busy}>
                {busy ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <MailPlus data-icon="inline-start" />
                )}
                {employee.userId
                  ? t("Reenviar invitación")
                  : t("Invitar al profesional")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/employees")}
            >
              {t("Volver al directorio")}
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoItem
            label={t("Correo electrónico")}
            value={employee.email}
            icon={Mail}
          />
          <InfoItem
            label={t("Teléfono")}
            value={
              employee.phoneNumber
                ? `${employee.phoneCountryCode ?? ""} ${employee.phoneNumber}`.trim()
                : "—"
            }
            icon={Phone}
          />
          <InfoItem
            label={t("Organización")}
            value={employee.organizationName}
            icon={Building2}
          />
          <InfoItem
            label={t("Estado")}
            value={t(
              employee.status === "Active"
                ? "Activo"
                : employee.status === "Invited"
                  ? "Invitado"
                  : "Inactivo",
            )}
            icon={Activity}
          />
          {employee.hireDate && (
            <InfoItem
              label={t("Fecha de ingreso")}
              value={new Date(employee.hireDate).toLocaleDateString("es", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              icon={CalendarDays}
            />
          )}
          {employee.userId && (
            <InfoItem
              label={t("ID de usuario")}
              value={employee.userId}
              icon={IdCard}
              mono
              hint="Usuario vinculado"
            />
          )}
        </dl>
      </div>

      {feedback && (
        <div
          className={`animate-slide-down mt-5 rounded-xl px-4 py-3 text-[13px] ${
            feedback.kind === "ok"
              ? "bg-success-soft text-success-foreground"
              : "bg-destructive-soft text-destructive"
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Columna principal: asignaciones por clínica */}
        <div className="space-y-5 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Permisos por clínica")}
              description={t(
                "El rol se asigna por clínica: el profesional puede tener permisos distintos en cada una",
              )}
              icon={ShieldCheck}
              variant="primary"
            />

            {!employee.userId ? (
              <div className="flex flex-col items-start gap-3 p-5">
                <p className="text-[13px] text-muted-foreground">
                  {t(
                    "Este profesional aún no tiene usuario. Invítalo para poder asignar sus permisos por clínica.",
                  )}
                </p>
                <Button onClick={onInvite} disabled={busy} size="sm">
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MailPlus className="size-4" />
                  )}
                  {t("Invitar al profesional")}
                </Button>
              </div>
            ) : canManageScopes ? (
              <div className="p-5">
                <div className="space-y-3">
                  {employee.clinics.map((clinic, index) => (
                    <div
                      key={clinic.clinicId}
                      className="animate-slide-up flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 transition-colors hover:border-border sm:flex-row sm:items-center sm:justify-between"
                      style={{
                        animationDelay: `${Math.min(index * 60, 240)}ms`,
                      }}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          {clinic.clinicName}
                          {clinic.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {t("Principal")}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {currentRoleName(
                            clinic.clinicId,
                            roleByClinic,
                            scopes,
                            roles,
                          )}
                        </p>
                      </div>
                      <NativeSelect
                        value={roleByClinic[clinic.clinicId] ?? ""}
                        onChange={(value) => {
                          setRoleByClinic((prev) => ({
                            ...prev,
                            [clinic.clinicId]: value,
                          }));
                          setDirty(true);
                        }}
                        options={[
                          { value: "", label: t("Sin rol") },
                          ...roles.map((r) => ({
                            value: r.id,
                            label: r.name,
                          })),
                        ]}
                        className="sm:w-56"
                        ariaLabel={t("Rol en {clinic}", {
                          clinic: clinic.clinicName,
                        })}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={onSaveScopes}
                    disabled={busy || !dirty}
                    size="sm"
                  >
                    {busy ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <ShieldCheck data-icon="inline-start" />
                    )}
                    {t("Guardar permisos")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-[13px] text-muted-foreground">
                  {t(
                    "No hay clínicas asignadas. Agrega clínicas desde la edición del profesional.",
                  )}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Columna lateral: invitación + profesión */}
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Invitación y acceso")}
              description={t("Primer acceso del profesional al ERP")}
              icon={MailPlus}
              variant="primary"
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-[12.5px] font-medium text-muted-foreground">
                  {t("Estado del acceso")}
                </span>
                <span className="text-[12.5px] font-semibold">
                  {employee.userId
                    ? t("Usuario vinculado")
                    : t("Sin usuario de acceso")}
                </span>
              </div>

              {employee.userId && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(employee.userId!);
                    setCopiedUserId(true);
                    setTimeout(() => setCopiedUserId(false), 2000);
                  }}
                  className="flex w-full items-center justify-between rounded-lg bg-success-soft px-3 py-2 transition-colors hover:bg-success-soft/70"
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-success-foreground">
                    <Check className="size-3.5" />
                    {t("Usuario vinculado")}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    {copiedUserId ? t("Copiado") : t("Copiar ID")}
                    <Copy className="size-3.5" />
                  </span>
                </button>
              )}

              {invitationLink && (
                <div className="animate-scale-in flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 p-3">
                  <span className="text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {t("Enlace de invitación (72 h, un solo uso)")}
                  </span>
                  <code className="break-all font-mono text-[11px] text-foreground">
                    {invitationLink}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyInvitationLink}
                  >
                    {copied ? (
                      <Check data-icon="inline-start" className="size-3.5" />
                    ) : (
                      <Copy data-icon="inline-start" className="size-3.5" />
                    )}
                    {copied ? t("Copiado") : t("Copiar enlace")}
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <SectionHeader
              title={t("Profesión")}
              description={t("Tipo de profesional y perfil clínico")}
              icon={Stethoscope}
              variant="primary"
            />
            <div className="space-y-3 p-5">
              {employee.professionalTypeName ? (
                <>
                  <InfoItem
                    label={t("Tipo")}
                    value={employee.professionalTypeName}
                    icon={Stethoscope}
                  />
                  <p className="text-[12px] text-muted-foreground">
                    {t(
                      "El profesional puede completar su perfil y credenciales desde su propio acceso.",
                    )}
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  {t(
                    "Sin profesión asignada: el profesional podrá completarla al aceptar la invitación.",
                  )}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function currentRoleName(
  clinicId: string,
  roleByClinic: Record<string, string>,
  scopes: ProfessionalScopes | null,
  roles: Role[],
): string {
  const selected = roleByClinic[clinicId];
  if (selected) {
    const role = roles.find((r) => r.id === selected);
    return role?.name ?? "Sin rol asignado";
  }
  const role = scopes?.roles.find((r) => r.scopeId === clinicId);
  return role?.roleName ?? "Sin rol asignado";
}
