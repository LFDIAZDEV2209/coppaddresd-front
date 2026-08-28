"use client";

import { useT } from "@/providers/i18n-provider";
import { useEffect, useMemo, useState } from "react";
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
import { CatalogCombobox } from "./catalog-combobox";
import { ApiError } from "@/lib/api/http";
import {
  fetchBloodTypes,
  fetchCountries,
  fetchDocumentTypes,
  fetchEthnicities,
  fetchStates,
  searchAllergens,
  searchCities,
  searchIcd10Codes,
  searchMedications,
  searchPostalCodes,
} from "../services/catalogs-service";
import {
  createPatient,
  fetchInsurers,
  getPatient,
  updatePatient,
} from "../services/patients-service";
import type {
  CatalogOption,
  CatalogSearchItem,
  CityOption,
  CountryOption,
  Insurer,
  Patient,
  PatientInput,
  PatientStatus,
  PostalCodeSearch,
  StateOption,
} from "../types";

/* ── Vocabulario cerrado (códigos estables en inglés, etiquetas en español) ── */

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SSN: "Tarjeta de Seguro Social",
  DRIVERS_LICENSE: "Licencia de conducir",
  STATE_ID: "Identificación estatal",
  US_PASSPORT: "Pasaporte de EE. UU.",
  FOREIGN_PASSPORT: "Pasaporte extranjero",
  GREEN_CARD: "Tarjeta de residencia (Green Card)",
  MILITARY_ID: "Identificación militar",
  TRIBAL_ID: "Identificación tribal",
  BIRTH_CERTIFICATE: "Acta de nacimiento",
  OTHER: "Otro",
};

const ETHNICITY_LABELS: Record<string, string> = {
  HISPANIC_OR_LATINO: "Hispano o latino",
  WHITE: "Blanco",
  BLACK_OR_AFRICAN_AMERICAN: "Negro o afroamericano",
  ASIAN: "Asiático",
  AMERICAN_INDIAN_OR_ALASKA_NATIVE: "Indígena americano o nativo de Alaska",
  NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER:
    "Nativo de Hawái o de las islas del Pacífico",
  MIDDLE_EASTERN_OR_NORTH_AFRICAN: "Medio Oriente o norte de África",
  MULTIRACIAL: "Multirracial",
  OTHER: "Otro",
};

const SMOKING_OPTIONS = [
  { value: "Never", label: "Nunca ha fumado" },
  { value: "Former", label: "Exfumador" },
  { value: "Current", label: "Fumador actual" },
];

const ALCOHOL_OPTIONS = [
  { value: "Heavy", label: "Consumo alto" },
  { value: "Moderate", label: "Consumo moderado" },
];

const EXERCISE_OPTIONS = [
  { value: "Sedentary", label: "Sedentario" },
  { value: "Light", label: "Ligero (1-2 días/semana)" },
  { value: "Moderate", label: "Moderado (3-4 días/semana)" },
  { value: "Active", label: "Activo (5+ días/semana)" },
];

const DISABILITY_OPTIONS = [
  { value: "Cognitive", label: "Cognitiva" },
  { value: "Hearing", label: "Auditiva" },
  { value: "Mobility", label: "De movilidad" },
  { value: "Multiple", label: "Múltiple" },
  { value: "Visual", label: "Visual" },
];

const HOSPITALIZATION_OPTIONS = [
  { value: "None", label: "Ninguna" },
  { value: "Once", label: "Una vez" },
  { value: "Multiple", label: "Múltiples" },
];

const SURGERY_OPTIONS = [
  { value: "None", label: "Ninguna" },
  { value: "Appendectomy", label: "Apendicectomía" },
  { value: "CABG", label: "Bypass coronario (CABG)" },
  { value: "Cardiac Catheterization", label: "Cateterismo cardíaco" },
  { value: "Cholecystectomy", label: "Colecistectomía" },
  { value: "C-Section", label: "Cesárea" },
  { value: "Hernia Repair", label: "Reparación de hernia" },
  { value: "Hip Replacement", label: "Prótesis de cadera" },
  { value: "Hysterectomy", label: "Histerectomía" },
  { value: "Knee Replacement", label: "Prótesis de rodilla" },
  { value: "Prostatectomy", label: "Prostatectomía" },
  { value: "Other", label: "Otra" },
];

const MARITAL_OPTIONS = [
  { value: "Single", label: "Soltero/a" },
  { value: "Married", label: "Casado/a" },
  { value: "Divorced", label: "Divorciado/a" },
  { value: "Widowed", label: "Viudo/a" },
  { value: "Separated", label: "Separado/a" },
  { value: "Domestic Partnership", label: "Unión de hecho" },
  { value: "Prefer Not to Say", label: "Prefiere no decirlo" },
];

