export type PatientStatus = "Activo" | "Inactivo" | "Pendiente";
export type Gender = "Femenino" | "Masculino" | "No binario";
export type DocumentType = "CC" | "CE" | "Pasaporte";

/** Fila del listado de pacientes (sin el agregado completo). */
export interface PatientListItem {
  id: string;
  medicalRecordNumber: string | null;
  firstName: string;
  lastName: string;
  documentType: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  insurerName: string | null;
  status: PatientStatus;
  createdAt: string;
}

/** Diagnóstico de un paciente (agregado). */
export interface PatientDiagnosis {
  id: string;
  icd10Code: string;
  description: string | null;
  isPrimary: boolean;
}

/** Medicamento de un paciente (agregado). */
export interface PatientMedication {
  id: string;
  name: string;
  ndc: string | null;
  rxNorm: string | null;
  drugClass: string | null;
  frequency: string | null;
}

/** Alergia de un paciente (agregado). */
export interface PatientAllergy {
  id: string;
  allergen: string;
  notes: string | null;
}

/** Medición de signos vitales (unidades SI: cm, kg, °C). */
export interface PatientVitalSign {
  id: string;
  measuredAt: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperatureC: number | null;
  o2Saturation: number | null;
  heightCm: number | null;
  weightKg: number | null;
}

/** Representación completa de un paciente (agregado). */
export interface Patient {
  id: string;
  medicalRecordNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  documentType: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  ethnicity: string | null;
  bloodType: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  emergencyContact: string | null;
  insurerId: string | null;
  insurerName: string | null;
  memberId: string | null;
  smokingStatus: string | null;
  alcoholStatus: string | null;
  exerciseLevel: string | null;
  disability: string | null;
  hospitalizationHistory: string | null;
  surgeryHistory: string | null;
  status: PatientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  diagnoses: PatientDiagnosis[];
  medications: PatientMedication[];
  allergies: PatientAllergy[];
  vitalSigns: PatientVitalSign[];
}

/** Payload de creación/actualización de paciente (agregado completo). */
export interface PatientInput {
  medicalRecordNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  documentType: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  ethnicity: string | null;
  bloodType: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  emergencyContact: string | null;
  insurerId: string | null;
  memberId: string | null;
  smokingStatus: string | null;
  alcoholStatus: string | null;
  exerciseLevel: string | null;
  disability: string | null;
  hospitalizationHistory: string | null;
  surgeryHistory: string | null;
  status: PatientStatus;
  notes: string | null;
  diagnoses: PatientDiagnosisInput[];
  medications: PatientMedicationInput[];
  allergies: PatientAllergyInput[];
  vitalSigns: PatientVitalSignInput[];
}

export interface PatientDiagnosisInput {
  icd10Code: string;
  description?: string | null;
  isPrimary: boolean;
}

export interface PatientMedicationInput {
  name: string;
  ndc?: string | null;
  rxNorm?: string | null;
  drugClass?: string | null;
  frequency?: string | null;
}

export interface PatientAllergyInput {
  allergen: string;
  notes?: string | null;
}

export interface PatientVitalSignInput {
  measuredAt: string | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperatureC: number | null;
  o2Saturation: number | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface PatientFilters {
  search: string;
  status: PatientStatus | "all";
  insurerId: string | "all";
}

/** Aseguradora del catálogo (app.insurers). */
export interface Insurer {
  id: string;
  name: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AppointmentInput {
  patientId: string;
  specialty: string;
  professional: string;
  date: string;
  time: string;
  consultationType: string;
  reason: string;
  notes: string;
}

export interface Appointment extends AppointmentInput {
  id: string;
  patientName: string;
  status: "Confirmada" | "Pendiente";
}

export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  route: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  issuedAt: string;
  professional: string;
  medications: Medication[];
  generalInstructions: string;
}