import type { NutritionFilter, NutritionPatientSummary, NutritionQueueQuery, NutritionQueueResponse, NutritionQueueState } from "../types/nutrition";

// TODO(backend-nutrition): retirar fixtures al habilitar los endpoints reales.
// Son identidades y medidas ficticias para maquetación, nunca datos clínicos reales.
const states: NutritionQueueState[] = ["en_aprobacion", "borrador_ia", "devuelto", "aprobado", "por_renovar", "sin_plan"];
const names = ["María Demo", "Carlos Demo", "Sofía Demo", "Andrés Demo", "Lucía Demo", "Diego Demo", "Elena Demo", "Mateo Demo", "Valentina Demo", "Daniel Demo", "Isabel Demo", "Pablo Demo", "Camila Demo", "Gabriel Demo", "Laura Demo", "Samuel Demo"];

export const nutritionMockPatients: NutritionPatientSummary[] = names.map((patientName, index) => {
  const state = states[index % states.length];
  return {
    patientId: `demo-patient-${index + 1}`,
    patientName,
    patientDocument: `DEMO-${String(index + 1).padStart(4, "0")}`,
    plan: state === "sin_plan" ? null : {
      id: `demo-cycle-${index + 1}`,
      state: state === "por_renovar" ? "aprobado" : state,
      queueState: state,
      version: 1 + index % 3,
      dailyKcal: 1500 + index % 5 * 100,
      criticalAlertCount: index === 0 ? 2 : 0,
      aiAssisted: index % 2 === 0 || state === "borrador_ia",
      provisional: index === 1,
      endDate: null,
    },
  };
});

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

export function mockNutritionQueue(query: NutritionQueueQuery, patients = nutritionMockPatients): NutritionQueueResponse {
  const search = normalize(query.search.trim());
  const searched = patients.filter((item) => normalize(`${item.patientName} ${item.patientDocument ?? ""}`).includes(search));
  const counts: Record<NutritionFilter, number> = { all: searched.length, en_aprobacion: 0, borrador_ia: 0, devuelto: 0, aprobado: 0, por_renovar: 0, sin_plan: 0 };
  for (const item of searched) counts[item.plan?.queueState ?? "sin_plan"]++;
  const filtered = searched.filter((item) => query.state === "all" || (item.plan?.queueState ?? "sin_plan") === query.state);
  return {
    items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(filtered.length / query.pageSize),
    counts,
  };
}
