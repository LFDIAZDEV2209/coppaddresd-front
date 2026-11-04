import { test, expect, type Page } from "@playwright/test";

const planIds = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const patientIds = ["33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"];
const meals = Array.from({ length: 7 }, (_, index) => ["Desayuno", "Almuerzo", "Snack", "Cena"].map((mealType, meal) => ({
  id: `${index}-${meal}`, dayNumber: index + 1, mealType, description: `Comida sintética ${index + 1}`,
  foods: "Alimentos de prueba", calories: 400, proteinG: 20, carbsG: 40, fatG: 12, fiberG: 8,
  waterMl: 500, dailyWaterMl: 2000, notes: null, sortOrder: meal, mediaId: null,
}))).flat();

async function mockApi(page: Page, canApprove = true, rejectFirstApproval = false) {
  const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
  const plans = planIds.map((id, index) => ({
    id, name: `Plan revisable ${index + 1}`, description: "Datos sintéticos para revisión", targetCondition: null,
    durationDays: 30, dailyCalorieTarget: 1800, dailyProteinTarget: 90, dailyCarbsTarget: 200,
    dailyFatTarget: 60, dailyFiberTarget: 25, allergens: "Alergias revisadas", mealTiming: null,
    isTemplate: false, patientId: patientIds[index], patientName: `Paciente de prueba ${index + 1}`,
    status: "Draft", createdAt: "2026-11-03T12:00:00Z", updatedAt: null, createdBy: null,
    sourcePlanId: null, assignmentId: null, revision: index === 0 ? 3 : 5,
    reviewStatus: "pending_review", approvedBy: null as string | null, approvedAt: null as string | null, generationStatus: "completed", days: meals,
  }));
  let approvalCalls = 0;
  // Todas las APIs se interceptan. Ningún paciente, plan ni proveedor real se modifica.
  await page.route("**/api/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/auth/refresh") return reply({ accessToken: "synthetic-test-token", expiresIn: 3600 });
    if (path === "/api/auth/me") return reply({ id: patientIds[0], email: "qa@example.invalid", firstName: "QA", lastName: "Nutrición", roles: ["NutritionReviewer"],
      permissions: ["Wellness.View", "Wellness.Manage", ...(canApprove ? ["NutritionPlans.Approve"] : [])] });
    if (path === "/api/v1/me/context") return reply({ userId: patientIds[0], employeeId: null, professionalId: null, organization: null,
      isProfessional: false, professionalTypeName: null, onboardingCompleted: true, employeeStatus: "Active", clinics: [], activeClinicId: null });
    if (path === "/api/v1/wellness/nutrition-plans/approve" && request.method() === "POST") {
      const body = request.postDataJSON(); writes.push({ path, body }); approvalCalls++;
      if (rejectFirstApproval && approvalCalls === 1) return reply({ detail: "El plan cambió. Actualiza y revisa su última versión." }, 409);
      const approved = (body.plans as Array<{ id: string; revision: number }>).map(input => {
        const plan = plans.find(item => item.id === input.id)!;
        plan.reviewStatus = "approved"; plan.status = "Active"; plan.approvedAt = "2026-11-03T14:00:00Z";
        plan.approvedBy = patientIds[0]; plan.revision++; return plan;
      });
      return reply(approved);
    }
    if (path === "/api/v1/wellness/nutrition-plans") return reply({ data: plans, total: plans.length, page: 1, pageSize: 10, totalPages: 1 });
    const plan = plans.find(item => path === `/api/v1/wellness/nutrition-plans/${item.id}`);
    if (plan && request.method() === "PUT") { const body = request.postDataJSON(); writes.push({ path, body }); return reply({ ...plan, ...body, revision: plan.revision + 1 }); }
    if (plan) return reply(plan);
    if (path.endsWith("/history")) return reply([{ id: "history-1", actorUserId: patientIds[0], actorName: "Nutricionista de prueba",
      occurredAt: "2026-11-03T12:00:00Z", action: "generated", revision: 3, notes: "Sin datos reales" }]);
    return reply({}, 404);
  });
  return writes;
}

test("individual review requires acknowledgement and publishes the reviewed revision", async ({ page }) => {
  const writes = await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wellness/nutrition-plans");
  await page.getByRole("button", { name: "Revisar plan", exact: true }).first().click();
  const publish = page.getByRole("button", { name: "Aprobar y publicar plan", exact: true });
  await expect(publish).toBeDisabled();
  await expect(page.getByText("Nutricionista de prueba", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Revisé las comidas, alergias/ }).check();
  await page.getByRole("textbox", { name: "Notas de revisión", exact: true }).fill("Menú y merienda revisados");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/diomedes-nutrition-review-mobile.png", fullPage: true });
  await publish.click();
  await expect.poll(() => writes[0]?.body).toMatchObject({ plans: [{ id: planIds[0], revision: 3, notes: "Menú y merienda revisados" }] });
  await expect(page.getByText("Plan aprobado. El paciente puede consultar su ciclo de 30 días.")).toBeVisible();
});

test("bulk review preserves selected revisions and displays a conflict without claiming success", async ({ page }) => {
  const writes = await mockApi(page, true, true);
  await page.goto("/wellness/nutrition-plans");
  await page.getByRole("checkbox", { name: "Seleccionar todos los borradores de esta página", exact: true }).check();
  await page.getByRole("button", { name: "Aprobar seleccionados (2)", exact: true }).click();
  const publish = page.getByRole("button", { name: "Aprobar y publicar", exact: true });
  await expect(publish).toBeDisabled();
  await page.getByRole("checkbox", { name: /Confirmo que revisé individualmente/ }).check();
  await publish.click();
  await expect(page.getByRole("alert")).toContainText("El plan cambió");
  expect(writes[0]?.body).toMatchObject({ plans: [{ id: planIds[0], revision: 3 }, { id: planIds[1], revision: 5 }] });
  await page.screenshot({ path: "/tmp/diomedes-nutrition-bulk-desktop.png", fullPage: true });
  await publish.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(writes).toHaveLength(2);
});

test("editing an approved-cycle menu sends a draft with the loaded revision and keeps snack", async ({ page }) => {
  const writes = await mockApi(page);
  await page.goto("/wellness/nutrition-plans");
  await page.getByTitle("Editar", { exact: true }).first().click();
  await expect(page.locator("#plan-name")).toHaveValue("Plan revisable 1");
  await page.locator("#plan-name").fill("Menú ajustado");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => writes[0]?.body).toMatchObject({ name: "Menú ajustado", status: "Draft", revision: 3, durationDays: 30 });
  expect((writes[0]?.body.days as Array<{ mealType: string }>).filter(meal => meal.mealType === "Snack")).toHaveLength(7);
});

test("without approval permission the reviewer controls are absent", async ({ page }) => {
  const writes = await mockApi(page, false);
  await page.goto("/wellness/nutrition-plans");
  await expect(page.getByRole("heading", { name: "Planes de alimentación", level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aprobar seleccionados/ })).toHaveCount(0);
  await page.getByTitle("Ver detalles", { exact: true }).first().click();
  await expect(page.getByText("Revisión nutricional", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar y publicar plan", exact: true })).toHaveCount(0);
  expect(writes).toHaveLength(0);
});
