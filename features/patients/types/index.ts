export type PatientStatus = "Activo" | "Inactivo" | "Pendiente";
export type Gender = "Femenino" | "Masculino" | "No binario";
export type DocumentType = "CC" | "CE" | "Pasaporte";

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  insurer: string;
  status: PatientStatus;
  lastAppointment: string | null;
  registeredAt: string;
  notes: string;
}

export interface PatientInput extends Omit<Patient, "id" | "registeredAt" | "lastAppointment" | "status"> {
  status?: PatientStatus;
}

export interface PatientFilters {
  search: string;
  status: PatientStatus | "all";
  insurer: string | "all";
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
