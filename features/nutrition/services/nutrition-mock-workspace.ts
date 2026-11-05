import type { NutritionActor, NutritionAuditEntry, NutritionCycle, NutritionFood, NutritionPatientDetail, NutritionScope } from "../types/nutrition";
import { cycleIsComplete, mealDefinitions, recalculateCycle } from "../lib/nutrition-calculations";
import { nutritionMockPatients } from "./nutrition-mocks";

// TODO(backend-nutrition): fixtures y persistencia efímera SOLO para demostración.
// No localStorage, datos reales, llamadas de red ni motor clínico de producción.
export const nutritionMockCatalog: NutritionFood[] = [
  { id: "food-oats", name: "Avena demo", group: "Cereales", role: "C", per100g: { kcal: 0, carbsG: 60, proteinG: 13, fatG: 7, fiberG: 10 }, householdEquivalent: "40 g · porción demo" },
  { id: "food-yogurt", name: "Yogur demo", group: "Lácteos", role: "P", per100g: { kcal: 0, carbsG: 5, proteinG: 9, fatG: 3, fiberG: 0 }, householdEquivalent: "150 g · porción demo" },
  { id: "food-rice", name: "Arroz demo", group: "Cereales", role: "C", per100g: { kcal: 0, carbsG: 28, proteinG: 3, fatG: 1, fiberG: 2 }, householdEquivalent: "100 g · porción demo" },
  { id: "food-chicken", name: "Pollo demo", group: "Proteínas", role: "P", per100g: { kcal: 0, carbsG: 0, proteinG: 30, fatG: 4, fiberG: 0 }, householdEquivalent: "100 g · porción demo" },
  { id: "food-lentils", name: "Lentejas demo", group: "Legumbres", role: "P", per100g: { kcal: 0, carbsG: 20, proteinG: 9, fatG: 1, fiberG: 8 }, householdEquivalent: "100 g · porción demo" },
  { id: "food-apple", name: "Manzana demo", group: "Frutas", role: "C", per100g: { kcal: 0, carbsG: 14, proteinG: 0.5, fatG: 0.2, fiberG: 2.4 }, householdEquivalent: "150 g · porción demo" },
  { id: "food-vegetables", name: "Vegetales demo", group: "Verduras", role: "V", per100g: { kcal: 0, carbsG: 6, proteinG: 2, fatG: 0.5, fiberG: 3 }, householdEquivalent: "150 g · porción demo" },
  { id: "food-avocado", name: "Aguacate demo", group: "Grasas", role: "F", per100g: { kcal: 0, carbsG: 8, proteinG: 2, fatG: 15, fiberG: 7 }, householdEquivalent: "50 g · porción demo" },
].map((food) => ({ ...food, per100g: { ...food.per100g, kcal: food.per100g.carbsG * 4 + food.per100g.proteinG * 4 + food.per100g.fatG * 9 } })) as NutritionFood[];

const workspaces = new Map<string, Map<string, NutritionPatientDetail>>();

