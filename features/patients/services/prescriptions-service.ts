import { mockPrescriptions } from "../mocks/patients";
import type { Medication, Prescription } from "../types";

let prescriptions = [...mockPrescriptions];

export async function fetchPrescriptions(
  patientId: string,
): Promise<Prescription[]> {
  await delay(500);
  return prescriptions.filter(
    (prescription) => prescription.patientId === patientId,
  );
}

export async function createPrescription(
  input: Omit<Prescription, "id" | "issuedAt">,
): Promise<Prescription> {
  await delay(800);
  const prescription = {
    ...input,
    id: `rx-${Date.now()}`,
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  prescriptions = [prescription, ...prescriptions];
  return prescription;
}

export function createMedication(): Medication {
  return {
    id: `med-${Date.now()}-${Math.random()}`,
    name: "",
    activeIngredient: "",
    presentation: "",
    dose: "",
    frequency: "Cada 8 horas",
    duration: "",
    quantity: "",
    route: "Oral",
    instructions: "",
  };
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
