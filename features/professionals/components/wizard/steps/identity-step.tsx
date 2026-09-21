/**
 * Paso de identidad compartido entre los 3 modos.
 * - Profesional / Empleado: firstName*, lastName*, email*, phone
 * - Paciente: firstName*, lastName*, documentNumber?, email?, phone?, birthDate?, gender?
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfessionalAvatar } from "../../professional-visuals";
import { Field } from "../shared";
import type { StepProps } from "../wizard-state";

interface IdentityStepProps extends Omit<StepProps, "onBack"> {
  onBack?: () => void;
}

export function IdentityStep({
  form,
  setForm,
  onNext,
  onBack,
}: IdentityStepProps) {
  const t = useT();
  const isPatient = form.mode === "patient";

  // Errores por campo (se muestran al salir del campo — patrón Usuarios).
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.firstName.trim() === "")
      errors.firstName = t("El nombre es obligatorio.");
    if (form.lastName.trim() === "")
      errors.lastName = t("El apellido es obligatorio.");
    // Email obligatorio solo para profesional/empleado
    if (!isPatient) {
      if (form.email.trim() === "")
        errors.email = t("El correo es obligatorio.");
      else if (!/\S+@\S+\.\S+/.test(form.email))
        errors.email = t("Ingresa un correo válido (ej. nombre@clinica.com).");
    }
    return errors;
  }, [form.firstName, form.lastName, form.email, isPatient, t]);

  const handleBlur = useCallback(
    (field: string) => () =>
      setTouched((current) => new Set(current).add(field)),
    [],
  );

  const canContinue =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    (isPatient || /\S+@\S+\.\S+/.test(form.email));

  return (
    <div className="animate-slide-up flex flex-col gap-0">
      <SectionHeader
        title={isPatient ? t("Identidad del paciente") : t("Datos básicos")}
        description={
          isPatient
            ? t("Nombre, documento y contacto del paciente")
            : t("Identidad y contacto del profesional")
        }
        icon={UserRound}
        variant="primary"
      />
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex gap-5">
          <div className="hidden shrink-0 flex-col items-center gap-2 sm:flex">
            <ProfessionalAvatar
              employee={{
                firstName: form.firstName.trim() || "?",
                lastName: form.lastName.trim(),
              }}
              size="lg"
            />
            <span className="text-[10.5px] text-muted-foreground">
              {t("Vista previa")}
            </span>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <Field
              label={t("Nombre")}
              required
              error={touched.has("firstName") ? fieldErrors.firstName : ""}
            >
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                onBlur={handleBlur("firstName")}
                placeholder={t("Ej. María")}
                disabled={false}
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
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                onBlur={handleBlur("lastName")}
                placeholder={t("Ej. González")}
                disabled={false}
                aria-invalid={Boolean(fieldErrors.lastName)}
              />
            </Field>

            {/* Email: obligatorio para profesional/empleado, opcional para paciente */}
            <Field
              label={t("Correo electrónico")}
              required={!isPatient}
              error={touched.has("email") ? fieldErrors.email : ""}
              hint={
                !isPatient
                  ? t("El profesional usará este correo para acceder al ERP.")
                  : undefined
              }
            >
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={handleBlur("email")}
                placeholder={t("ej. usuario@coppaddresd.com")}
                disabled={false}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="off"
              />
            </Field>

            <Field label={t("Teléfono (opcional)")}>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("555-010-2244")}
                disabled={false}
                autoComplete="off"
              />
            </Field>

            {/* Campos exclusivos del paciente */}
            {isPatient && (
              <>
                <Field label={t("Número de documento (opcional)")}>
                  <Input
                    value={form.documentNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documentNumber: e.target.value,
                      })
                    }
                    placeholder={t("1234567890")}
                    disabled={false}
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("Fecha de nacimiento (opcional)")}>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value })
                    }
                    disabled={false}
                  />
                </Field>
                <Field label={t("Género (opcional)")}>
                  <Select
                    value={form.gender}
                    onValueChange={(value) =>
                      setForm({ ...form, gender: value ?? "" })
                    }
                  >
                    <SelectTrigger
                      aria-label={t("Género")}
                      className="h-9! w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("— Seleccionar —")}</SelectItem>
                      <SelectItem value="Femenino">{t("Femenino")}</SelectItem>
                      <SelectItem value="Masculino">
                        {t("Masculino")}
                      </SelectItem>
                      <SelectItem value="No binario">
                        {t("No binario")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft data-icon="inline-start" />
              {t("Atrás")}
            </Button>
          )}
          <Button onClick={onNext} disabled={!canContinue}>
            {t("Continuar")}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}
