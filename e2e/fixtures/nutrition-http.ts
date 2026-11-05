import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { NutritionPatientDetail, NutritionQueueQuery } from "../../features/nutrition/types/nutrition";
import type { NutritionEventWire, NutritionFoodWire, NutritionQueueWire, NutritionViewWire } from "../../features/nutrition/types/nutrition-wire";
import { cycleIsComplete, recalculateCycle, replicateDay } from "../../features/nutrition/lib/nutrition-calculations";
import { mockNutritionQueue } from "./nutrition-demo-patients";
import { actOnMockPatient, mockWorkspace, nutritionMockCatalog, saveMockDraft, type NutritionMockAction } from "./nutrition-demo-workspace";

export const nutritionE1PatientId = "00000000-0000-4000-8000-000000000061";
const mealType = { desayuno: "des", almuerzo: "alm", merienda: "mer", cena: "cen" } as const;
const uiMealType = { des: "desayuno", alm: "almuerzo", mer: "merienda", cen: "cena" } as const;

/** Contrato HTTP sintético; jamás se importa desde app/features. No sustituye QA del backend. */
export async function mockNutritionHttp(page: Page, permissions = ["Nutrition.Manage", "Nutrition.Approve"], options: { english?: boolean; includeE1?: boolean; unavailable?: string; malformedQueue?: boolean; conflictOnce?: boolean; nullableWater?: boolean; identityStatus?: 403 | 404 } = {}) {
  const scope = { userId: randomUUID(), clinicId: null };
  const actor = { id: scope.userId, name: "QA Nutrición" };
  const store = mockWorkspace(scope);
  if (options.nullableWater) store.get("demo-patient-2")!.cycle!.meals[0].waterGlasses = null;
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  if (options.english) await page.context().addCookies([{ name: "copp_lang", value: "en", url: process.env.E2E_BASE_URL ?? "http://localhost:3000" }]);
  if (options.includeE1) {
    const patient = structuredClone(store.get("demo-patient-6")!);
    patient.patientId = nutritionE1PatientId; patient.patientName = "Paciente E1"; patient.patientDocument = "E1-SINTETICO";
    patient.cycle = null; patient.publishedCycle = null; patient.revision = 0; patient.audit = [];
    patient.profile = { ...patient.profile, age: null, sex: null, bmi: null, hba1c: null, completedTests: 0, weightKg: null, heightCm: null, birthDate: null, provisionalFields: ["Batería pendiente"] };
    store.set(patient.patientId, patient);
  }

  function viewOf(patient: NutritionPatientDetail, cycle = patient.cycle!): NutritionViewWire {
    const target = cycle.targets;
    return {
      id: cycle.id, patientId: patient.patientId, cycleId: `cycle-${patient.patientId}`, version: cycle.version, revision: patient.revision,
      state: cycle.state === "aprobado" && cycle.endDate && (Date.parse(`${cycle.endDate}T23:59:59Z`) - Date.now()) / 86_400_000 <= 5 ? "por_renovar" : cycle.state,
      provisional: cycle.provisional, isPublished: cycle.id === patient.publishedCycle?.id, menusOutdated: cycle.menusOutdated, manualEditsConfirmed: false,
      startDate: cycle.startDate, endDate: cycle.endDate,
      targets: { k: target.kcal, c: target.carbsG, p: target.proteinG, f: target.fatG, fi: target.fiberG, vasos: target.waterGlasses, bmr: 1500, tdee: 2000, deficit: 0.15, floor: 1200, fase: "perder", metaKg: 60, kgLeft: 10, wkKg: 0.4, semanas: 25 },
      instructions: cycle.instructions, instructionsEn: null, narrativeSource: "synthetic_http_fixture", missingData: cycle.provisional ? ["Batería pendiente"] : [],
      alerts: cycle.alerts.map((alert, index) => ({ s: alert.severity === "critical" ? "crit" : alert.severity === "informational" ? "info" : "warn", m: alert.message, tec: alert.severity === "technical" || alert.severity === "critical" && index === 0 })),
      meals: cycle.meals.map((meal) => ({ dayNumber: meal.dayNumber, mealType: mealType[meal.mealType], menuName: meal.menuName ?? null, notes: meal.notes ?? null, waterMl: meal.waterGlasses === null ? null : Math.round(meal.waterGlasses * 250), items: meal.items.map((item) => ({ foodItemId: item.foodId, grams: item.grams, notes: item.notes })) })),
      canRegenerate: cycle.provisional && patient.profile.completedTests === 9,
      createdBy: cycle.createdBy, approvedBy: cycle.approvedBy, approvedAt: cycle.approvedAt,
    };
  }

  function queueOf(query: NutritionQueueQuery): NutritionQueueWire {
    const summaries = Array.from(store.values()).map((patient) => ({ patientId: patient.patientId, patientName: patient.patientName, patientDocument: patient.patientDocument,
      plan: patient.cycle ? { id: patient.cycle.id, state: patient.cycle.state, queueState: viewOf(patient).state, version: patient.cycle.version, dailyKcal: patient.cycle.targets.kcal, criticalAlertCount: patient.cycle.alerts.filter((alert) => alert.severity === "critical").length, aiAssisted: true, provisional: patient.cycle.provisional, endDate: patient.cycle.endDate } : null }));
    const queue = mockNutritionQueue(query, summaries);
    return { total: queue.total, page: queue.page, pageSize: queue.pageSize, items: queue.items.map(({ plan, ...patient }) => ({ patientId: patient.patientId, patientName: patient.patientName, state: plan?.queueState ?? "sin_plan", prescription: plan ? { id: plan.id, version: plan.version, revision: store.get(patient.patientId)!.revision, k: plan.dailyKcal, state: plan.queueState, provisional: plan.provisional, startDate: store.get(patient.patientId)!.cycle!.startDate, endDate: plan.endDate, isPublished: store.get(patient.patientId)!.publishedCycle?.id === plan.id, criticalAlertCount: plan.criticalAlertCount } : null })) };
  }

  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/auth/refresh") return reply({ accessToken: "synthetic-nutrition-http-test", expiresIn: 3600 });
    if (path === "/api/auth/me") return reply({ id: scope.userId, email: "qa@example.invalid", firstName: "QA", lastName: "Nutrición", roles: ["Reviewer"], permissions });
    if (path === "/api/auth/me/preferences") return reply({});
    if (path === "/api/v1/me/context") return reply({ userId: scope.userId, employeeId: null, professionalId: null, organization: null, isProfessional: false, onboardingCompleted: true, employeeStatus: "Active", clinics: [], activeClinicId: null });
    if (path.startsWith("/api/v1/patients/")) {
      if (options.identityStatus) return reply({ detail: "Demografía fuera de alcance" }, options.identityStatus);
      const patient = store.get(decodeURIComponent(path.split("/").at(-1)!));
      if (!patient) return reply({ detail: "Paciente no encontrado" }, 404);
      return reply({ id: patient.patientId, firstName: patient.patientName, middleName: null, lastName: "", documentNumber: patient.patientDocument, dateOfBirth: patient.profile.birthDate ?? null, gender: patient.profile.sex === "female" ? "Femenino" : patient.profile.sex === "male" ? "Masculino" : null });
    }
    if (!path.startsWith("/api/v1/nutrition/")) return reply({}, 404);
    if (!request.headers().authorization?.startsWith("Bearer ")) return reply({}, 401);
    if (options.unavailable && path === options.unavailable) return reply({ detail: "Endpoint pendiente de backend" }, 404);
    if (path === "/api/v1/nutrition/inbox") {
      if (options.malformedQueue) return reply({ items: [{ patientName: "Dato incompleto" }] });
      return reply(queueOf({ search: url.searchParams.get("search") ?? "", state: (url.searchParams.get("state") ?? "all") as NutritionQueueQuery["state"], page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 10) }));
    }
    if (path === "/api/v1/nutrition/foods") return reply(nutritionMockCatalog.map((food): NutritionFoodWire => ({ id: food.id, name: food.name, foodGroup: food.group, calories100: food.per100g.kcal, carbs100: food.per100g.carbsG, protein100: food.per100g.proteinG, fat100: food.per100g.fatG, fiber100: food.per100g.fiberG, unitSingular: null, unitPlural: null, gramsPerUnit: null, unitStep: null })));
    const match = path.match(/^\/api\/v1\/nutrition\/patients\/([^/]+)(?:\/prescriptions(?:\/([^/]+)(?:\/([^/]+))?)?)?$/);
    if (!match) return reply({}, 404);
    const patientId = decodeURIComponent(match[1]); const id = match[2]; const verb = match[3];
    let patient = store.get(patientId);
    if (!patient) return reply({ detail: "Paciente no encontrado" }, 404);
    if (!path.includes("/prescriptions")) return reply({}, 404);
    if (request.method() === "GET") {
      if (!id) return reply([patient.cycle, patient.publishedCycle].filter((cycle, index, all) => cycle && all.findIndex((entry) => entry?.id === cycle.id) === index).map((cycle) => ({ ...viewOf(patient!, cycle!), meals: [], alerts: [] })));
      if (verb === "history") {
        const actions = { created: "generate", saved: "save", submitted: "submit", approved: "approve", returned: "return", version_created: "createversion", regenerated: "regenerate", publication_replaced: "publication_replaced" };
        return reply(patient.audit.map((entry): NutritionEventWire => ({ id: entry.id, prescriptionId: id!, actorUserId: entry.actorId, occurredAt: entry.occurredAt, action: actions[entry.action], revision: patient!.revision, comment: entry.comment, criticalCount: entry.criticalAlertsConfirmed, criticalConfirmed: entry.criticalAlertsConfirmed > 0, autoApproved: entry.autoApproved, snapshotJson: JSON.stringify({ version: entry.version }) })));
      }
      const cycle = patient.cycle?.id === id ? patient.cycle : patient.publishedCycle?.id === id ? patient.publishedCycle : null;
      return cycle ? reply(viewOf(patient, cycle)) : reply({}, 404);
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    const required = verb === "approve" || verb === "return" ? "Nutrition.Approve" : "Nutrition.Manage";
    if (!permissions.includes(required)) return reply({}, 403);
    writes.push({ path, body });
    if (options.conflictOnce) { options.conflictOnce = false; patient.revision++; return reply({ detail: "Revisión obsoleta" }, 409); }
    try {
      if (!id) {
        const manual = body.manual as { peso?: number; talla?: number; sexo?: string } | undefined;
        if (!body.birthDate || !manual?.peso || !manual.talla || !manual.sexo) return reply({ detail: "Datos mínimos obligatorios" }, 422);
        actOnMockPatient(patientId, "create", patient.revision, actor, scope);
        patient = store.get(patientId)!;
        patient.revision = 1;
        if (patientId === nutritionE1PatientId) patient.cycle!.alerts.push(...store.get("demo-patient-1")!.cycle!.alerts.filter((alert) => alert.severity === "critical"));
        return reply(viewOf(patient), 201);
      }
      if (patient.cycle?.id !== id) return reply({}, 404);
      const revision = Number(body.revision);
      if (verb === "apply-day") {
        const edit = body.edit as { sourceDay: number; confirmManualEdits: boolean };
        if (!Number.isInteger(edit.sourceDay) || edit.sourceDay < 1 || edit.sourceDay > 30 || edit.confirmManualEdits !== true) return reply({ detail: "Día no válido" }, 422);
        saveMockDraft(patientId, replicateDay(patient.cycle, edit.sourceDay), revision, scope);
      } else if (verb === "save") {
        const cycle = structuredClone(patient.cycle);
        const edit = body.edit as { targets?: NutritionViewWire["targets"]; meals?: NutritionViewWire["meals"]; instructions?: string; confirmManualEdits?: boolean };
        if (edit.targets) { const target = edit.targets; cycle.targets = { kcal: target.k, carbsG: target.c, proteinG: target.p, fatG: target.f, fiberG: target.fi, waterGlasses: target.vasos }; cycle.menusOutdated = true; }
        if (edit.meals) {
          for (const meal of edit.meals) {
            const type = uiMealType[meal.mealType]; const index = cycle.meals.findIndex((entry) => entry.dayNumber === meal.dayNumber && entry.mealType === type);
            cycle.meals[index] = { id: `${cycle.id}-${meal.dayNumber}-${type}`, dayNumber: meal.dayNumber, mealType: type, localTime: cycle.meals[index].localTime, waterGlasses: meal.waterMl === null ? null : meal.waterMl / 250, menuName: meal.menuName, notes: meal.notes, items: meal.items.map((item, index) => ({ id: `${meal.dayNumber}-${type}-${index}`, foodId: item.foodItemId, grams: item.grams, notes: item.notes })), totals: cycle.meals[index].totals };
          }
          if (edit.confirmManualEdits) cycle.menusOutdated = false;
          if (!cycle.meals.every((meal) => meal.items.length > 0)) return reply({ detail: "Comida vacía" }, 422);
        }
        if (edit.instructions !== undefined) cycle.instructions = edit.instructions;
        saveMockDraft(patientId, recalculateCycle(cycle, nutritionMockCatalog), revision, scope);
      } else {
        const action = (verb === "create-version" ? "new-version" : verb) as NutritionMockAction;
        if ((action === "approve" || action === "submit") && !cycleIsComplete(patient.cycle, nutritionMockCatalog)) return reply({}, 422);
        actOnMockPatient(patientId, action, revision, actor, scope, { comment: String(body.comment ?? ""), criticalConfirmed: body.criticalConfirmed === true });
        if (action === "new-version") store.get(patientId)!.revision = 1;
      }
      return reply(viewOf(store.get(patientId)!));
    } catch { return reply({ detail: "Transición o revisión inválida" }, 409); }
  });
  return { writes, store };
}
