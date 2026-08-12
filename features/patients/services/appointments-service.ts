import { mockAppointments } from "../mocks/patients";
import type { Appointment, AppointmentInput } from "../types";

let appointments = [...mockAppointments];

export async function createAppointment(
  input: AppointmentInput,
  patientName: string,
): Promise<Appointment> {
  await delay(750);
  const appointment: Appointment = {
    ...input,
    id: `apt-${Date.now()}`,
    patientName,
    status: "Confirmada",
  };
  appointments = [appointment, ...appointments];
  return appointment;
}

export function getAppointments(): Appointment[] {
  return appointments;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
