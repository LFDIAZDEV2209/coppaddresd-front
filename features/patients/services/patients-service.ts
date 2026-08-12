import { mockPatients } from "../mocks/patients";
import type { Patient, PatientFilters, PatientInput, PaginatedResult } from "../types";

let patients = [...mockPatients];

export async function fetchPatients(
  page: number,
  pageSize: number,
  filters: PatientFilters,
  options?: { simulateError?: boolean }
): Promise<PaginatedResult<Patient>> {
  await simulateDelay(650);
  if (options?.simulateError) throw new Error("No fue posible cargar los pacientes.");

  const query = filters.search.trim().toLowerCase();
  const filtered = patients.filter((patient) => {
    const searchable = `${patient.firstName} ${patient.lastName} ${patient.documentNumber} ${patient.email}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (filters.status === "all" || patient.status === filters.status) &&
      (filters.insurer === "all" || patient.insurer === filters.insurer);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages };
}

export async function createPatient(input: PatientInput): Promise<Patient> {
  await simulateDelay(700);
  const patient: Patient = { ...input, id: `pat-${Date.now()}`, status: input.status ?? "Activo", lastAppointment: null, registeredAt: new Date().toISOString().slice(0, 10) };
  patients = [patient, ...patients];
  return patient;
}

export async function updatePatient(id: string, input: PatientInput): Promise<Patient> {
  await simulateDelay(700);
  const current = patients.find((patient) => patient.id === id);
  if (!current) throw new Error("Paciente no encontrado.");
  const updated = { ...current, ...input };
  patients = patients.map((patient) => patient.id === id ? updated : patient);
  return updated;
}

export async function deletePatient(id: string): Promise<void> {
  await simulateDelay(550);
  patients = patients.filter((patient) => patient.id !== id);
}

export function getPatient(id: string): Patient | undefined {
  return patients.find((patient) => patient.id === id);
}

export function getInsurers(): string[] {
  return [...new Set(patients.map((patient) => patient.insurer))].sort();
}

function simulateDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
