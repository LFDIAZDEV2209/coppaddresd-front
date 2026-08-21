export type PatientStatus = "Activo" | "Inactivo" | "Pendiente";
export type Gender = "Femenino" | "Masculino" | "No binario";

/** Fila del listado de pacientes (sin el agregado completo). */
export interface PatientListItem {
  id: string;
  medicalRecordNumber: string | null;
  firstName: string;
  lastName: string;
  documentTypeName: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  clinicId: string | null;
  clinicName: string | null;
  insurerName: string | null;
  status: PatientStatus;
  createdAt: string;
}

/** Diagnóstico de un paciente (agregado). */
export interface PatientDiagnosis {
  id: string;
  icd10CodeId: string;
  icd10Code: string;
  description: string | null;
  isPrimary: boolean;
}

/** Medicamento de un paciente (agregado). */
export interface PatientMedication {
  id: string;
  medicationId: string;
  name: string;
  ndc: string | null;
  rxNorm: string | null;
  drugClass: string | null;
  frequency: string | null;
}

/** Alergia de un paciente (agregado). */
export interface PatientAllergy {
  id: string;
  allergenId: string;
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
  documentTypeId: string | null;
  documentTypeName: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  ethnicityId: string | null;
  ethnicityName: string | null;
  bloodTypeId: string | null;
  bloodTypeName: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  cityId: string | null;
  cityName: string | null;
  stateId: string | null;
  stateCode: string | null;
  countryId: string | null;
  countryName: string | null;
  postalCode: string | null;
  emergencyContact: string | null;
  insurerId: string | null;
  insurerName: string | null;
  memberId: string | null;
  maritalStatus: string | null;
  smokingStatus: string | null;
  alcoholStatus: string | null;
  exerciseLevel: string | null;
  disability: string | null;
  hospitalizationHistory: string | null;
  surgeryHistory: string | null;
  status: PatientStatus;
  notes: string | null;
  clinicId: string | null;
  clinicName: string | null;
  locationId: string | null;
  locationName: string | null;
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
  documentTypeId: string | null;
  documentNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  ethnicityId: string | null;
  bloodTypeId: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  cityId: string | null;
  stateId: string | null;
  countryId: string | null;
  postalCode: string | null;
  emergencyContact: string | null;
  insurerId: string | null;
  memberId: string | null;
  maritalStatus: string | null;
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
  icd10CodeId: string;
  isPrimary: boolean;
}

export interface PatientMedicationInput {
  medicationId: string;
  frequency?: string | null;
}

export interface PatientAllergyInput {
  allergenId: string;
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

/** Asignación paciente ↔ profesional ("mis pacientes" / quién atiende al paciente). */
export interface PatientProfessionalAssignment {
  professionalId: string;
  fullName: string;
  professionalTypeName: string | null;
  relationshipType: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

/** Opción de un catálogo cerrado (grupo sanguíneo, tipo de documento, etnia). */
export interface CatalogOption {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

/** País del catálogo geográfico. */
export interface CountryOption {
  id: string;
  code: string;
  name: string;
  phoneCode: string;
  isActive: boolean;
  sortOrder: number;
}

/** Estado/provincia del catálogo geográfico. */
export interface StateOption {
  id: string;
  code: string;
  name: string;
}

/** Ciudad del catálogo geográfico. */
export interface CityOption {
  id: string;
  name: string;
}

/** Código postal del catálogo geográfico (US ZIP). */
export interface PostalCodeOption {
  id: string;
  zipCode: string;
}

/**
 * Código postal sugerido por el proveedor externo (autocompletado).
 * `cityId` es la ciudad del catálogo local cuando existe (permite
 * auto-seleccionar ciudad/estado en el formulario). `id` es sintético
 * (no viene en la respuesta del backend).
 */
export interface PostalCodeSearch {
  id?: string;
  zipCode: string;
  city: string;
  stateCode: string;
  countryCode: string;
  cityId: string | null;
}

/** Resultado de búsqueda en un catálogo clínico (ICD-10, medicamentos, alergenos). */
export interface CatalogSearchItem {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
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