interface Row {
  key: string;
}
interface DiagnosisRow extends Row {
  icd10CodeId: string;
  icd10Code: string;
  icd10Description: string;
  isPrimary: boolean;
}
interface MedicationRow extends Row {
  medicationId: string;
  name: string;
  frequency: string;
}
interface AllergyRow extends Row {
  allergenId: string;
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
  documentTypeId: string;
  documentNumber: string;
  dateOfBirth: string;
  gender: string;
  ethnicityId: string;
  bloodTypeId: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  address: string;
  countryId: string;
  stateId: string;
  cityId: string;
  cityName: string;
  postalCode: string;
  emergencyContact: string;
  insurerId: string;
  memberId: string;
  maritalStatus: string;
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

/* ── Validación preventiva de signos vitales (espejo de las reglas del
     backend en CreatePatientCommandValidator) ── */

const VITAL_RULES: Array<{
  field: Exclude<keyof VitalRow, "key" | "measuredAt" | "editable">;
  min: number;
  max: number;
  label: string;
}> = [
  { field: "systolic", min: 30, max: 300, label: "P. sistólica" },
  { field: "diastolic", min: 20, max: 200, label: "P. diastólica" },
  { field: "heartRate", min: 20, max: 300, label: "Frecuencia cardíaca" },
  { field: "temperatureC", min: 30, max: 45, label: "Temperatura" },
  { field: "o2Saturation", min: 50, max: 100, label: "Saturación O₂" },
  { field: "heightCm", min: 30, max: 250, label: "Altura" },
  { field: "weightKg", min: 1, max: 500, label: "Peso" },
];

/** Valida las filas de vitales que se van a enviar (con algún valor). */
function validateVitals(vitals: VitalRow[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const vital of vitals) {
    const hasValue =
      vital.measuredAt ||
      vital.systolic ||
      vital.diastolic ||
      vital.heartRate ||
      vital.temperatureC ||
      vital.o2Saturation ||
      vital.heightCm ||
      vital.weightKg;
    if (!hasValue) continue;

    for (const rule of VITAL_RULES) {
      const raw = vital[rule.field];
      if (!raw.trim()) continue;
      const value = toNumberOrNull(raw);
      if (value === null || value < rule.min || value > rule.max) {
        errors[`vitals.${rule.field}`] = [
          `${rule.label} debe estar entre ${rule.min} y ${rule.max}.`,
        ];
      }
    }
  }
  return errors;
}

/** Mapea los nombres de propiedades del backend (RFC 7807) a rutas locales. */
const SERVER_FIELD_MAP: Record<string, string> = {
  FirstName: "firstName",
  MiddleName: "middleName",
  LastName: "lastName",
  DocumentNumber: "documentNumber",
  DateOfBirth: "dateOfBirth",
  Gender: "gender",
  PhoneCountryCode: "phoneCountryCode",
  PhoneNumber: "phoneNumber",
  Email: "email",
  Address: "address",
  PostalCode: "postalCode",
  EmergencyContact: "emergencyContact",
  MemberId: "memberId",
  MaritalStatus: "maritalStatus",
  SmokingStatus: "smokingStatus",
  AlcoholStatus: "alcoholStatus",
  ExerciseLevel: "exerciseLevel",
  Disability: "disability",
  HospitalizationHistory: "hospitalizationHistory",
  SurgeryHistory: "surgeryHistory",
  Notes: "notes",
  Status: "status",
  MedicalRecordNumber: "medicalRecordNumber",
};

function mapServerFieldErrors(
  serverErrors: Record<string, string[]>,
): Record<string, string[]> {
  const mapped: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(serverErrors)) {
    const vital = key.match(/^VitalSigns\[(\d+)\]\.(\w+)$/);
    if (vital) {
      const field = vital[2].charAt(0).toLowerCase() + vital[2].slice(1);
      mapped[`vitals.${field}`] = messages;
      continue;
    }
    const diagnosis = key.match(/^Diagnoses\[(\d+)\]\.(\w+)$/);
    if (diagnosis) {
      mapped[`diagnoses.${diagnosis[1]}.${diagnosis[2]}`] = messages;
      continue;
    }
    const medication = key.match(/^Medications\[(\d+)\]\.(\w+)$/);
    if (medication) {
      mapped[`medications.${medication[1]}.${medication[2]}`] = messages;
      continue;
    }
    const allergy = key.match(/^Allergies\[(\d+)\]\.(\w+)$/);
    if (allergy) {
      mapped[`allergies.${allergy[1]}.${allergy[2]}`] = messages;
      continue;
    }
    mapped[SERVER_FIELD_MAP[key] ?? key] = messages;
  }
  return mapped;
}

