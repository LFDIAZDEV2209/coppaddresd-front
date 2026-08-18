"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  Cigarette,
  CircleDot,
  ClipboardPen,
  CreditCard,
  Droplets,
  Dumbbell,
  FileText,
  Fingerprint,
  Globe,
  HeartPulse,
  Home,
  Hospital,
  IdCard,
  LoaderCircle,
  Mail,
  Map,
  MapPin,
  MapPinned,
  NotebookPen,
  Phone,
  Pill,
  Plus,
  Save,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stethoscope,
  Trash2,
  User,
  UserRound,
  Users,
  Wine,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  createPatient,
  fetchInsurers,
  getPatient,
  updatePatient,
} from "../services/patients-service";
import type {
  Insurer,
  Patient,
  PatientInput,
  PatientStatus,
} from "../types";

interface Row {
  key: string;
}
interface DiagnosisRow extends Row {
  icd10Code: string;
  description: string;
  isPrimary: boolean;
}
interface MedicationRow extends Row {
  name: string;
  ndc: string;
  rxNorm: string;
  drugClass: string;
  frequency: string;
}
interface AllergyRow extends Row {
  allergen: string;
  notes: string;
}
interface VitalRow extends Row {
  measuredAt: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  temperatureC: string;
  o2Saturation: string;
  heightCm: string;
  weightKg: string;
  editable: boolean;
}

interface PatientFormState {
  medicalRecordNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  dateOfBirth: string;
  gender: string;
  ethnicity: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContact: string;
  insurerId: string;
  memberId: string;
  smokingStatus: string;
  alcoholStatus: string;
  exerciseLevel: string;
  disability: string;
  hospitalizationHistory: string;
  surgeryHistory: string;
  status: PatientStatus;
  notes: string;
  diagnoses: DiagnosisRow[];
  medications: MedicationRow[];
  allergies: AllergyRow[];
  vitals: VitalRow[];
}

let rowKeyCounter = 0;
function nextRowKey(): string {
  rowKeyCounter += 1;
  return `row-${rowKeyCounter}`;
}

function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function emptyVitalRow(measuredAt = new Date().toISOString().slice(0, 10)): VitalRow {
  return {
    key: nextRowKey(),
    measuredAt,
    systolic: "",
    diastolic: "",
    heartRate: "",
    temperatureC: "",
    o2Saturation: "",
    heightCm: "",
    weightKg: "",
    editable: true,
  };
}

function createEmptyForm(): PatientFormState {
  return {
    medicalRecordNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    documentType: "CC",
    documentNumber: "",
    dateOfBirth: "",
    gender: "Femenino",
    ethnicity: "",
    bloodType: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    emergencyContact: "",
    insurerId: "",
    memberId: "",
    smokingStatus: "",
    alcoholStatus: "",
    exerciseLevel: "",
    disability: "",
    hospitalizationHistory: "",
    surgeryHistory: "",
    status: "Activo",
    notes: "",
    diagnoses: [],
    medications: [],
    allergies: [],
    vitals: [emptyVitalRow()],
  };
}

