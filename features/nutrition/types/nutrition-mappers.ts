import { ApiError } from "@/lib/api/http";
import { mealDefinitions, recalculateCycle } from "../lib/nutrition-calculations";
import type { NutritionAuditEntry, NutritionCycle, NutritionFood, NutritionPatientDetail, NutritionQueueResponse } from "./nutrition";
import type { NutritionEditWire, NutritionEventWire, NutritionFoodWire, NutritionMealWire, NutritionPatientWire, NutritionQueueWire, NutritionViewWire } from "./nutrition-wire";

/** Única frontera wire ↔ UI. Un contrato incompleto se rechaza, no se rellena. */
function requireField(condition: unknown): asserts condition {
  if (!condition) throw new ApiError(502, "server", "nutrition-contract");
}
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const states = ["borrador_ia", "en_aprobacion", "aprobado", "devuelto", "por_renovar"];
const mealTypes = { des: "desayuno", alm: "almuerzo", mer: "merienda", cen: "cena" } as const;
const wireMealTypes = { desayuno: "des", almuerzo: "alm", merienda: "mer", cena: "cen" } as const;

export function mapNutritionFoods(rows: NutritionFoodWire[]): NutritionFood[] {
  requireField(Array.isArray(rows));
  return rows.map((row) => {
    requireField(row && typeof row.id === "string" && typeof row.name === "string" && typeof row.foodGroup === "string");
    requireField([row.calories100, row.carbs100, row.protein100, row.fat100, row.fiber100].every(finite));
    return { id: row.id, name: row.name, group: row.foodGroup, per100g: { kcal: row.calories100, carbsG: row.carbs100, proteinG: row.protein100, fatG: row.fat100, fiberG: row.fiber100 }, householdEquivalent: row.gramsPerUnit && row.unitSingular ? `${row.gramsPerUnit} g / ${row.unitSingular}` : "" };
  });
}

export function mapNutritionCycle(row: NutritionViewWire, catalog: NutritionFood[]): NutritionCycle {
  requireField(row && typeof row.id === "string" && typeof row.patientId === "string" && states.includes(row.state));
  requireField(Number.isInteger(row.version) && Number.isInteger(row.revision) && typeof row.provisional === "boolean" && typeof row.isPublished === "boolean" && typeof row.menusOutdated === "boolean");
  const target = row.targets;
  requireField(target && [target.k, target.c, target.p, target.f, target.fi, target.vasos, target.bmr, target.tdee, target.deficit, target.floor, target.metaKg, target.kgLeft, target.wkKg, target.semanas].every(finite) && typeof target.fase === "string");
  requireField(Array.isArray(row.meals) && Array.isArray(row.alerts) && Array.isArray(row.missingData));
  const meals = row.meals.map((meal) => {
    requireField(meal && meal.mealType in mealTypes && Number.isInteger(meal.dayNumber) && meal.dayNumber >= 1 && meal.dayNumber <= 30 && Array.isArray(meal.items));
    requireField(finite(meal.waterMl) && meal.waterMl >= 0);
    const type = mealTypes[meal.mealType];
    const id = `${row.id}-${meal.dayNumber}-${type}`;
    return { id, dayNumber: meal.dayNumber, mealType: type, menuName: meal.menuName, notes: meal.notes, localTime: mealDefinitions.find((entry) => entry.type === type)!.time, waterGlasses: meal.waterMl / 250,
      items: meal.items.map((item, index) => {
        requireField(item && typeof item.foodItemId === "string" && finite(item.grams) && item.grams > 0 && catalog.some((food) => food.id === item.foodItemId));
        return { id: `${id}-${index}`, foodId: item.foodItemId, grams: item.grams, notes: item.notes ?? null };
      }), totals: { kcal: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0 },
    };
  });
  return recalculateCycle({
    id: row.id, patientId: row.patientId, version: row.version, state: row.state === "por_renovar" ? "aprobado" : row.state,
    publishedVersionId: row.isPublished ? row.id : null, provisional: row.provisional,
    provisionalReason: row.missingData.length ? row.missingData.join(", ") : null, menusOutdated: row.menusOutdated,
    startDate: row.startDate, endDate: row.endDate, patientTimeZone: "", targets: { kcal: target.k, carbsG: target.c, proteinG: target.p, fatG: target.f, fiberG: target.fi, waterGlasses: target.vasos },
    engineContext: { bmr: target.bmr, tdee: target.tdee, deficit: target.deficit, floor: target.floor, phase: target.fase, targetWeightKg: target.metaKg, remainingKg: target.kgLeft, weeklyKg: target.wkKg, weeks: target.semanas },
    instructions: row.instructions ?? "", meals, alerts: row.alerts.map((alert, index) => {
      requireField(alert && ["crit", "warn", "info"].includes(alert.s) && typeof alert.m === "string");
      return { code: `${row.id}-alert-${index}`, severity: alert.s === "crit" ? "critical" : alert.tec ? "technical" : alert.s === "warn" ? "warning" : "informational", message: alert.m };
    }), createdBy: row.createdBy, approvedBy: row.approvedBy, approvedAt: row.approvedAt, canRegenerate: row.canRegenerate,
  }, catalog);
}

