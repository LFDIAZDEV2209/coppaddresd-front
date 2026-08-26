"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Copy,
  Loader2,
  MailPlus,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
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

const STATUS_LABELS: Record<string, string> = {
  Invited: "Invitado",
  Active: "Activo",
  Inactive: "Inactivo",
};

export function ProfessionalDetail({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [scopes, setScopes] = useState<ProfessionalScopes | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [roleByClinic, setRoleByClinic] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

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
        setFeedback({ kind: "error", message: t("No se pudo cargar el profesional.") });
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [id],
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
          setFeedback({ kind: "error", message: t("No se pudo cargar el profesional.") });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canManageScopes = useMemo(
    () => Boolean(employee?.userId) && scopes !== null && !scopes.requiresInvitation,
    [employee, scopes],
  );

  const onInvite = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const result = await inviteEmployee(id);
      const message = result.invitationLink
        ? t("Invitación enviada. Enlace (dev): {link}", { link: result.invitationLink })
        : t("Invitación enviada a {email}. Recibirá el enlace por correo.", { email: employee?.email ?? "" });
      setFeedback({ kind: "ok", message });
      await load(true);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof ApiError ? err.message : t("No se pudo enviar la invitación."),
      });
    } finally {
      setBusy(false);
    }
  };

  const onSaveScopes = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const rolesToApply: Array<{ roleId: string; scopeType: string; scopeId: string | null }> =
        Object.entries(roleByClinic)
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
      setFeedback({ kind: "ok", message: t("Permisos por clínica actualizados.") });
      await load();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof ApiError ? err.message : t("No se pudieron guardar los permisos."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t("Cargando...")}
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
        <Button variant="outline" className="mt-4" onClick={() => router.push("/professionals")}>
          {t("Volver al directorio")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        title={`${employee.firstName} ${employee.middleName ?? ""} ${employee.lastName}`}
        description={`${employee.email} · ${
          employee.isProfessional ? (employee.professionalTypeName ?? t("Profesional")) : t("Empleado")
        }`}
        icon={Stethoscope}
        actions={
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
              employee.status === "Active"
                ? "bg-emerald-500/10 text-emerald-700"
                : employee.status === "Invited"
                  ? "bg-amber-500/10 text-amber-700"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {t(STATUS_LABELS[employee.status] ?? employee.status)}
          </span>
        }
      />

      {feedback && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-[13px] ${
            feedback.kind === "ok"
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Columna principal: asignaciones + permisos */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="text-[14px] font-semibold">{t("Permisos por clínica")}</h2>
            </div>

            {!employee.userId ? (
              <div className="flex flex-col items-start gap-3 p-5">
                <p className="text-[13px] text-muted-foreground">
                  {t("Este profesional aún no tiene usuario. Invítalo para poder asignar sus permisos por clínica.")}
                </p>
                <Button onClick={onInvite} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                  {t("Invitar al profesional")}
                </Button>
              </div>
            ) : canManageScopes ? (
              <div className="p-5">
                <p className="mb-4 text-[12.5px] text-muted-foreground">
                  {t("El rol se asigna por clínica: el profesional puede tener permisos distintos en cada una. Los cambios aplican de inmediato.")}
                </p>
                <div className="space-y-3">
                  {employee.clinics.map((clinic) => (
                    <div
                      key={clinic.clinicId}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
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
                          {t(currentRoleName(clinic.clinicId, roleByClinic, scopes, roles))}
                        </p>
                      </div>
                      <select
                        value={roleByClinic[clinic.clinicId] ?? ""}
                        onChange={(e) => {
                          setRoleByClinic((prev) => ({ ...prev, [clinic.clinicId]: e.target.value }));
                          setDirty(true);
                        }}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-56"
                      >
                        <option value="">{t("Sin rol")}</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={onSaveScopes} disabled={busy || !dirty}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                    {t("Guardar permisos")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-[13px] text-muted-foreground">
                  {t("No hay clínicas asignadas. Agrega clínicas desde la edición del profesional.")}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Columna lateral: perfil + invitación */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-[14px] font-semibold">{t("Invitación")}</h2>
            </div>
            <div className="space-y-3 p-5">
              <InfoRow label={t("Organización")} value={employee.organizationName} />
              <InfoRow label={t("Estado")} value={t(STATUS_LABELS[employee.status] ?? employee.status)} />
              {employee.userId ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
                  <span className="text-[12.5px] font-medium text-emerald-700">
                    {t("Usuario vinculado")}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(employee.userId!)}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                    aria-label={t("Copiar ID de usuario")}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              ) : (
                <Button className="w-full" onClick={onInvite} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                  {t("Invitar")}
                </Button>
              )}
            </div>
          </section>

          {employee.professionalTypeName && (
            <section className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold">{t("Profesión")}</h2>
              </div>
              <div className="space-y-3 p-5">
                <InfoRow label={t("Tipo")} value={employee.professionalTypeName} />
                <p className="text-[12px] text-muted-foreground">
                  {t("El profesional puede completar su perfil y credenciales desde su propio acceso.")}
                </p>
              </div>
            </section>
          )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-medium">{value}</p>
    </div>
  );
}