function fromPatient(patient: Patient): PatientFormState {
  return {
    medicalRecordNumber: patient.medicalRecordNumber ?? "",
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    lastName: patient.lastName,
    documentType: patient.documentType ?? "CC",
    documentNumber: patient.documentNumber ?? "",
    dateOfBirth: toDateInput(patient.dateOfBirth),
    gender: patient.gender ?? "Femenino",
    ethnicity: patient.ethnicity ?? "",
    bloodType: patient.bloodType ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    city: patient.city ?? "",
    state: patient.state ?? "",
    postalCode: patient.postalCode ?? "",
    emergencyContact: patient.emergencyContact ?? "",
    insurerId: patient.insurerId ?? "",
    memberId: patient.memberId ?? "",
    smokingStatus: patient.smokingStatus ?? "",
    alcoholStatus: patient.alcoholStatus ?? "",
    exerciseLevel: patient.exerciseLevel ?? "",
    disability: patient.disability ?? "",
    hospitalizationHistory: patient.hospitalizationHistory ?? "",
    surgeryHistory: patient.surgeryHistory ?? "",
    status: patient.status,
    notes: patient.notes ?? "",
    diagnoses: patient.diagnoses.map((d) => ({
      key: d.id,
      icd10Code: d.icd10Code,
      description: d.description ?? "",
      isPrimary: d.isPrimary,
    })),
    medications: patient.medications.map((m) => ({
      key: m.id,
      name: m.name,
      ndc: m.ndc ?? "",
      rxNorm: m.rxNorm ?? "",
      drugClass: m.drugClass ?? "",
      frequency: m.frequency ?? "",
    })),
    allergies: patient.allergies.map((a) => ({
      key: a.id,
      allergen: a.allergen,
      notes: a.notes ?? "",
    })),
    vitals: patient.vitalSigns.map((v, index) => ({
      key: v.id,
      measuredAt: toDateInput(v.measuredAt),
      systolic: v.systolic === null ? "" : String(v.systolic),
      diastolic: v.diastolic === null ? "" : String(v.diastolic),
      heartRate: v.heartRate === null ? "" : String(v.heartRate),
      temperatureC: v.temperatureC === null ? "" : String(v.temperatureC),
      o2Saturation: v.o2Saturation === null ? "" : String(v.o2Saturation),
      heightCm: v.heightCm === null ? "" : String(v.heightCm),
      weightKg: v.weightKg === null ? "" : String(v.weightKg),
      editable: index === 0,
    })),
  };
}

function toInput(form: PatientFormState): PatientInput {
  const text = (value: string): string | null => value.trim() || null;
  return {
    medicalRecordNumber: text(form.medicalRecordNumber),
    firstName: form.firstName.trim(),
    middleName: text(form.middleName),
    lastName: form.lastName.trim(),
    documentType: text(form.documentType),
    documentNumber: text(form.documentNumber),
    dateOfBirth: form.dateOfBirth || null,
    gender: text(form.gender),
    ethnicity: text(form.ethnicity),
    bloodType: text(form.bloodType),
    phone: text(form.phone),
    email: text(form.email),
    address: text(form.address),
    city: text(form.city),
    state: text(form.state),
    postalCode: text(form.postalCode),
    emergencyContact: text(form.emergencyContact),
    insurerId: form.insurerId || null,
    memberId: text(form.memberId),
    smokingStatus: text(form.smokingStatus),
    alcoholStatus: text(form.alcoholStatus),
    exerciseLevel: text(form.exerciseLevel),
    disability: text(form.disability),
    hospitalizationHistory: text(form.hospitalizationHistory),
    surgeryHistory: text(form.surgeryHistory),
    status: form.status,
    notes: text(form.notes),
    diagnoses: form.diagnoses
      .filter((d) => d.icd10Code.trim())
      .map((d) => ({
        icd10Code: d.icd10Code.trim(),
        description: text(d.description),
        isPrimary: d.isPrimary,
      })),
    medications: form.medications
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        ndc: text(m.ndc),
        rxNorm: text(m.rxNorm),
        drugClass: text(m.drugClass),
        frequency: text(m.frequency),
      })),
    allergies: form.allergies
      .filter((a) => a.allergen.trim())
      .map((a) => ({
        allergen: a.allergen.trim(),
        notes: text(a.notes),
      })),
    vitalSigns: form.vitals
      .filter(
        (v) =>
          v.measuredAt ||
          v.systolic ||
          v.diastolic ||
          v.heartRate ||
          v.temperatureC ||
          v.o2Saturation ||
          v.heightCm ||
          v.weightKg,
      )
      .map((v) => ({
        measuredAt: v.measuredAt || null,
        systolic: toNumberOrNull(v.systolic),
        diastolic: toNumberOrNull(v.diastolic),
        heartRate: toNumberOrNull(v.heartRate),
        temperatureC: toNumberOrNull(v.temperatureC),
        o2Saturation: toNumberOrNull(v.o2Saturation),
        heightCm: toNumberOrNull(v.heightCm),
        weightKg: toNumberOrNull(v.weightKg),
      })),
  };
}