export function mapNutritionQueue(row: NutritionQueueWire): NutritionQueueResponse {
  requireField(row && Array.isArray(row.items) && [row.total, row.page, row.pageSize, row.totalPages].every(finite));
  requireField(row.counts && ["all", ...states, "sin_plan"].every((state) => finite(row.counts[state as keyof typeof row.counts])));
  return { ...row, items: row.items.map((item) => {
    requireField(item && typeof item.patientId === "string" && typeof item.patientName === "string" && "prescription" in item);
    const plan = item.prescription;
    if (plan) requireField(states.includes(plan.state) && typeof plan.id === "string" && finite(plan.version) && finite(plan.criticalAlertCount) && (plan.dailyKcal === null || finite(plan.dailyKcal)) && typeof plan.aiAssisted === "boolean" && typeof plan.provisional === "boolean");
    return { patientId: item.patientId, patientName: item.patientName, patientDocument: item.patientDocument, plan: plan ? { ...plan, state: plan.state === "por_renovar" ? "aprobado" as const : plan.state, queueState: plan.state } : null };
  }) };
}

export function mapNutritionPatient(row: NutritionPatientWire, cycle: NutritionCycle | null, publishedCycle: NutritionCycle | null, revision: number): NutritionPatientDetail {
  requireField(row && typeof row.patientId === "string" && typeof row.patientName === "string" && row.profile && "prescriptionId" in row && "publishedPrescriptionId" in row && "timeZone" in row);
  const profile = row.profile;
  requireField([profile.age, profile.bmi, profile.hba1c, profile.completedTests].every((value) => value === null || finite(value)) && Array.isArray(profile.provisionalFields));
  requireField((cycle?.id ?? null) === row.prescriptionId && (publishedCycle?.id ?? null) === row.publishedPrescriptionId);
  return { patientId: row.patientId, patientName: row.patientName, patientDocument: row.patientDocument, nextPendingPatientId: row.nextPendingPatientId, profile, cycle: cycle ? { ...cycle, patientTimeZone: row.timeZone ?? "", publishedVersionId: publishedCycle?.id ?? null } : null, publishedCycle: publishedCycle ? { ...publishedCycle, patientTimeZone: row.timeZone ?? "" } : null, revision, audit: [] };
}

export function mapNutritionHistory(rows: NutritionEventWire[], version: number): NutritionAuditEntry[] {
  requireField(Array.isArray(rows));
  const actions: Record<string, NutritionAuditEntry["action"]> = { generate: "created", save: "saved", applyday: "saved", createversion: "version_created", submit: "submitted", approve: "approved", return: "returned", regenerate: "regenerated", publication_replaced: "publication_replaced" };
  return rows.map((row) => {
    requireField(row && typeof row.id === "string" && typeof row.actorUserId === "string" && typeof row.occurredAt === "string" && actions[row.action] && typeof row.autoApproved === "boolean");
    let eventVersion = version;
    if (row.snapshotJson) { const snapshot: unknown = JSON.parse(row.snapshotJson); if (snapshot && typeof snapshot === "object" && "version" in snapshot && finite(snapshot.version)) eventVersion = snapshot.version; }
    return { id: row.id, action: actions[row.action], actorId: row.actorUserId, actorName: row.actorUserId, occurredAt: row.occurredAt, version: eventVersion, comment: row.comment, criticalAlertsConfirmed: row.criticalConfirmed ? row.criticalCount : 0, autoApproved: row.autoApproved };
  });
}

export function toNutritionEdit(cycle: NutritionCycle, previous: NutritionCycle): NutritionEditWire {
  const edit: NutritionEditWire = {};
  if (JSON.stringify(cycle.targets) !== JSON.stringify(previous.targets)) {
    const engine = cycle.engineContext;
    requireField(engine);
    edit.targets = { k: cycle.targets.kcal, c: cycle.targets.carbsG, p: cycle.targets.proteinG, f: cycle.targets.fatG, fi: cycle.targets.fiberG, vasos: cycle.targets.waterGlasses,
      bmr: engine.bmr, tdee: engine.tdee, deficit: engine.deficit, floor: engine.floor, fase: engine.phase, metaKg: engine.targetWeightKg, kgLeft: engine.remainingKg, wkKg: engine.weeklyKg, semanas: engine.weeks };
  }
  const meals = (source: NutritionCycle): NutritionMealWire[] => source.meals.map((meal) => ({ dayNumber: meal.dayNumber, mealType: wireMealTypes[meal.mealType], menuName: meal.menuName ?? null, items: meal.items.map((item) => ({ foodItemId: item.foodId, grams: item.grams, notes: item.notes })), notes: meal.notes ?? null, waterMl: Math.round(meal.waterGlasses * 250) }));
  if (JSON.stringify(meals(cycle)) !== JSON.stringify(meals(previous))) { edit.meals = meals(cycle); edit.confirmManualEdits = !edit.targets && !previous.menusOutdated; }
  if (cycle.instructions !== previous.instructions) edit.instructions = cycle.instructions;
  return edit;
}
