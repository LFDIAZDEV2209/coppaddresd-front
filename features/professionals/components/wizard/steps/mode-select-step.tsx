/**
 * Paso 0: selector de modo — "¿A quién vas a crear?"
 * Muestra 3 cards (Profesional / Empleado / Paciente) con gate de permisos.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { cn } from "@/lib/utils";
import type { Mode, StepProps } from "../wizard-state";

interface ModeOption {
  mode: Mode;
  permission: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

export function ModeSelectStep({ form, setForm, onNext }: StepProps) {
  const t = useT();
  const { hasPermission } = useAuth();

  const options: ModeOption[] = [
    {
      mode: "professional",
      permission: "Professionals.Create",
      icon: Stethoscope,
      title: t("Profesional clínico"),
      description: t(
        "Crea perfiles con especialidades, horarios de atención y acceso al ERP.",
      ),
    },
    {
      mode: "employee",
      permission: "Employees.Create",
      icon: Briefcase,
      title: t("Empleado"),
      description: t(
        "Personal administrativo o de soporte sin extensión clínica.",
      ),
    },
    {
      mode: "patient",
      permission: "Patients.Create",
      icon: Users,
      title: t("Paciente"),
      description: t(
        "Registra un nuevo paciente para seguimiento y citas.",
      ),
    },
  ];

  const visible = options.filter((o) => hasPermission(o.permission));

  const handleSelect = (mode: Mode) => {
    setForm((f) => ({ ...f, mode }));
    onNext();
  };

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("¿A quién vas a crear?")}
        description={t(
          "Selecciona el tipo de persona que vas a agregar al directorio.",
        )}
        icon={UserRound}
        variant="primary"
      />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="stagger-children grid grid-cols-1 gap-3 sm:grid-cols-3">
          {visible.map((opt) => {
            const Icon = opt.icon;
            const selected = form.mode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => handleSelect(opt.mode)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-soft text-primary",
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold">
                    {opt.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
                {selected && (
                  <CheckCircle2 className="size-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
              <Building2 className="size-6" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">
                {t("Sin permisos disponibles")}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {t(
                  "No tienes permisos para crear registros en el directorio. Contacta al administrador.",
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
