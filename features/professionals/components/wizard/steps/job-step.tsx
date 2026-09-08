/**
 * Paso de puesto — nuevo para modo empleado.
 * Cargo y departamento del empleado.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { ArrowLeft, ArrowRight, Briefcase } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../shared";
import type { StepProps } from "../wizard-state";

export function JobStep({ form, setForm, onNext, onBack }: StepProps) {
  const t = useT();

  const canContinue = form.jobTitle.trim() !== "";

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Puesto de trabajo")}
        description={t("Cargo y departamento del empleado")}
        icon={Briefcase}
        variant="strong"
      />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <Field label={t("Cargo")} required>
          <Input
            value={form.jobTitle}
            onChange={(e) =>
              setForm({ ...form, jobTitle: e.target.value })
            }
            placeholder={t("Ej. Recepcionista")}
            disabled={false}
          />
        </Field>
        <Field label={t("Departamento (opcional)")}>
          <Input
            value={form.department}
            onChange={(e) =>
              setForm({ ...form, department: e.target.value })
            }
            placeholder={t("Ej. Administración")}
            disabled={false}
          />
        </Field>

        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            {t("Continuar")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
