"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Patient, PatientInput } from "../types";

interface PatientFormDialogProps {
  open: boolean;
  patient?: Patient;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: PatientInput) => Promise<void>;
}

const emptyForm: PatientInput = {
  firstName: "", lastName: "", documentType: "CC", documentNumber: "", birthDate: "", gender: "Femenino",
  phone: "", email: "", address: "", insurer: "Particular", notes: "",
};

export function PatientFormDialog({ open, patient, saving, onOpenChange, onSubmit }: PatientFormDialogProps) {
  const [form, setForm] = useState<PatientInput>(() => patient ? { ...patient } : emptyForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = <K extends keyof PatientInput>(field: K, value: PatientInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.documentNumber.trim() || !form.birthDate || !form.phone.trim()) {
      setValidationError("Completa los campos obligatorios para continuar.");
      return;
    }
    setValidationError(null);
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><UserRound className="size-5" /></div>
            <div className="flex flex-col gap-1"><DialogTitle>{patient ? "Editar paciente" : "Nuevo paciente"}</DialogTitle><DialogDescription>Registra la información clínica y de contacto.</DialogDescription></div>
          </div>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-5">
          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información personal</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" required><Input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="Ej. Valentina" /></Field>
              <Field label="Apellidos" required><Input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} placeholder="Ej. Ríos Salazar" /></Field>
              <Field label="Tipo de documento" required><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.documentType} onChange={(event) => update("documentType", event.target.value as PatientInput["documentType"])}><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="Pasaporte">Pasaporte</option></select></Field>
              <Field label="Documento" required><Input value={form.documentNumber} onChange={(event) => update("documentNumber", event.target.value)} placeholder="Número de documento" /></Field>
              <Field label="Fecha de nacimiento" required><Input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></Field>
              <Field label="Género" required><select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.gender} onChange={(event) => update("gender", event.target.value as PatientInput["gender"])}><option>Femenino</option><option>Masculino</option><option>No binario</option></select></Field>
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contacto y cobertura</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono" required><Input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+57 300 000 0000" /></Field>
              <Field label="Correo electrónico"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="correo@ejemplo.com" /></Field>
              <Field label="EPS / aseguradora"><Input value={form.insurer} onChange={(event) => update("insurer", event.target.value)} placeholder="Ej. SURA" /></Field>
              <Field label="Dirección"><Input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Dirección de residencia" /></Field>
            </div>
          </fieldset>
          <Field label="Observaciones"><textarea className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Alergias, antecedentes o notas relevantes" /></Field>
          {validationError && <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">{validationError}</p>}
          <DialogFooter className="-mx-6 -mb-5 px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin" data-icon="inline-start" />} {saving ? "Guardando..." : patient ? "Guardar cambios" : "Crear paciente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</Label>{children}</div>;
}