function createPatient(index: number, scope: NutritionScope): NutritionPatientDetail {
  const summary = nutritionMockPatients[index];
  const today = new Date();
  const endDate = new Date(today.getTime() + (summary.plan?.queueState === "por_renovar" ? 2 : 29) * 86_400_000).toISOString().slice(0, 10);
  const startDate = new Date(Date.parse(`${endDate}T12:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10);
  const meals = Array.from({ length: 30 }, (_, day) => mealDefinitions.map(({ type, time }, meal) => ({
    id: `meal-${day + 1}-${type}`, dayNumber: day + 1, mealType: type, localTime: time, waterGlasses: 2,
    items: (meal === 0 ? [["food-oats", 50], ["food-yogurt", 150]] : meal === 1 ? [["food-rice", 150], ["food-chicken", 120], ["food-vegetables", 150]] : meal === 2 ? [["food-apple", 150], ["food-yogurt", 125]] : [["food-lentils", 180], ["food-vegetables", 150], ["food-avocado", 50]]).map(([foodId, grams], item) => ({ id: `item-${day}-${meal}-${item}`, foodId: String(foodId), grams: Number(grams), notes: null })),
    totals: { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0 },
  }))).flat();
  const cycle: NutritionCycle | null = summary.plan ? recalculateCycle({
    id: summary.plan.id, patientId: summary.patientId, version: summary.plan.version, state: summary.plan.state,
    publishedVersionId: summary.plan.state === "aprobado" ? summary.plan.id : null,
    provisional: summary.plan.provisional, provisionalReason: summary.plan.provisional ? "Batería pendiente: 6 de 9 tests completados." : null,
    menusOutdated: false, startDate, endDate, patientTimeZone: "America/Bogota",
    targets: { kcal: summary.plan.dailyKcal ?? 1500, carbsG: 190, proteinG: 100, fatG: 50, fiberG: 25, waterGlasses: 8 },
    instructions: "Indicaciones sintéticas para revisar y ajustar en la demostración.", meals,
    alerts: [
      ...(index === 0 ? [
        { code: "demo-critical-1", severity: "critical" as const, message: "Alerta crítica demo: revisar el perfil cardiometabólico antes de aprobar." },
        { code: "demo-critical-2", severity: "critical" as const, message: "Alerta crítica demo: confirmar las restricciones alimentarias registradas." },
      ] : []),
      { code: "demo-warning", severity: "warning", message: "Advertencia demo: revisar la distribución de nutrientes del menú." },
      { code: "demo-info", severity: "informational", message: "Datos sintéticos: estos valores no son una recomendación clínica." },
      { code: "demo-technical", severity: "technical", message: "El catálogo demo contiene 8 alimentos; falta conectar el catálogo oficial." },
    ],
    createdBy: scope.userId, approvedBy: summary.plan.state === "aprobado" ? "demo-reviewer" : null,
    approvedAt: summary.plan.state === "aprobado" ? "2026-11-05T12:00:00Z" : null,
  }, nutritionMockCatalog) : null;
  return {
    patientId: summary.patientId, patientName: summary.patientName, patientDocument: summary.patientDocument,
    nextPendingPatientId: null,
    profile: { age: 42 + index % 10, sex: index % 2 ? "male" : "female", bmi: 27.4, hba1c: index === 1 ? null : 5.8, movement: "Movimiento moderado", adherence: "Adherencia A2", cardiometabolicRisk: "Riesgo demo moderado", completedTests: index === 1 ? 6 : 9, provisionalFields: index === 1 ? ["HbA1c pendiente"] : [], programPatientId: null },
    cycle, publishedCycle: cycle?.state === "aprobado" ? structuredClone(cycle) : null, revision: 1,
    audit: cycle ? [{ id: `audit-${index}`, action: "created", actorId: scope.userId, actorName: "Profesional demo", occurredAt: "2026-11-05T12:00:00Z", version: cycle.version, comment: null, criticalAlertsConfirmed: 0, autoApproved: false }] : [],
  };
}

export function mockWorkspace(scope: NutritionScope): Map<string, NutritionPatientDetail> {
  const key = JSON.stringify([scope.userId, scope.clinicId]);
  let workspace = workspaces.get(key);
  if (!workspace) {
    workspace = new Map(nutritionMockPatients.map((summary, index) => [summary.patientId, createPatient(index, scope)]));
    workspaces.set(key, workspace);
  }
  return workspace;
}

export function mockPatient(patientId: string, scope: NutritionScope): NutritionPatientDetail | null {
  const workspace = mockWorkspace(scope);
  const patient = workspace.get(patientId);
  if (!patient) return null;
  return { ...structuredClone(patient), nextPendingPatientId: Array.from(workspace.values()).find((entry) => entry.patientId !== patientId && entry.cycle?.state === "en_aprobacion")?.patientId ?? null };
}

export function saveMockDraft(patientId: string, cycle: NutritionCycle, revision: number, scope: NutritionScope): NutritionPatientDetail {
  const patient = mockWorkspace(scope).get(patientId);
  if (!patient?.cycle || patient.revision !== revision || patient.cycle.id !== cycle.id || patient.cycle.state === "aprobado" || patient.cycle.state === "en_aprobacion") throw new Error("nutrition-conflict");
  // Se conservan los campos de autoría/publicación y estado que no edita el formulario.
  patient.cycle = recalculateCycle({ ...structuredClone(cycle), createdBy: patient.cycle.createdBy, publishedVersionId: patient.cycle.publishedVersionId, state: patient.cycle.state }, nutritionMockCatalog);
  patient.revision++;
  return mockPatient(patientId, scope)!;
}

export type NutritionMockAction = "submit" | "approve" | "return" | "new-version" | "create" | "regenerate";
export function actOnMockPatient(patientId: string, action: NutritionMockAction, revision: number, actor: NutritionActor, scope: NutritionScope, options: { comment?: string; criticalConfirmed?: boolean } = {}): NutritionPatientDetail {
  const patient = mockWorkspace(scope).get(patientId);
  if (!patient || patient.revision !== revision) throw new Error("nutrition-conflict");
  let cycle = patient.cycle;
  let auditAction: NutritionAuditEntry["action"];
  if (action === "create") {
    if (cycle) throw new Error("nutrition-transition");
    cycle = createPatient(1, scope).cycle!;
    cycle.id = crypto.randomUUID(); cycle.patientId = patientId; cycle.createdBy = actor.id;
    cycle.version = 1; cycle.provisional = patient.profile.completedTests < 9;
    cycle.provisionalReason = cycle.provisional ? "Batería pendiente: 6 de 9 tests completados." : null;
    auditAction = "created";
  } else {
    if (!cycle) throw new Error("nutrition-transition");
    if (action === "new-version") {
      if (cycle.state !== "aprobado") throw new Error("nutrition-transition");
      cycle = { ...structuredClone(cycle), id: crypto.randomUUID(), version: cycle.version + 1, state: "borrador_ia", createdBy: actor.id, approvedBy: null, approvedAt: null };
      auditAction = "version_created";
    } else if (action === "approve") {
      if (cycle.state !== "en_aprobacion" || !cycleIsComplete(cycle, nutritionMockCatalog) || (cycle.alerts.some((alert) => alert.severity === "critical") && !options.criticalConfirmed)) throw new Error("nutrition-review-required");
      cycle.state = "aprobado"; cycle.approvedBy = actor.id; cycle.approvedAt = new Date().toISOString(); cycle.publishedVersionId = cycle.id;
      patient.publishedCycle = structuredClone(cycle);
      auditAction = "approved";
    } else if (action === "return") {
      if (cycle.state !== "en_aprobacion" || !options.comment?.trim()) throw new Error("nutrition-comment-required");
      cycle.state = "devuelto"; auditAction = "returned";
    } else if (action === "submit") {
      if (!["borrador_ia", "devuelto"].includes(cycle.state) || !cycleIsComplete(cycle, nutritionMockCatalog)) throw new Error("nutrition-incomplete");
      cycle.state = "en_aprobacion"; auditAction = "submitted";
    } else {
      if (!["borrador_ia", "devuelto"].includes(cycle.state)) throw new Error("nutrition-transition");
      // Simulación proporcional para maquetar: NO es el motor nutricional clínico.
      const reference = cycle.meals.filter((meal) => meal.dayNumber === 1).reduce((total, meal) => total + meal.totals.kcal, 0);
      const ratio = cycle.targets.kcal / Math.max(1, reference);
      cycle = recalculateCycle({ ...cycle, menusOutdated: false, meals: cycle.meals.map((meal) => ({ ...meal, items: meal.items.map((item) => ({ ...item, grams: Math.min(1000, Math.max(1, Math.round(item.grams * ratio))) })) })) }, nutritionMockCatalog);
      auditAction = "regenerated";
    }
  }
  patient.cycle = cycle;
  patient.revision++;
  patient.audit.unshift({ id: crypto.randomUUID(), action: auditAction, actorId: actor.id, actorName: actor.name, occurredAt: new Date().toISOString(), version: cycle.version, comment: options.comment?.trim() ?? null, criticalAlertsConfirmed: action === "approve" ? cycle.alerts.filter((alert) => alert.severity === "critical").length : 0, autoApproved: action === "approve" && cycle.createdBy === actor.id });
  return mockPatient(patientId, scope)!;
}