export function PatientFormPage({ patientId }: { patientId?: string }) {
  const isEdit = Boolean(patientId);
  const router = useRouter();
  const [form, setForm] = useState<PatientFormState>(createEmptyForm);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchInsurers()
      .then((items) => {
        if (!cancelled) setInsurers(items);
      })
      .catch(() => {
        if (!cancelled) setInsurers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    void getPatient(patientId)
      .then((patient) => {
        if (cancelled) return;
        setForm(fromPatient(patient));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const update = <K extends keyof PatientFormState>(
    field: K,
    value: PatientFormState[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const removeByKey = <T extends Row>(list: T[], key: string): T[] =>
    list.filter((row) => row.key !== key);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("El nombre y los apellidos son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (patientId) await updatePatient(patientId, toInput(form));
      else await createPatient(toInput(form));
      router.push("/patients");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <PageHeader
        title={isEdit ? "Editar paciente" : "Nuevo paciente"}
        description={
          isEdit
            ? "Actualiza la información clínica y de contacto del paciente"
            : "Registra la información clínica y de contacto del paciente"
        }
        icon={UserRound}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patients")}
          >
            <ArrowLeft data-icon="inline-start" />
            Volver al directorio
          </Button>
        }
      />

      {loading ? (
        <FormSkeleton />
      ) : notFound ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
          <p className="text-sm font-semibold text-destructive">
            Paciente no encontrado
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Es posible que el registro haya sido eliminado o que la dirección
            sea incorrecta.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/patients")}
          >
            <ArrowLeft data-icon="inline-start" />
            Volver al directorio
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-8">
          {error && (
            <p
              className="rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* ── Información personal ── */}
          <FormSection legend="Información personal" icon={UserRound}>
            <Field label="Número de historia clínica" icon={FileText}>
              <Input
                value={form.medicalRecordNumber}
                onChange={(event) =>
                  update("medicalRecordNumber", event.target.value)
                }
                placeholder="MRN-… (se genera solo si se deja vacío)"
              />
            </Field>
            <Field label="Nombre" required icon={User}>
              <Input
                value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)}
                placeholder="Primer nombre"
              />
            </Field>
            <Field label="Segundo nombre" icon={User}>
              <Input
                value={form.middleName}
                onChange={(event) => update("middleName", event.target.value)}
                placeholder="Segundo nombre"
              />
            </Field>
            <Field label="Apellidos" required icon={User}>
              <Input
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
                placeholder="Apellidos"
              />
            </Field>
            <Field label="Tipo de documento" icon={IdCard}>
              <Select
                value={form.documentType}
                onChange={(value) => update("documentType", value)}
              >
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="Pasaporte">Pasaporte</option>
              </Select>
            </Field>
            <Field label="Número de documento" icon={Fingerprint}>
              <Input
                value={form.documentNumber}
                onChange={(event) => update("documentNumber", event.target.value)}
                placeholder="Número de documento"
              />
            </Field>
            <Field label="Fecha de nacimiento" icon={CalendarDays}>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => update("dateOfBirth", event.target.value)}
              />
            </Field>
            <Field label="Género" icon={Users}>
              <Select
                value={form.gender}
                onChange={(value) => update("gender", value)}
              >
                <option>Femenino</option>
                <option>Masculino</option>
                <option>No binario</option>
              </Select>
            </Field>
            <Field label="Etnia" icon={Globe}>
              <Input
                value={form.ethnicity}
                onChange={(event) => update("ethnicity", event.target.value)}
                placeholder="Etnia o grupo étnico"
              />
            </Field>
            <Field label="Tipo de sangre" icon={Droplets}>
              <Input
                value={form.bloodType}
                onChange={(event) => update("bloodType", event.target.value)}
                placeholder="Ej. O+"
              />
            </Field>
            <Field label="Contacto de emergencia" icon={Siren}>
              <Input
                value={form.emergencyContact}
                onChange={(event) =>
                  update("emergencyContact", event.target.value)
                }
                placeholder="Nombre de contacto de emergencia"
              />
            </Field>
          </FormSection>

          {/* ── Contacto y ubicación ── */}
          <FormSection legend="Contacto y ubicación" icon={MapPin}>
            <Field label="Teléfono" icon={Phone}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="+57 300 000 0000"
              />
            </Field>
            <Field label="Correo electrónico" icon={Mail}>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </Field>
            <Field label="Dirección" icon={Home}>
              <Input
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                placeholder="Dirección de residencia"
              />
            </Field>
            <Field label="Ciudad" icon={Building2}>
              <Input
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                placeholder="Ciudad"
              />
            </Field>
            <Field label="Departamento / estado" icon={Map}>
              <Input
                value={form.state}
                onChange={(event) => update("state", event.target.value)}
                placeholder="Estado o departamento"
              />
            </Field>
            <Field label="Código postal" icon={MapPinned}>
              <Input
                value={form.postalCode}
                onChange={(event) => update("postalCode", event.target.value)}
                placeholder="Código postal"
              />
            </Field>
          </FormSection>

          {/* ── Cobertura ── */}
          <FormSection legend="Cobertura" icon={ShieldCheck}>
            <Field label="Aseguradora" icon={CreditCard}>
              <Select
                value={form.insurerId}
                onChange={(value) => update("insurerId", value)}
              >
                <option value="">Sin aseguradora</option>
                {insurers.map((insurer) => (
                  <option key={insurer.id} value={insurer.id}>
                    {insurer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Número de afiliación (member ID)" icon={BadgeCheck}>
              <Input
                value={form.memberId}
                onChange={(event) => update("memberId", event.target.value)}
                placeholder="Número de afiliado"
              />
            </Field>
          </FormSection>

          {/* ── Estilo de vida y antecedentes ── */}
          <FormSection legend="Estilo de vida y antecedentes" icon={HeartPulse}>
            <Field label="Tabaquismo" icon={Cigarette}>
              <Input
                value={form.smokingStatus}
                onChange={(event) => update("smokingStatus", event.target.value)}
                placeholder="Ej. Current, Former, Never"
              />
            </Field>
            <Field label="Consumo de alcohol" icon={Wine}>
              <Input
                value={form.alcoholStatus}
                onChange={(event) => update("alcoholStatus", event.target.value)}
                placeholder="Ej. None, Occasional, Regular"
              />
            </Field>
            <Field label="Nivel de ejercicio" icon={Dumbbell}>
              <Input
                value={form.exerciseLevel}
                onChange={(event) => update("exerciseLevel", event.target.value)}
                placeholder="Ej. Active, Sedentary"
              />
            </Field>
            <Field label="Discapacidad" icon={Accessibility}>
              <Input
                value={form.disability}
                onChange={(event) => update("disability", event.target.value)}
                placeholder="Discapacidad si aplica"
              />
            </Field>
            <Field label="Historial de hospitalización" icon={Hospital}>
              <Input
                value={form.hospitalizationHistory}
                onChange={(event) =>
                  update("hospitalizationHistory", event.target.value)
                }
                placeholder="Antecedentes de hospitalización"
              />
            </Field>
            <Field label="Historial de cirugías" icon={Scissors}>
              <Input
                value={form.surgeryHistory}
                onChange={(event) => update("surgeryHistory", event.target.value)}
                placeholder="Antecedentes quirúrgicos"
              />
            </Field>
          </FormSection>

          {/* ── Diagnósticos ── */}
          <FormSection legend="Diagnósticos" icon={Stethoscope} layout="stack">
            {form.diagnoses.length === 0 && (
              <EmptyHint icon={Stethoscope} text="Sin diagnósticos registrados." />
            )}
            {form.diagnoses.map((diagnosis, index) => (
              <div
                key={diagnosis.key}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Stethoscope className="size-4" />
                    </span>
                    Diagnóstico {index + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={diagnosis.isPrimary}
                        onChange={(event) =>
                          update(
                            "diagnoses",
                            form.diagnoses.map((d) =>
                              d.key === diagnosis.key
                                ? { ...d, isPrimary: event.target.checked }
                                : d,
                            ),
                          )
                        }
                      />
                      Principal
                    </label>
                    <RemoveButton
                      label="Eliminar diagnóstico"
                      onClick={() =>
                        update(
                          "diagnoses",
                          removeByKey(form.diagnoses, diagnosis.key),
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label="Código ICD-10" required>
                    <Input
                      value={diagnosis.icd10Code}
                      onChange={(event) =>
                        update(
                          "diagnoses",
                          form.diagnoses.map((d) =>
                            d.key === diagnosis.key
                              ? { ...d, icd10Code: event.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder="Ej. E11.9"
                    />
                  </Field>
                  <Field label="Descripción" className="sm:col-span-2">
                    <Input
                      value={diagnosis.description}
                      onChange={(event) =>
                        update(
                          "diagnoses",
                          form.diagnoses.map((d) =>
                            d.key === diagnosis.key
                              ? { ...d, description: event.target.value }
                              : d,
                          ),
                        )
                      }
                      placeholder="Descripción del diagnóstico"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update("diagnoses", [
                  ...form.diagnoses,
                  {
                    key: nextRowKey(),
                    icd10Code: "",
                    description: "",
                    isPrimary: false,
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Agregar diagnóstico
            </Button>
          </FormSection>

          {/* ── Medicamentos ── */}
          <FormSection legend="Medicamentos" icon={Pill} layout="stack">
            {form.medications.length === 0 && (
              <EmptyHint icon={Pill} text="Sin medicamentos registrados." />
            )}
            {form.medications.map((medication, index) => (
              <div
                key={medication.key}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Pill className="size-4" />
                    </span>
                    Medicamento {index + 1}
                  </span>
                  <RemoveButton
                    label="Eliminar medicamento"
                    onClick={() =>
                      update(
                        "medications",
                        removeByKey(form.medications, medication.key),
                      )
                    }
                  />
                </div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Nombre" required className="lg:col-span-2">
                    <Input
                      value={medication.name}
                      onChange={(event) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? { ...m, name: event.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder="Nombre del medicamento"
                    />
                  </Field>
                  <Field label="Clase">
                    <Input
                      value={medication.drugClass}
                      onChange={(event) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? { ...m, drugClass: event.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder="Clase"
                    />
                  </Field>
                  <Field label="Frecuencia">
                    <Input
                      value={medication.frequency}
                      onChange={(event) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? { ...m, frequency: event.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder="Ej. 1 vez al día"
                    />
                  </Field>
                  <Field label="NDC">
                    <Input
                      value={medication.ndc}
                      onChange={(event) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? { ...m, ndc: event.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder="NDC"
                    />
                  </Field>
                  <Field label="RxNorm">
                    <Input
                      value={medication.rxNorm}
                      onChange={(event) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? { ...m, rxNorm: event.target.value }
                              : m,
                          ),
                        )
                      }
                      placeholder="RxNorm"
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update("medications", [
                  ...form.medications,
                  {
                    key: nextRowKey(),
                    name: "",
                    ndc: "",
                    rxNorm: "",
                    drugClass: "",
                    frequency: "",
                  },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Agregar medicamento
            </Button>
          </FormSection>

          {/* ── Alergias ── */}
          <FormSection legend="Alergias" icon={ShieldAlert} layout="stack">
            {form.allergies.length === 0 && (
              <EmptyHint icon={AlertTriangle} text="Sin alergias registradas." />
            )}
            {form.allergies.map((allergy, index) => (
              <div
                key={allergy.key}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <AlertTriangle className="size-4" />
                    </span>
                    Alergia {index + 1}
                  </span>
                  <RemoveButton
                    label="Eliminar alergia"
                    onClick={() =>
                      update(
                        "allergies",
                        removeByKey(form.allergies, allergy.key),
                      )
                    }
                  />
                </div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label="Alérgeno" required>
                    <Input
                      value={allergy.allergen}
                      onChange={(event) =>
                        update(
                          "allergies",
                          form.allergies.map((a) =>
                            a.key === allergy.key
                              ? { ...a, allergen: event.target.value }
                              : a,
                          ),
                        )
                      }
                      placeholder="Ej. Penicilina"
                    />
                  </Field>
                  <Field label="Notas" className="sm:col-span-2">
                    <Input
                      value={allergy.notes}
                      onChange={(event) =>
                        update(
                          "allergies",
                          form.allergies.map((a) =>
                            a.key === allergy.key
                              ? { ...a, notes: event.target.value }
                              : a,
                          ),
                        )
                      }
                      placeholder="Reacción, severidad, etc."
                    />
                  </Field>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update("allergies", [
                  ...form.allergies,
                  { key: nextRowKey(), allergen: "", notes: "" },
                ])
              }
            >
              <Plus data-icon="inline-start" />
              Agregar alergia
            </Button>
          </FormSection>

          {/* ── Signos vitales ── */}
          <FormSection
            legend="Signos vitales"
            icon={Activity}
            layout="stack"
            description={
              isEdit
                ? "La medición más reciente es editable; el historial se conserva."
                : "Primera medición registrada (unidades SI: cm, kg, °C)."
            }
          >
            <div className="flex flex-col gap-4">
              {form.vitals.map((vital, index) =>
                vital.editable ? (
                  <div
                    key={vital.key}
                    className="rounded-xl border border-border bg-muted/30 p-4"
                  >
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <Activity className="size-4" />
                      </span>
                      Medición actual
                    </div>
                    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Fecha">
                        <Input
                          type="date"
                          value={vital.measuredAt}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, measuredAt: event.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="P. sistólica">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={vital.systolic}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, systolic: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="mmHg"
                        />
                      </Field>
                      <Field label="P. diastólica">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={vital.diastolic}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, diastolic: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="mmHg"
                        />
                      </Field>
                      <Field label="Frecuencia cardíaca">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={vital.heartRate}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, heartRate: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="lpm"
                        />
                      </Field>
                      <Field label="Temperatura (°C)">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={vital.temperatureC}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, temperatureC: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="°C"
                        />
                      </Field>
                      <Field label="Saturación O₂ (%)">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={vital.o2Saturation}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, o2Saturation: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="%"
                        />
                      </Field>
                      <Field label="Altura (cm)">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={vital.heightCm}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, heightCm: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="cm"
                        />
                      </Field>
                      <Field label="Peso (kg)">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={vital.weightKg}
                          onChange={(event) =>
                            update(
                              "vitals",
                              form.vitals.map((v) =>
                                v.key === vital.key
                                  ? { ...v, weightKg: event.target.value }
                                  : v,
                              ),
                            )
                          }
                          placeholder="kg"
                        />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <div
                    key={vital.key}
                    className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2 font-medium text-muted-foreground">
                      <Activity className="size-4" />
                      {vital.measuredAt || "Fecha desconocida"}
                    </span>
                    <span>
                      TA {vital.systolic || "—"}/{vital.diastolic || "—"} mmHg
                    </span>
                    <span>FC {vital.heartRate || "—"} lpm</span>
                    <span>Temp {vital.temperatureC || "—"} °C</span>
                    <span>SpO₂ {vital.o2Saturation || "—"}%</span>
                    <span>
                      {vital.heightCm || "—"} cm · {vital.weightKg || "—"} kg
                    </span>
                    {index > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Histórico
                      </span>
                    )}
                  </div>
                ),
              )}
              {form.vitals.length > 0 &&
                !form.vitals[form.vitals.length - 1].editable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update("vitals", [
                        ...form.vitals,
                        emptyVitalRow(),
                      ])
                    }
                  >
                    <Plus data-icon="inline-start" />
                    Registrar nueva medición
                  </Button>
                )}
            </div>
          </FormSection>

          {/* ── Observaciones y estado ── */}
          <FormSection legend="Observaciones y estado" icon={ClipboardPen}>
            <Field label="Observaciones" icon={NotebookPen} className="sm:col-span-2">
              <textarea
                className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Alergias, antecedentes o notas relevantes"
              />
            </Field>
            <Field label="Estado" icon={CircleDot}>
              <Select
                value={form.status}
                onChange={(value) =>
                  update("status", value as PatientStatus)
                }
              >
                <option>Activo</option>
                <option>Pendiente</option>
                <option>Inactivo</option>
              </Select>
            </Field>
          </FormSection>

          {/* ── Barra de acciones ── */}
          <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-md backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/patients")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Save data-icon="inline-start" />
              )}
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear paciente"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
/*  Helper components                                                         */
/* ════════════════════════════════════════════════════════════════════════════ */

function FormSection({
  icon: Icon,
  legend,
  description,
  layout = "grid",
  children,
}: {
  icon: LucideIcon;
  legend: string;
  description?: string;
  layout?: "grid" | "stack";
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        icon={Icon}
        title={legend}
        description={description}
        variant="primary"
        className="rounded-none"
      />
      <div
        className={cn(
          "p-5 sm:p-6",
          layout === "grid"
            ? "grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  className,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label>
        {Icon && <Icon className="size-4 text-primary/70" aria-hidden="true" />}
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-destructive"
      aria-label={label}
      onClick={onClick}
    >
      <Trash2 />
    </Button>
  );
}

function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0 text-primary/50" aria-hidden="true" />
      {text}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }).map((_, section) => (
        <div
          key={section}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
        >
          <Skeleton className="h-10 w-60 rounded-xl" />
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, field) => (
              <Skeleton key={field} className="h-9 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
