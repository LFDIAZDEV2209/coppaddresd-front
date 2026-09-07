/**
 * Paso de clínica para pacientes — selector simple con la organización
 * activa por defecto. El paciente se asigna a una sola clínica (opcional);
 * el resto de detalles se completa en el perfil.
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Building2, Info } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { OrganizationTree } from "@/features/professionals/services/employees-service";
import type { FormState } from "../wizard-state";

interface PatientClinicStepProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onNext: () => void;
  onBack: () => void;
  organizations: OrganizationTree[];
}

export function PatientClinicStep({
  form,
  setForm,
  onNext,
  onBack,
  organizations,
}: PatientClinicStepProps) {
  const t = useT();

  const activeOrg = useMemo(
    () => organizations.find((o) => o.id === form.organizationId) ?? null,
    [organizations, form.organizationId],
  );

  // Si solo hay una organización, seleccionarla automáticamente
  const singleOrg = organizations.length === 1 ? organizations[0] : null;

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={t("Clínica")}
        description={t(
          "Selecciona la clínica donde será atendido el paciente. Puedes completar más detalles después.",
        )}
        icon={Building2}
        variant="primary"
      />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-[12.5px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          {t(
            "Opcional: si no seleccionas una clínica, podrás asignarla después desde el perfil del paciente.",
          )}
        </p>

        {organizations.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("Organización")}
            </label>
            <NativeSelect
              value={form.organizationId}
              onChange={(value) =>
                setForm({
                  ...form,
                  organizationId: value,
                  clinicAssignments: [],
                })
              }
              options={organizations.map((o) => ({
                value: o.id,
                label: o.name,
              }))}
              ariaLabel={t("Organización")}
            />
          </div>
        )}

        {singleOrg && !form.organizationId && (
          <div className="text-[12.5px] text-muted-foreground">
            {t("Organización:")}{" "}
            <span className="font-semibold text-foreground">
              {singleOrg.name}
            </span>
          </div>
        )}

        {activeOrg && activeOrg.clinics.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("Clínica (opcional)")}
            </label>
            <NativeSelect
              value={
                form.clinicAssignments.length > 0
                  ? form.clinicAssignments[0].clinicId
                  : ""
              }
              onChange={(value) => {
                if (value) {
                  setForm({
                    ...form,
                    clinicAssignments: [
                      {
                        clinicId: value,
                        isPrimary: true,
                        status: "Active",
                        roleId: null,
                        locationIds: [],
                      },
                    ],
                  });
                } else {
                  setForm({ ...form, clinicAssignments: [] });
                }
              }}
              options={[
                { value: "", label: t("— Sin clínica —") },
                ...activeOrg.clinics.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
              ariaLabel={t("Clínica")}
            />
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          <Button onClick={onNext}>
            {t("Continuar")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
