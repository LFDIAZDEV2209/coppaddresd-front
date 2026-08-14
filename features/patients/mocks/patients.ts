import type { Appointment, Prescription } from "../types";

export const mockAppointments: Appointment[] = [
  {
    id: "apt-001",
    patientId: "pat-001",
    patientName: "Valentina Ríos Salazar",
    specialty: "Medicina general",
    professional: "Dra. Laura Martínez",
    date: "2024-06-20",
    time: "08:30",
    consultationType: "Presencial",
    reason: "Control general",
    notes: "",
    status: "Confirmada",
  },
  {
    id: "apt-002",
    patientId: "pat-004",
    patientName: "Julián Pardo Cárdenas",
    specialty: "Cardiología",
    professional: "Dr. Carlos Ramírez",
    date: "2024-06-20",
    time: "10:00",
    consultationType: "Presencial",
    reason: "Control metabólico",
    notes: "",
    status: "Pendiente",
  },
];

export const mockPrescriptions: Prescription[] = [
  {
    id: "rx-001",
    patientId: "pat-001",
    patientName: "Valentina Ríos Salazar",
    issuedAt: "2024-06-12",
    professional: "Dra. Laura Martínez",
    generalInstructions:
      "Tomar los medicamentos con abundante agua y asistir a control en 30 días.",
    medications: [
      {
        id: "med-001",
        name: "Losartán",
        activeIngredient: "Losartán potásico",
        presentation: "Tableta 50 mg",
        dose: "1 tableta",
        frequency: "Cada 12 horas",
        duration: "30 días",
        quantity: "60 tabletas",
        route: "Oral",
        instructions: "Tomar en la mañana y en la noche.",
      },
    ],
  },
  {
    id: "rx-002",
    patientId: "pat-004",
    patientName: "Julián Pardo Cárdenas",
    issuedAt: "2024-05-28",
    professional: "Dr. Carlos Ramírez",
    generalInstructions:
      "Evitar automedicación y mantener hidratación adecuada.",
    medications: [
      {
        id: "med-002",
        name: "Metformina",
        activeIngredient: "Metformina clorhidrato",
        presentation: "Tableta 850 mg",
        dose: "1 tableta",
        frequency: "Cada 12 horas",
        duration: "90 días",
        quantity: "180 tabletas",
        route: "Oral",
        instructions: "Tomar junto con las comidas.",
      },
    ],
  },
];
