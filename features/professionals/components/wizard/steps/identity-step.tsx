/**
 * Paso de identidad compartido entre los 3 modos.
 * - Profesional / Empleado: firstName*, lastName*, email*, phone
 * - Paciente: firstName*, lastName*, documentNumber*, birthDate*, gender*,
 *   phone* (el backend los exige), email opcional y contacto de emergencia
 *   opcional (teléfono obligatorio si se registra un nombre).
 */

"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  MailPlus,
  Siren,
  Trash2,
  UserRound,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProfessionalAvatar,
  statusLabel,
} from "../../professional-visuals";
import { Field } from "../shared";
import type { StepProps } from "../wizard-state";
import type { CountryOption } from "@/features/patients/types";
import type { EmailAvailabilityResult } from "@/features/professionals/services/employees-service";

interface IdentityStepProps extends Omit<StepProps, "onBack"> {
  onBack?: () => void;
  countries?: CountryOption[];
  /** Contexto del preflight del correo: perfiles y cuenta que ya lo usan. */
  emailContext?: EmailAvailabilityResult | null;
  /** Acción en curso sobre el perfil existente (invitar/eliminar). */
  emailActionBusy?: boolean;
  onInviteExisting?: () => void;
  onDeleteExisting?: () => void;
}

export function IdentityStep({
  form,
  setForm,
  onNext,
  onBack,
  countries = [],
  emailContext = null,
  emailActionBusy = false,
  onInviteExisting,
  onDeleteExisting,
}: IdentityStepProps) {
  const t = useT();
  const router = useRouter();
  const isPatient = form.mode === "patient";
  const emailEmployee = emailContext?.employee ?? null;
  const emailTaken = emailEmployee != null;
  const emailPatient = emailContext?.patient ?? null;
  const emailAccount = emailContext?.account ?? null;
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Catálogo deduplicado por código telefónico (varios países comparten el
  // +1). El trigger muestra solo el prefijo; el nombre completo aparece en
  // las opciones del modal.
  const countryOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const country of countries) {
      if (!country.phoneCode || seen.has(country.phoneCode)) continue;
      seen.add(country.phoneCode);
      options.push({
        value: country.phoneCode,
        label: `+${country.phoneCode} · ${country.name}`,
      });
    }
    return options;
  }, [countries]);

  // Valor visible en el trigger: solo el prefijo (ej. "+57").
  const countryItems = useMemo(
    () =>
      Object.fromEntries(
        countryOptions.map((option) => [option.value, `+${option.value}`]),
      ),
    [countryOptions],
  );

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
      else if (emailTaken)
        errors.email = t(
          "Ya existe un empleado con el correo '{email}' en esta organización.",
          { email: form.email.trim() },
        );
    }
    if (isPatient) {
      // El backend exige documento, fecha de nacimiento, género y teléfono.
      if (form.documentNumber.trim() === "")
        errors.documentNumber = t("El documento es obligatorio.");
      if (form.birthDate === "")
        errors.birthDate = t("La fecha de nacimiento es obligatoria.");
      if (form.gender.trim() === "")
        errors.gender = t("El género es obligatorio.");
      if (form.phone.trim() === "")
        errors.phone = t("El teléfono es obligatorio.");
      // Contacto de emergencia: opcional, con teléfono si hay nombre.
      if (
        form.emergencyContactName.trim() !== "" &&
        form.emergencyContactPhone.trim() === ""
      )
        errors.emergencyContactPhone = t(
          "El contacto de emergencia requiere teléfono.",
        );
      if (
        form.emergencyContactEmail.trim() !== "" &&
        !/\S+@\S+\.\S+/.test(form.emergencyContactEmail)
      )
        errors.emergencyContactEmail = t(
          "Ingresa un correo válido (ej. nombre@clinica.com).",
        );
    }
    return errors;
  }, [
    form.firstName,
    form.lastName,
    form.email,
    form.documentNumber,
    form.birthDate,
    form.gender,
    form.phone,
    form.emergencyContactName,
    form.emergencyContactPhone,
    form.emergencyContactEmail,
    isPatient,
    emailTaken,
    t,
  ]);

  const handleBlur = useCallback(
    (field: string) => () =>
      setTouched((current) => new Set(current).add(field)),
    [],
  );

  const emergencyContactInvalid =
    isPatient &&
    ((form.emergencyContactName.trim() !== "" &&
      form.emergencyContactPhone.trim() === "") ||
      (form.emergencyContactEmail.trim() !== "" &&
        !/\S+@\S+\.\S+/.test(form.emergencyContactEmail)));

  const canContinue =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    (isPatient || (/\S+@\S+\.\S+/.test(form.email) && !emailTaken)) &&
    (!isPatient ||
      (form.documentNumber.trim() !== "" &&
        form.birthDate !== "" &&
        form.gender.trim() !== "" &&
        form.phone.trim() !== "")) &&
    !emergencyContactInvalid;

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
              error={
                // Con la tarjeta de perfil existente el aviso rojo sería
                // redundante: la tarjeta explica y ofrece las acciones.
                emailEmployee ? "" : touched.has("email") || emailTaken ? fieldErrors.email : ""
              }
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

            {/* Tarjeta de perfil existente: invitar el perfil o liberar el
                correo eliminándolo. La creación nueva queda bloqueada. */}
            {!isPatient && emailEmployee && (
              <>
                <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 sm:col-span-2">
                  <div className="flex items-start gap-2.5">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className="text-[13px] font-medium text-foreground">
                        {t(
                          "Existe un perfil de {name} ({status}) en esta organización.",
                          {
                            name: `${emailEmployee.firstName} ${emailEmployee.lastName}`.trim(),
                            status: t(statusLabel(emailEmployee.status)),
                          },
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emailEmployee.hasAccount
                          ? t(
                              "Este perfil ya tiene una cuenta vinculada. Si necesitas reutilizar este correo, elimina el perfil.",
                            )
                          : t(
                              "Puedes invitar al perfil existente (se sumarán sus roles) o eliminarlo para liberar el correo.",
                            )}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {!emailEmployee.hasAccount && onInviteExisting && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={onInviteExisting}
                            disabled={emailActionBusy}
                          >
                            <MailPlus data-icon="inline-start" />
                            {t("Invitar perfil existente")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(`/employees/${emailEmployee.id}`)
                          }
                        >
                          <Eye data-icon="inline-start" />
                          {t("Ver perfil")}
                        </Button>
                        {onDeleteExisting && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirmDelete(true)}
                            disabled={emailActionBusy}
                          >
                            <Trash2 data-icon="inline-start" />
                            {t("Eliminar perfil")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <AlertDialog
                  open={confirmDelete}
                  onOpenChange={setConfirmDelete}
                >
                  <AlertDialogContent className="sm:max-w-md!">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("¿Eliminar el perfil de {name}?", {
                          name: `${emailEmployee.firstName} ${emailEmployee.lastName}`.trim(),
                        })}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          "El perfil se ocultará del directorio y su correo quedará libre. La cuenta de acceso y el historial clínico se conservan.",
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => {
                          setConfirmDelete(false);
                          onDeleteExisting?.();
                        }}
                      >
                        {t("Eliminar")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Nota de coexistencia: el correo ya vive en un paciente o en una
                cuenta; el nuevo perfil se vincula y los roles se suman. */}
            {!isPatient &&
              !emailEmployee &&
              (emailPatient || emailAccount?.exists) && (
                <p className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground sm:col-span-2">
                  {emailPatient
                    ? t(
                        "Este correo ya pertenece a un paciente. Se creará el perfil y se vinculará la misma cuenta; sus roles se suman sin quitar los existentes.",
                      )
                    : t(
                        "Este correo ya tiene una cuenta. Se vinculará al nuevo perfil y sus roles se suman sin quitar los existentes.",
                      )}
                </p>
              )}

            <Field
              label={isPatient ? t("Teléfono") : t("Teléfono (opcional)")}
              required={isPatient}
              error={touched.has("phone") ? fieldErrors.phone : ""}
            >
              <div className="flex gap-2">
                <Select
                  items={countryItems}
                  value={form.phoneCountryCode}
                  onValueChange={(value) =>
                    setForm({ ...form, phoneCountryCode: value ?? "" })
                  }
                >
                  <SelectTrigger
                    aria-label={t("País del teléfono")}
                    className="h-9! w-28 shrink-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="min-w-0 flex-1"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onBlur={handleBlur("phone")}
                  placeholder={t("300 000 0000")}
                  disabled={false}
                  autoComplete="off"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
              </div>
            </Field>

            {/* Campos exclusivos del paciente */}
            {isPatient && (
              <>
                <Field
                  label={t("Número de documento")}
                  required
                  error={
                    touched.has("documentNumber")
                      ? fieldErrors.documentNumber
                      : ""
                  }
                >
                  <Input
                    value={form.documentNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        documentNumber: e.target.value,
                      })
                    }
                    onBlur={handleBlur("documentNumber")}
                    placeholder={t("1234567890")}
                    disabled={false}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.documentNumber)}
                  />
                </Field>
                <Field
                  label={t("Fecha de nacimiento")}
                  required
                  error={touched.has("birthDate") ? fieldErrors.birthDate : ""}
                >
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value })
                    }
                    onBlur={handleBlur("birthDate")}
                    disabled={false}
                    aria-invalid={Boolean(fieldErrors.birthDate)}
                  />
                </Field>
                <Field
                  label={t("Género")}
                  required
                  error={touched.has("gender") ? fieldErrors.gender : ""}
                >
                  <Select
                    value={form.gender}
                    onValueChange={(value) => {
                      setForm({ ...form, gender: value ?? "" });
                      setTouched((current) => new Set(current).add("gender"));
                    }}
                  >
                    <SelectTrigger
                      aria-label={t("Género")}
                      className="h-9! w-full"
                      aria-invalid={Boolean(fieldErrors.gender)}
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

                {/* Contacto de emergencia (opcional): el teléfono es
                    obligatorio si se registra un nombre. */}
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Siren
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      {t("Contacto de emergencia")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("Si registras el nombre, el teléfono es obligatorio.")}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("Nombre")}
                      error={
                        touched.has("emergencyContactName")
                          ? fieldErrors.emergencyContactName
                          : ""
                      }
                    >
                      <Input
                        value={form.emergencyContactName}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            emergencyContactName: e.target.value,
                          })
                        }
                        onBlur={handleBlur("emergencyContactName")}
                        placeholder={t("Nombre de contacto de emergencia")}
                        disabled={false}
                        autoComplete="off"
                        aria-invalid={Boolean(
                          fieldErrors.emergencyContactName,
                        )}
                      />
                    </Field>
                    <Field
                      label={t("Parentesco")}
                      error={
                        touched.has("emergencyContactRelationship")
                          ? fieldErrors.emergencyContactRelationship
                          : ""
                      }
                    >
                      <Input
                        value={form.emergencyContactRelationship}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            emergencyContactRelationship: e.target.value,
                          })
                        }
                        onBlur={handleBlur("emergencyContactRelationship")}
                        placeholder={t("Ej. Madre, cónyuge, hermano")}
                        disabled={false}
                        autoComplete="off"
                        aria-invalid={Boolean(
                          fieldErrors.emergencyContactRelationship,
                        )}
                      />
                    </Field>
                    <Field
                      label={t("Teléfono")}
                      required={form.emergencyContactName.trim() !== ""}
                      error={
                        touched.has("emergencyContactPhone")
                          ? fieldErrors.emergencyContactPhone
                          : ""
                      }
                    >
                      <div className="flex gap-2">
                        <Select
                          items={countryItems}
                          value={form.emergencyContactPhoneCountryCode}
                          onValueChange={(value) =>
                            setForm({
                              ...form,
                              emergencyContactPhoneCountryCode: value ?? "",
                            })
                          }
                        >
                          <SelectTrigger
                            aria-label={t("País del teléfono")}
                            className="h-9! w-28 shrink-0"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {countryOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="min-w-0 flex-1"
                          type="tel"
                          value={form.emergencyContactPhone}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              emergencyContactPhone: e.target.value,
                            })
                          }
                          onBlur={handleBlur("emergencyContactPhone")}
                          placeholder={t("300 000 0000")}
                          disabled={false}
                          autoComplete="off"
                          aria-invalid={Boolean(
                            fieldErrors.emergencyContactPhone,
                          )}
                        />
                      </div>
                    </Field>
                    <Field
                      label={t("Correo")}
                      error={
                        touched.has("emergencyContactEmail")
                          ? fieldErrors.emergencyContactEmail
                          : ""
                      }
                    >
                      <Input
                        type="email"
                        value={form.emergencyContactEmail}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            emergencyContactEmail: e.target.value,
                          })
                        }
                        onBlur={handleBlur("emergencyContactEmail")}
                        placeholder={t("ej. usuario@coppaddresd.com")}
                        disabled={false}
                        autoComplete="off"
                        aria-invalid={Boolean(
                          fieldErrors.emergencyContactEmail,
                        )}
                      />
                    </Field>
                  </div>
                </div>
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