function emptyVitalRow(
  measuredAt = new Date().toISOString().slice(0, 10),
): VitalRow {
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
    documentTypeId: "",
    documentNumber: "",
    dateOfBirth: "",
    gender: "Femenino",
    ethnicityId: "",
    bloodTypeId: "",
    phoneCountryCode: "",
    phoneNumber: "",
    email: "",
    address: "",
    countryId: "",
    stateId: "",
    cityId: "",
    cityName: "",
    postalCode: "",
    emergencyContact: "",
    insurerId: "",
    memberId: "",
    maritalStatus: "",
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
    documentTypeId: patient.documentTypeId ?? "",
    documentNumber: patient.documentNumber ?? "",
    dateOfBirth: toDateInput(patient.dateOfBirth),
    gender: patient.gender ?? "Femenino",
    ethnicityId: patient.ethnicityId ?? "",
    bloodTypeId: patient.bloodTypeId ?? "",
    phoneCountryCode: patient.phoneCountryCode ?? "",
    phoneNumber: patient.phoneNumber ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    countryId: patient.countryId ?? "",
    stateId: patient.stateId ?? "",
    cityId: patient.cityId ?? "",
    cityName: patient.cityName ?? "",
    postalCode: patient.postalCode ?? "",
    emergencyContact: patient.emergencyContact ?? "",
    insurerId: patient.insurerId ?? "",
    memberId: patient.memberId ?? "",
    maritalStatus: patient.maritalStatus ?? "",
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
      icd10CodeId: d.icd10CodeId,
      icd10Code: d.icd10Code,
      icd10Description: d.description ?? "",
      isPrimary: d.isPrimary,
    })),
    medications: patient.medications.map((m) => ({
      key: m.id,
      medicationId: m.medicationId,
      name: m.name,
      frequency: m.frequency ?? "",
    })),
    allergies: patient.allergies.map((a) => ({
      key: a.id,
      allergenId: a.allergenId,
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
    documentTypeId: form.documentTypeId || null,
    documentNumber: text(form.documentNumber),
    dateOfBirth: form.dateOfBirth || null,
    gender: text(form.gender),
    ethnicityId: form.ethnicityId || null,
    bloodTypeId: form.bloodTypeId || null,
    phoneCountryCode: text(form.phoneCountryCode),
    phoneNumber: text(form.phoneNumber),
    email: text(form.email),
    address: text(form.address),
    countryId: form.countryId || null,
    stateId: form.stateId || null,
    cityId: form.cityId || null,
    postalCode: text(form.postalCode),
    emergencyContact: text(form.emergencyContact),
    insurerId: form.insurerId || null,
    memberId: text(form.memberId),
    maritalStatus: text(form.maritalStatus),
    smokingStatus: text(form.smokingStatus),
    alcoholStatus: text(form.alcoholStatus),
    exerciseLevel: text(form.exerciseLevel),
    disability: text(form.disability),
    hospitalizationHistory: text(form.hospitalizationHistory),
    surgeryHistory: text(form.surgeryHistory),
    status: form.status,
    notes: text(form.notes),
    diagnoses: form.diagnoses
      .filter((d) => d.icd10CodeId)
      .map((d) => ({ icd10CodeId: d.icd10CodeId, isPrimary: d.isPrimary })),
    medications: form.medications
      .filter((m) => m.medicationId)
      .map((m) => ({
        medicationId: m.medicationId,
        frequency: text(m.frequency),
      })),
    allergies: form.allergies
      .filter((a) => a.allergenId)
      .map((a) => ({ allergenId: a.allergenId, notes: text(a.notes) })),
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

/* ── Utilidades de etiquetas de catálogo ── */

function documentTypeLabel(option: CatalogOption): string {
  return DOCUMENT_TYPE_LABELS[option.code] ?? option.name;
}

function ethnicityLabel(option: CatalogOption): string {
  return ETHNICITY_LABELS[option.code] ?? option.name;
}

function icd10Label(item: CatalogSearchItem): string {
  return `${item.code ?? ""} · ${item.name ?? ""}`;
}

export function PatientFormPage({ patientId }: { patientId?: string }) {
  const t = useT();
  const isEdit = Boolean(patientId);
  const router = useRouter();
  const [form, setForm] = useState<PatientFormState>(createEmptyForm);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [bloodTypes, setBloodTypes] = useState<CatalogOption[]>([]);
  const [documentTypes, setDocumentTypes] = useState<CatalogOption[]>([]);
  const [ethnicities, setEthnicities] = useState<CatalogOption[]>([]);
  const [cityZips, setCityZips] = useState<PostalCodeSearch[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [notFound, setNotFound] = useState(false);

  /** Primer mensaje de error de un campo local (p. ej. "vitals.diastolic"). */
  const fieldError = (path: string): string | undefined =>
    fieldErrors[path]?.[0];

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchInsurers(),
      fetchCountries(),
      fetchBloodTypes(),
      fetchDocumentTypes(),
      fetchEthnicities(),
    ])
      .then(([insurerItems, countryItems, bloodItems, docItems, ethItems]) => {
        if (cancelled) return;
        setInsurers(insurerItems);
        setCountries(countryItems);
        setBloodTypes(bloodItems);
        setDocumentTypes(docItems);
        setEthnicities(ethItems);
        setForm((current) => {
          if (current.countryId) return current;
          const us = countryItems.find((c) => c.code === "US");
          return {
            ...current,
            countryId: us?.id ?? "",
            phoneCountryCode: us?.phoneCode ?? "1",
          };
        });
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
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

  useEffect(() => {
    if (!form.countryId) return;
    let cancelled = false;
    void fetchStates(form.countryId)
      .then((items) => {
        if (!cancelled) setStates(items);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.countryId]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === form.countryId) ?? null,
    [countries, form.countryId],
  );
  const selectedState = useMemo(
    () => states.find((s) => s.id === form.stateId) ?? null,
    [states, form.stateId],
  );
  const selectedCity = useMemo(
    () =>
      form.cityId
        ? ({ id: form.cityId, name: form.cityName } as CityOption)
        : null,
    [form.cityId, form.cityName],
  );

  // ZIPs de la ciudad seleccionada (fuente: proveedor externo con fallback):
  // si la ciudad tiene un único código postal se auto-completa.
  useEffect(() => {
    if (!form.cityId || !selectedCountry || !selectedState) return;
    let cancelled = false;
    void searchPostalCodes({
      countryCode: selectedCountry.code,
      stateCode: selectedState.code,
      city: form.cityName,
    })
      .then((zips) => {
        if (cancelled) return;
        setCityZips(zips);
        setForm((current) => {
          if (current.postalCode.trim() || zips.length !== 1) return current;
          return { ...current, postalCode: zips[0].zipCode };
        });
      })
      .catch(() => {
        if (!cancelled) setCityZips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.cityId, form.cityName, selectedCountry, selectedState]);

  /** Búsqueda del combobox de ZIP: por ciudad+prefijo o por código completo. */
  const fetchZipSuggestions = async (
    query: string,
    signal: AbortSignal,
  ): Promise<PostalCodeSearch[]> => {
    const digits = query.trim().replace(/[\s-]/g, "");
    if (!digits) return [];
    const withId = (results: PostalCodeSearch[]): PostalCodeSearch[] =>
      results.map((r) => ({
        ...r,
        id: `${r.countryCode}:${r.stateCode}:${r.city}:${r.zipCode}`,
      }));
    if (selectedCity && selectedState && selectedCountry) {
      return withId(
        await searchPostalCodes(
          {
            countryCode: selectedCountry.code,
            stateCode: selectedState.code,
            city: form.cityName,
            zip: digits,
          },
          signal,
        ),
      );
    }
    if (digits.length >= 5) {
      return withId(
        await searchPostalCodes(
          { countryCode: selectedCountry?.code ?? "US", zip: digits },
          signal,
        ),
      );
    }
    return [];
  };

  const zipValue = useMemo(
    () =>
      form.postalCode
        ? ({
            id: `${selectedCountry?.code ?? "US"}:${selectedState?.code ?? ""}:${form.cityName}:${form.postalCode}`,
            zipCode: form.postalCode,
            city: form.cityName,
            stateCode: selectedState?.code ?? "",
            countryCode: selectedCountry?.code ?? "",
            cityId: form.cityId || null,
          } as PostalCodeSearch)
        : null,
    [
      form.postalCode,
      form.cityName,
      form.cityId,
      selectedState,
      selectedCountry,
    ],
  );

  const update = <K extends keyof PatientFormState>(
    field: K,
    value: PatientFormState[K],
  ) => {
    // Al editar un campo se descartan sus errores de servidor pendientes.
    setFieldErrors((current) => {
      if (Object.keys(current).length === 0) return current;
      const next: Record<string, string[]> = {};
      for (const [key, messages] of Object.entries(current)) {
        if (key.split(".")[0] !== field) next[key] = messages;
      }
      return next;
    });
    setForm((current) => ({ ...current, [field]: value }));
  };

  const removeByKey = <T extends Row>(list: T[], key: string): T[] =>
    list.filter((row) => row.key !== key);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validación preventiva (espejo de las reglas del backend): se evita
    // enviar el request cuando el formulario ya es inválido.
    const clientErrors: Record<string, string[]> = {};
    if (!form.firstName.trim()) {
      clientErrors.firstName = ["El nombre es requerido."];
    }
    if (!form.lastName.trim()) {
      clientErrors.lastName = ["Los apellidos son requeridos."];
    }
    Object.assign(clientErrors, validateVitals(form.vitals));

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      if (patientId) await updatePatient(patientId, toInput(form));
      else await createPatient(toInput(form));
      router.push("/patients");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.code === "validation" && cause.errors) {
          // 400/422 con errores por campo: se muestran bajo cada campo.
          setFieldErrors(mapServerFieldErrors(cause.errors));
          return;
        }
        setError(cause.message);
        return;
      }
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
            <Field label={t("Número de historia clínica")} icon={FileText}>
              <Input
                value={form.medicalRecordNumber}
                onChange={(event) =>
                  update("medicalRecordNumber", event.target.value)
                }
                placeholder={t("MRN-… (se genera solo si se deja vacío)")}
              />
            </Field>
            <Field
              label={t("Nombre")}
              required
              icon={User}
              error={fieldError("firstName")}
            >
              <Input
                value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)}
                placeholder={t("Primer nombre")}
              />
            </Field>
            <Field label={t("Segundo nombre")} icon={User}>
              <Input
                value={form.middleName}
                onChange={(event) => update("middleName", event.target.value)}
                placeholder={t("Segundo nombre")}
              />
            </Field>
            <Field
              label={t("Apellidos")}
              required
              icon={User}
              error={fieldError("lastName")}
            >
              <Input
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
                placeholder={t("Apellidos")}
              />
            </Field>
            <Field label={t("Tipo de documento")} icon={IdCard}>
              <CatalogCombobox<CatalogOption>
                value={
                  documentTypes.find((d) => d.id === form.documentTypeId) ??
                  null
                }
                onSelect={(option) =>
                  update("documentTypeId", option?.id ?? "")
                }
                items={documentTypes}
                getLabel={documentTypeLabel}
                placeholder={t("Seleccionar tipo de documento")}
                searchPlaceholder="Buscar tipo de documento…"
                emptyText="Sin tipos de documento."
                allowClear
              />
            </Field>
            <Field
              label={t("Número de documento")}
              icon={Fingerprint}
              error={fieldError("documentNumber")}
            >
              <Input
                value={form.documentNumber}
                onChange={(event) =>
                  update("documentNumber", event.target.value)
                }
                placeholder={t("Número de documento")}
              />
            </Field>
            <Field
              label={t("Fecha de nacimiento")}
              icon={CalendarDays}
              error={fieldError("dateOfBirth")}
            >
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => update("dateOfBirth", event.target.value)}
              />
            </Field>
            <Field label={t("Género")} icon={Users}>
              <Select
                value={form.gender}
                onChange={(value) => update("gender", value)}
              >
                <option>{t("Femenino")}</option>
                <option>{t("Masculino")}</option>
                <option>{t("No binario")}</option>
              </Select>
            </Field>
            <Field label={t("Etnia")} icon={Globe}>
              <CatalogCombobox<CatalogOption>
                value={
                  ethnicities.find((e) => e.id === form.ethnicityId) ?? null
                }
                onSelect={(option) => update("ethnicityId", option?.id ?? "")}
                items={ethnicities}
                getLabel={ethnicityLabel}
                placeholder={t("Seleccionar etnia")}
                searchPlaceholder="Buscar etnia…"
                emptyText="Sin etnias."
                allowClear
              />
            </Field>
            <Field label={t("Tipo de sangre")} icon={Droplets}>
              <CatalogCombobox<CatalogOption>
                value={
                  bloodTypes.find((b) => b.id === form.bloodTypeId) ?? null
                }
                onSelect={(option) => update("bloodTypeId", option?.id ?? "")}
                items={bloodTypes}
                getLabel={(option) => option.code}
                placeholder={t("Seleccionar grupo sanguíneo")}
                searchPlaceholder="Buscar grupo sanguíneo…"
                emptyText="Sin grupos sanguíneos."
                allowClear
              />
            </Field>
            <Field label={t("Estado civil")} icon={Users}>
              <Select
                value={form.maritalStatus}
                onChange={(value) => update("maritalStatus", value)}
                placeholder={t("Seleccionar…")}
              >
                {MARITAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Contacto de emergencia")} icon={Siren}>
              <Input
                value={form.emergencyContact}
                onChange={(event) =>
                  update("emergencyContact", event.target.value)
                }
                placeholder={t("Nombre de contacto de emergencia")}
              />
            </Field>
          </FormSection>

          {/* ── Contacto y ubicación ── */}
          <FormSection legend="Contacto y ubicación" icon={MapPin}>
            <Field label={t("País del teléfono")} icon={Globe}>
              <Select
                value={form.phoneCountryCode}
                onChange={(value) => update("phoneCountryCode", value)}
                placeholder={t("Seleccionar…")}
              >
                {countries.map((country) => (
                  <option key={country.id} value={country.phoneCode}>
                    +{country.phoneCode} · {country.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t("Teléfono")}
              icon={Phone}
              error={fieldError("phoneNumber")}
            >
              <Input
                type="tel"
                value={form.phoneNumber}
                onChange={(event) => update("phoneNumber", event.target.value)}
                placeholder={t("300 000 0000")}
              />
            </Field>
            <Field
              label={t("Correo electrónico")}
              icon={Mail}
              error={fieldError("email")}
            >
              <Input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder={t("correo@ejemplo.com")}
              />
            </Field>
            <Field label={t("Dirección")} icon={Home} className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                placeholder={t("Dirección de residencia")}
              />
            </Field>
            <Field label={t("País")} icon={MapPinned}>
              <CatalogCombobox<CountryOption>
                value={selectedCountry}
                onSelect={(country) => {
                  update("countryId", country?.id ?? "");
                  if (country?.id !== form.countryId) {
                    setStates([]);
                    setCityZips([]);
                    update("stateId", "");
                    update("cityId", "");
                    update("cityName", "");
                    update("postalCode", "");
                  }
                }}
                items={countries}
                getLabel={(country) => country.name}
                placeholder={t("Seleccionar país")}
                searchPlaceholder="Buscar país…"
                emptyText="Sin países."
              />
            </Field>
            <Field label={t("Estado / provincia")} icon={Map}>
              <CatalogCombobox<StateOption>
                value={selectedState}
                onSelect={(state) => {
                  update("stateId", state?.id ?? "");
                  if (state?.id !== form.stateId) {
                    setCityZips([]);
                    update("cityId", "");
                    update("cityName", "");
                    update("postalCode", "");
                  }
                }}
                items={states}
                getLabel={(state) => `${state.code} — ${state.name}`}
                placeholder={
                  form.countryId
                    ? "Seleccionar estado"
                    : "Elige primero el país"
                }
                searchPlaceholder="Buscar estado…"
                emptyText="Sin estados para este país."
                disabled={!form.countryId}
              />
            </Field>
            <Field label={t("Ciudad")} icon={Building2}>
              <CatalogCombobox<CityOption>
                value={selectedCity}
                onSelect={(city) => {
                  update("cityId", city?.id ?? "");
                  update("cityName", city?.name ?? "");
                  if (city?.id !== form.cityId) {
                    setCityZips([]);
                    update("postalCode", "");
                  }
                }}
                fetchItems={(query, signal) =>
                  form.stateId
                    ? searchCities(form.stateId, query, signal)
                    : Promise.resolve([])
                }
                getLabel={(city) => city.name}
                placeholder={
                  form.stateId ? "Buscar ciudad…" : "Elige primero el estado"
                }
                searchPlaceholder="Escribe para buscar la ciudad…"
                emptyText="Sin ciudades que coincidan."
                disabled={!form.stateId}
                allowClear
              />
            </Field>
            <Field
              label={t("Código postal (ZIP)")}
              icon={MapPinned}
              error={fieldError("postalCode")}
            >
              <CatalogCombobox<PostalCodeSearch>
                value={zipValue}
                fetchItems={fetchZipSuggestions}
                getLabel={(item) => item.zipCode}
                placeholder={
                  cityZips.length > 0
                    ? `Auto: ${cityZips.map((z) => z.zipCode).join(", ")}`
                    : "Busca o escribe el código postal…"
                }
                searchPlaceholder="Escribe el código postal…"
                emptyText="Sin códigos postales para esta búsqueda."
                disabled={!form.countryId}
                allowClear
                onSelect={(item) => {
                  if (!item) {
                    update("postalCode", "");
                    return;
                  }
                  // Al elegir una sugerencia se auto-completan ciudad/estado
                  // cuando el proveedor las resolvió (p. ej. búsqueda por ZIP).
                  setForm((current) => ({
                    ...current,
                    postalCode: item.zipCode,
                    stateId:
                      states.find((s) => s.code === item.stateCode)?.id ??
                      current.stateId,
                    cityId: item.cityId ?? current.cityId,
                    cityName: item.city || current.cityName,
                  }));
                }}
              />
            </Field>
          </FormSection>

          {/* ── Cobertura ── */}
          <FormSection legend="Cobertura" icon={ShieldCheck}>
            <Field label={t("Aseguradora")} icon={CreditCard}>
              <Select
                value={form.insurerId}
                onChange={(value) => update("insurerId", value)}
                placeholder={t("Sin aseguradora")}
              >
                {insurers.map((insurer) => (
                  <option key={insurer.id} value={insurer.id}>
                    {insurer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Número de afiliación (member ID)")} icon={BadgeCheck}>
              <Input
                value={form.memberId}
                onChange={(event) => update("memberId", event.target.value)}
                placeholder={t("Número de afiliado")}
              />
            </Field>
          </FormSection>

          {/* ── Estilo de vida y antecedentes ── */}
          <FormSection legend="Estilo de vida y antecedentes" icon={HeartPulse}>
            <Field label={t("Tabaquismo")} icon={Cigarette}>
              <Select
                value={form.smokingStatus}
                onChange={(value) => update("smokingStatus", value)}
                placeholder={t("Seleccionar…")}
              >
                {SMOKING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Consumo de alcohol")} icon={Wine}>
              <Select
                value={form.alcoholStatus}
                onChange={(value) => update("alcoholStatus", value)}
                placeholder={t("Seleccionar…")}
              >
                {ALCOHOL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Nivel de ejercicio")} icon={Dumbbell}>
              <Select
                value={form.exerciseLevel}
                onChange={(value) => update("exerciseLevel", value)}
                placeholder={t("Seleccionar…")}
              >
                {EXERCISE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Discapacidad")} icon={Accessibility}>
              <Select
                value={form.disability}
                onChange={(value) => update("disability", value)}
                placeholder={t("Ninguna")}
              >
                {DISABILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Historial de hospitalización")} icon={Hospital}>
              <Select
                value={form.hospitalizationHistory}
                onChange={(value) => update("hospitalizationHistory", value)}
                placeholder={t("Seleccionar…")}
              >
                {HOSPITALIZATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Historial de cirugías")} icon={Scissors}>
              <Select
                value={form.surgeryHistory}
                onChange={(value) => update("surgeryHistory", value)}
                placeholder={t("Seleccionar…")}
              >
                {SURGERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>

          {/* ── Diagnósticos ── */}
          <FormSection legend="Diagnósticos" icon={Stethoscope} layout="stack">
            {form.diagnoses.length === 0 && (
              <EmptyHint
                icon={Stethoscope}
                text="Sin diagnósticos registrados."
              />
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
                                ? {
                                    ...d,
                                    isPrimary: event.target.checked,
                                  }
                                : event.target.checked
                                  ? { ...d, isPrimary: false }
                                  : d,
                            ),
                          )
                        }
                      />
                      Principal
                    </label>
                    <RemoveButton
                      label={t("Eliminar diagnóstico")}
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
                  <Field
                    label={t("Código ICD-10")}
                    required
                    className="sm:col-span-2"
                    error={fieldError(`diagnoses.${index}.Icd10CodeId`)}
                  >
                    <CatalogCombobox<CatalogSearchItem>
                      value={
                        diagnosis.icd10CodeId
                          ? ({
                              id: diagnosis.icd10CodeId,
                              code: diagnosis.icd10Code,
                              name:
                                diagnosis.icd10Description ||
                                diagnosis.icd10Code,
                              description: null,
                            } as CatalogSearchItem)
                          : null
                      }
                      onSelect={(item) =>
                        update(
                          "diagnoses",
                          form.diagnoses.map((d) =>
                            d.key === diagnosis.key
                              ? {
                                  ...d,
                                  icd10CodeId: item?.id ?? "",
                                  icd10Code: item?.code ?? "",
                                  icd10Description: item?.name ?? "",
                                }
                              : d,
                          ),
                        )
                      }
                      fetchItems={searchIcd10Codes}
                      getLabel={icd10Label}
                      placeholder={t("Buscar por código o descripción…")}
                      searchPlaceholder="Ej. E11.9, hipertensión…"
                      emptyText="Sin coincidencias en ICD-10."
                      allowClear
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
                    icd10CodeId: "",
                    icd10Code: "",
                    icd10Description: "",
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
                    label={t("Eliminar medicamento")}
                    onClick={() =>
                      update(
                        "medications",
                        removeByKey(form.medications, medication.key),
                      )
                    }
                  />
                </div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label={t("Medicamento")} required>
                    <CatalogCombobox<CatalogSearchItem>
                      value={
                        medication.medicationId
                          ? ({
                              id: medication.medicationId,
                              code: null,
                              name: medication.name,
                              description: null,
                            } as CatalogSearchItem)
                          : null
                      }
                      onSelect={(item) =>
                        update(
                          "medications",
                          form.medications.map((m) =>
                            m.key === medication.key
                              ? {
                                  ...m,
                                  medicationId: item?.id ?? "",
                                  name: item?.name ?? "",
                                }
                              : m,
                          ),
                        )
                      }
                      fetchItems={searchMedications}
                      getLabel={(item) => item.name}
                      placeholder={t("Buscar medicamento…")}
                      searchPlaceholder="Ej. Amoxicilina, metformina…"
                      emptyText="Sin medicamentos que coincidan."
                      allowClear
                    />
                  </Field>
                  <Field label={t("Frecuencia")}>
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
                      placeholder={t("Ej. 1 vez al día")}
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
                    medicationId: "",
                    name: "",
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
              <EmptyHint
                icon={AlertTriangle}
                text="Sin alergias registradas."
              />
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
                    label={t("Eliminar alergia")}
                    onClick={() =>
                      update(
                        "allergies",
                        removeByKey(form.allergies, allergy.key),
                      )
                    }
                  />
                </div>
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Field label={t("Alérgeno")} required>
                    <CatalogCombobox<CatalogSearchItem>
                      value={
                        allergy.allergenId
                          ? ({
                              id: allergy.allergenId,
                              code: null,
                              name: allergy.allergen,
                              description: null,
                            } as CatalogSearchItem)
                          : null
                      }
                      onSelect={(item) =>
                        update(
                          "allergies",
                          form.allergies.map((a) =>
                            a.key === allergy.key
                              ? {
                                  ...a,
                                  allergenId: item?.id ?? "",
                                  allergen: item?.name ?? "",
                                }
                              : a,
                          ),
                        )
                      }
                      fetchItems={searchAllergens}
                      getLabel={(item) => item.name}
                      placeholder={t("Buscar alérgeno…")}
                      searchPlaceholder="Ej. Penicilina, polen…"
                      emptyText="Sin alérgenos que coincidan."
                      allowClear
                    />
                  </Field>
                  <Field label={t("Notas")}>
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
                      placeholder={t("Reacción, severidad, etc.")}
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
                  {
                    key: nextRowKey(),
                    allergenId: "",
                    allergen: "",
                    notes: "",
                  },
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
                      <Field label={t("Fecha")}>
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
                      <Field
                        label={t("P. sistólica")}
                        error={fieldError("vitals.systolic")}
                      >
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
                          placeholder={t("mmHg")}
                        />
                      </Field>
                      <Field
                        label={t("P. diastólica")}
                        error={fieldError("vitals.diastolic")}
                      >
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
                          placeholder={t("mmHg")}
                        />
                      </Field>
                      <Field
                        label={t("Frecuencia cardíaca")}
                        error={fieldError("vitals.heartRate")}
                      >
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
                          placeholder={t("lpm")}
                        />
                      </Field>
                      <Field
                        label={t("Temperatura (°C)")}
                        error={fieldError("vitals.temperatureC")}
                      >
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
                          placeholder={t("°C")}
                        />
                      </Field>
                      <Field
                        label={t("Saturación O₂ (%)")}
                        error={fieldError("vitals.o2Saturation")}
                      >
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
                          placeholder={t("%")}
                        />
                      </Field>
                      <Field
                        label={t("Altura (cm)")}
                        error={fieldError("vitals.heightCm")}
                      >
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
                          placeholder={t("cm")}
                        />
                      </Field>
                      <Field
                        label={t("Peso (kg)")}
                        error={fieldError("vitals.weightKg")}
                      >
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
                          placeholder={t("kg")}
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
                      update("vitals", [...form.vitals, emptyVitalRow()])
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
            <Field
              label={t("Observaciones")}
              icon={NotebookPen}
              className="sm:col-span-2"
            >
              <textarea
                className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder={t("Alergias, antecedentes o notas relevantes")}
              />
            </Field>
            <Field label={t("Estado")} icon={CircleDot}>
              <Select
                value={form.status}
                onChange={(value) => update("status", value as PatientStatus)}
              >
                <option>{t("Activo")}</option>
                <option>{t("Pendiente")}</option>
                <option>{t("Inactivo")}</option>
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
  error,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  icon?: LucideIcon;
  /** Mensaje de error de validación (backend o preventivo) del campo. */
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = error
    ? `field-error-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : undefined;
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
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
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

function EmptyHint({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
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
