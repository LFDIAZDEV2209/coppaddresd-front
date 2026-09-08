/**
 * Paso 0: selector de modo — "¿A quién vas a crear?"
 * Muestra cards agrupadas (Equipo / Pacientes) con gate de permisos.
 * Si el contexto reduce a un solo modo, se omite este paso.
 */

"use client";

import { useEffect } from "react";
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
import type {
  Mode,
  WizardContext,
  StepProps,
} from "../wizard-state";
import { getAvailableModes, groupModes } from "../wizard-state";

interface ModeOption {
  mode: Mode;
  permission: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

/** Definición completa de las opciones de modo (con permisos y labels). */
const ALL_OPTIONS: ModeOption[] = [
  {
    mode: "professional",
    permission: "Professionals.Create",
    icon: Stethoscope,
    title: "Profesional clínico",
    description:
      "Crea perfiles con especialidades, horarios de atención y acceso al ERP.",
  },
  {
    mode: "employee",
    permission: "Employees.Create",
    icon: Briefcase,
    title: "Empleado",
    description: "Personal administrativo o de soporte sin extensión clínica.",
  },
  {
    mode: "patient",
    permission: "Patients.Create",
    icon: Users,
    title: "Paciente",
    description: "Registra un nuevo paciente para seguimiento y citas.",
  },
];

interface ModeSelectStepProps extends StepProps {
  context?: WizardContext | null;
}

export function ModeSelectStep({
  form,
  setForm,
  onNext,
  context,
}: ModeSelectStepProps) {
  const t = useT();
  const { hasPermission } = useAuth();

  // Calcular modos disponibles según contexto + permisos
  const availableModes = getAvailableModes(context ?? null, hasPermission);

  // Auto-avanzar si solo queda un modo disponible
  useEffect(() => {
    if (availableModes.length === 1 && !form.mode) {
      setForm((f) => ({ ...f, mode: availableModes[0] }));
      onNext();
    }
  }, [availableModes, form.mode, setForm, onNext]);

  // Si hay un solo modo y ya se seleccionó, no renderizar nada
  if (availableModes.length <= 1) return null;

  // Agrupar modos para el selector visual
  const groups = groupModes(availableModes, context ?? null);

  // Construir mapa de opciones disponibles para acceso rápido
  const optionsByMode = new Map(
    ALL_OPTIONS.filter((o) => availableModes.includes(o.mode)).map((o) => [
      o.mode,
      o,
    ]),
  );

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
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {groups.map((group) => (
          <div key={group.label || "all"} className="flex flex-col gap-2">
            {group.label && (
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.label)}
              </span>
            )}
            <div
              className={cn(
                "stagger-children grid grid-cols-1 gap-3",
                group.modes.length === 3
                  ? "sm:grid-cols-3"
                  : group.modes.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-1",
              )}
            >
              {group.modes.map((mode) => {
                const opt = optionsByMode.get(mode)!;
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
                        {t(opt.title)}
                      </span>
                      <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                        {t(opt.description)}
                      </span>
                    </span>
                    {selected && (
                      <CheckCircle2 className="size-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {availableModes.length === 0 && (
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
