"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/providers/i18n-provider";
import {
  splitBackendErrors,
  validateRoleForm,
  type RoleFieldErrors,
} from "@/features/auth-common/utils/validation";
import type { Role, RoleCreateInput, RoleUpdateInput } from "../types";

interface RoleFormDialogProps {
  open: boolean;
  role?: Role;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Guarda el rol (la página recarga la lista). Si falla, debe lanzar para
   * que el dialog muestre el error (ej. "El nombre del rol ya existe")
   * dentro del modal.
   */
  onSubmit: (
    input: RoleCreateInput | RoleUpdateInput,
    id?: string,
  ) => Promise<void>;
}

const emptyForm = {
  name: "",
  description: "" as string,
  isActive: true,
};

const emptyFieldErrors: RoleFieldErrors = { name: "", description: "" };

export function RoleFormDialog({
  open,
  role,
  saving,
  onOpenChange,
  onSubmit,
}: RoleFormDialogProps) {
  const t = useT();
  const [form, setForm] = useState(() =>
    role
      ? {
          name: role.name,
          description: role.description ?? "",
          isActive: role.isActive,
        }
      : emptyForm,
  );
  const [fieldErrors, setFieldErrors] =
    useState<RoleFieldErrors>(emptyFieldErrors);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  // Errores del backend/red: se muestran en una caja dentro del modal.
  const [submitErrors, setSubmitErrors] = useState<string[] | null>(null);

  const update = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateAll = () =>
    validateRoleForm({
      name: form.name,
      description: form.description,
    });

  const handleBlur = (field: "name" | "description") => () => {
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    setFieldErrors(validateAll());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validación client-side (espejo del backend): no se envía si hay errores.
    const errors = validateAll();
    setFieldErrors(errors);
    setTouched(new Set(["name", "description"]));
    if (errors.name || errors.description) return;

    setSubmitErrors(null);
    try {
      if (role) {
        const input: RoleUpdateInput = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          isActive: form.isActive,
        };
        await onSubmit(input, role.id);
      } else {
        const input: RoleCreateInput = {
          name: form.name.trim(),
          description: form.description.trim() || null,
        };
        await onSubmit(input);
      }
    } catch (err) {
      // Errores del backend (ej. "El nombre del rol ya existe") o de red/5xx:
      // el dialog queda abierto y muestra el mensaje.
      setSubmitErrors(
        splitBackendErrors(
          err instanceof Error
            ? err.message
            : t("Error inesperado. Intenta de nuevo."),
        ),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Shield className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="flex items-center gap-2">
                {role ? t("Editar rol") : t("Nuevo rol")}
                {role?.isSystem && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold text-muted-foreground"
                  >
                    {t("Sistema")}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {role
                  ? t("Actualizá los datos básicos del rol.")
                  : t("Creá un rol y luego asignale permisos desde el panel.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {submitErrors && submitErrors.length > 0 && (
            <div
              className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {submitErrors.length === 1 ? (
                <p>{submitErrors[0]}</p>
              ) : (
                <ul className="list-inside list-disc">
                  {submitErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Field
            label={t("Nombre")}
            required
            error={touched.has("name") ? fieldErrors.name : ""}
          >
            <Input
              id="role-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              onBlur={handleBlur("name")}
              placeholder={t("Ej. Analista")}
              disabled={saving}
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </Field>

          <Field
            label={t("Descripción")}
            error={touched.has("description") ? fieldErrors.description : ""}
          >
            <textarea
              id="role-description"
              className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              onBlur={handleBlur("description")}
              placeholder={t("Describí el propósito del rol")}
              disabled={saving}
            />
          </Field>

          {role && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{t("Rol activo")}</span>
                <span className="text-xs text-muted-foreground">
                  {t(
                    "Los roles inactivos no pueden asignarse a nuevos usuarios.",
                  )}
                </span>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
                disabled={saving}
                aria-label={t("Rol activo")}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t("Cancelar")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  {t("Guardando...")}
                </>
              ) : role ? (
                t("Guardar cambios")
              ) : (
                t("Crear rol")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p
          className="text-xs leading-snug whitespace-pre-line text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
