"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

/**
 * Checklist en vivo de la política de contraseñas del backend
 * (mínimo 8 + número + minúscula + mayúscula + carácter especial).
 * Se usa en el alta de usuarios y en la aceptación de invitaciones.
 */
export function PasswordChecklist({
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
