"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MailPlus, Plus, Search, Stethoscope, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  fetchEmployees,
  inviteEmployee,
  type EmployeeListItem,
  type PaginatedEmployees,
} from "@/features/professionals/services/employees-service";
import { ApiError } from "@/lib/api/http";

const STATUS_LABELS: Record<string, string> = {
  Invited: "Invitado",
  Active: "Activo",
  Inactive: "Inactivo",
};

export function ProfessionalDirectory() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedEmployees | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const load = useCallback(async (term?: string, showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await fetchEmployees({ page: 1, pageSize: 50, search: term });
      setData(result);
    } catch {
      setFeedback({ kind: "error", message: "No se pudo cargar el directorio de empleados." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchEmployees({ page: 1, pageSize: 50 });
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) {
          setFeedback({ kind: "error", message: "No se pudo cargar el directorio de empleados." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onInvite = async (employee: EmployeeListItem) => {
    setInvitingId(employee.id);
    setFeedback(null);
    try {
      const result = await inviteEmployee(employee.id);
      const message = result.invitationLink
        ? `Invitación enviada a ${employee.email}. Enlace (dev): ${result.invitationLink}`
        : `Invitación enviada a ${employee.email}. El profesional recibirá el enlace por correo.`;
      setFeedback({ kind: "ok", message });
      await load(search, true);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof ApiError ? err.message : "No se pudo enviar la invitación.",
      });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader
        title="Profesionales"
        description="Directorio del personal clínico y administrativo. Invita a nuevos profesionales para que completen su acceso."
        icon={Stethoscope}
        actions={
          <button
            onClick={() => router.push("/professionals/new")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0B2B4A] hover:bg-white/90 transition-colors"
          >
            <Plus className="size-4" />
            Nuevo profesional
          </button>
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

      <div className="mt-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(search, true);
            }}
            placeholder="Buscar por nombre o correo..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Correo</th>
                  <th className="px-4 py-3 font-semibold">Profesión</th>
                  <th className="px-4 py-3 font-semibold">Clínicas</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => router.push(`/professionals/${employee.id}`)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <UserRound className="size-3.5 text-muted-foreground" />
                        {employee.firstName} {employee.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{employee.email}</td>
                    <td className="px-4 py-3">
                      {employee.isProfessional ? (
                        employee.professionalTypeName ?? "Profesional"
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.clinicNames.length > 0
                        ? employee.clinicNames.join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          employee.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : employee.status === "Invited"
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABELS[employee.status] ?? employee.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!employee.isProfessional && employee.status === "Invited" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void onInvite(employee);
                          }}
                          disabled={invitingId === employee.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                        >
                          {invitingId === employee.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <MailPlus className="size-3.5" />
                          )}
                          Invitar
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(employee.id);
                          }}
                          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
                          aria-label="Copiar ID"
                        >
                          <Copy className="size-3.5" />
                          ID
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.data.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sin empleados para mostrar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}