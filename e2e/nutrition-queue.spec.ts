import { test, expect, type Page } from "@playwright/test";
import { mockNutritionHttp, nutritionE1PatientId } from "./fixtures/nutrition-http";
import { loginAsAdmin } from "./fixtures/auth";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// API HTTP simulada de forma explícita: la aplicación usa siempre apiFetch.
async function session(page: Page, permissions: string[], english = false) {
  return mockNutritionHttp(page, permissions, { english });
}

/** Fixture opt-in por API existente, solo localhost; nunca modifica un plan previo. */
async function createLocalNutritionPatient(page: Page) {
  const origin = new URL(page.url());
  if (!["localhost", "127.0.0.1"].includes(origin.hostname)) throw new Error("El fixture de Nutrición solo se crea en localhost");
  const outgoing = page.waitForRequest((entry) => new URL(entry.url()).pathname === "/api/v1/nutrition/inbox" && !!entry.headers().authorization);
  await page.goto("/nutrition");
  const headers = (await outgoing).headers();
  const stamp = String(Date.now());
  const firstName = `QA Nutricion Ola5 ${stamp}`;
  const response = await page.request.post(`${origin.origin}/api/v1/patients`, {
    headers: { Authorization: headers.authorization, ...(headers["x-clinic-id"] ? { "X-Clinic-Id": headers["x-clinic-id"] } : {}) },
    data: { firstName, lastName: "Visual", documentNumber: `95${stamp}`, medicalRecordNumber: `NUT-QA-${stamp}`, dateOfBirth: "1982-04-10", gender: "Femenino", phoneCountryCode: "+57", phoneNumber: `300${stamp.slice(-7)}`, status: "Activo" },
  });
  expect(response.status(), "Crear fixture local sin plan por Patients API").toBe(201);
  const patient = await response.json() as { id: string };
  console.log(JSON.stringify({ nutritionQaPatientId: patient.id, search: firstName }));
  return { id: patient.id, search: firstName };
}

test("bandeja HTTP: filtros, búsqueda, paginación y ausencia de N+1", async ({ page }) => {
  await session(page, ["Nutrition.Manage"]);
  const nutritionRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/nutrition/")) nutritionRequests.push(request.url()); });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/nutrition");
  const list = page.getByRole("list", { name: "Planes de pacientes" });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("status")).toContainText("16 pacientes");
  await expect(page.getByRole("link", { name: "Nutrición 3 planes por aprobar", exact: true })).toBeVisible();
  await expect(page.getByText("Vista de demostración", { exact: false })).toHaveCount(0);
  await page.screenshot({ path: "qa-reports/nutrition/desktop.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Colapsar sidebar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Nutrición 3 planes por aprobar", exact: true })).toBeVisible();
  // El indicador de Next dev puede superponerse al botón inferior; validar teclado.
  await page.getByRole("button", { name: "Expandir sidebar", exact: true }).focus();
  await page.keyboard.press("Enter");
  const filters = page.getByRole("group", { name: "Filtrar planes por estado" });
  await expect(filters.locator("button > span:last-child")).toHaveCount(7);
  for (const counter of await filters.locator("button > span:last-child").all()) await expect(counter).toHaveText(/^\d+$/);
  await filters.getByRole("button", { name: /Por aprobar/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(filters.getByRole("button", { name: /Por aprobar/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Buscar paciente", { exact: true }).fill("Maria");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("María Demo");
  await page.getByLabel("Buscar paciente", { exact: true }).fill("zzzz");
  await expect(page.getByText("No encontramos pacientes en esta vista")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(6);
  await filters.getByRole("button", { name: /Sin plan/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Anterior", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await filters.getByRole("button", { name: /Todos/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "qa-reports/nutrition/mobile.png", fullPage: true });
  expect(nutritionRequests.length).toBeGreaterThan(0);
  expect(nutritionRequests.every((url) => new URL(url).pathname === "/api/v1/nutrition/inbox")).toBe(true);
});

test("endpoint ausente y contrato incompatible no producen datos demo", async ({ page }) => {
  await mockNutritionHttp(page, ["Nutrition.Manage"], { unavailable: "/api/v1/nutrition/inbox" });
  await page.goto("/nutrition");
  await expect(page.getByText("El endpoint o recurso de Nutrición no está disponible. No se muestran datos de demostración.", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Planes de pacientes" })).toHaveCount(0);
  await expect(page.getByText("Endpoint pendiente de backend", { exact: true })).toBeVisible();
  await page.unroute("**/api/**");
  await mockNutritionHttp(page, ["Nutrition.Manage"], { malformedQueue: true });
  await page.reload();
  await expect(page.getByText("La respuesta de Nutrición no coincide con el contrato esperado. No se muestran datos incompletos.", { exact: true })).toBeVisible();
});

test("conflicto de revisión bloquea reenvío y exige recarga", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page, ["Nutrition.Manage", "Nutrition.Approve"], { conflictOnce: true });
  await page.goto("/nutrition/demo-patient-1");
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /Revisé personalmente/ }).check();
  await dialog.getByRole("button", { name: "Aprobar y publicar", exact: true }).click();
  await expect(dialog.getByText("El plan cambió en el servidor. Recarga la ficha antes de continuar.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Aprobar y publicar", exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1);
  expect(writes[0].body).not.toHaveProperty("actor");
  await expect(dialog.getByText("Revisión obsoleta", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Recargar ficha", exact: true }).click();
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  await dialog.getByRole("checkbox", { name: /Revisé personalmente/ }).check();
  await dialog.getByRole("button", { name: "Aprobar y publicar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toHaveLength(2);
  expect(writes[1].body.revision).toBe(Number(writes[0].body.revision) + 1);
});

test.describe("E1 sin plan provisional", () => {
  const live = process.env.NUTRITION_E2E_MODE === "live";
  test.use({ storageState: live ? process.env.NUTRITION_E2E_STORAGE_STATE : undefined });
  test("buscar, generar, revisar y aprobar con críticas confirmadas", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    testInfo.annotations.push({ type: "api-mode", description: live ? "API local real, sin interceptaciones" : "HTTP simulado: backend local no disponible" });
    const required = (key: string) => { const value = process.env[key]; if (!value) throw new Error(`Configura ${key} para E1 real; no se inventan datos clínicos.`); return value; };
    if (live && !process.env.NUTRITION_E2E_STORAGE_STATE) await loginAsAdmin(page);
    const localPatient = live && process.env.NUTRITION_E2E_CREATE_PATIENT === "1" ? await createLocalNutritionPatient(page) : null;
    const capture = async (stage: string, focus?: ReturnType<Page["locator"]>) => {
      if (!live || !process.env.NUTRITION_E2E_SCREENSHOTS) return;
      const directory = process.env.NUTRITION_E2E_SCREENSHOTS;
      await mkdir(directory, { recursive: true });
      for (const mobile of [false, true]) {
        await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
        if (focus) await focus.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector("main")!.scrollWidth <= document.querySelector("main")!.clientWidth)).toBe(true);
        await page.screenshot({ path: path.join(directory, `${stage}${mobile ? "-mobile" : ""}.png`), animations: "disabled" });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    };
    const fixture = live ? null : await mockNutritionHttp(page, ["Nutrition.Manage", "Nutrition.Approve"], { includeE1: true });
    const patientId = live ? localPatient?.id ?? required("NUTRITION_E2E_PATIENT_ID") : nutritionE1PatientId;
    const search = live ? localPatient?.search ?? required("NUTRITION_E2E_SEARCH") : "Paciente E1";
    if (!live) await page.setViewportSize({ width: 1366, height: 768 });
    const firstQueue = live ? page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/nutrition/inbox" && !url.searchParams.has("state");
    }) : null;
    await page.goto("/nutrition");
    if (firstQueue) expect((await firstQueue).status(), "E1 requiere GET /api/v1/nutrition/inbox disponible en backend local").toBe(200);
    await page.getByLabel("Buscar paciente", { exact: true }).fill(search);
    await page.getByRole("group", { name: "Filtrar planes por estado" }).getByRole("button", { name: /Sin plan/ }).click();
    const patientLink = page.locator(`a[href="/nutrition/${encodeURIComponent(patientId)}"]`);
    await expect(page.getByRole("listitem").filter({ has: patientLink }).locator('[data-status="sin_plan"]')).toBeVisible();
    await capture("bandeja", page.getByRole("heading", { name: "Nutricionista", exact: true }));
    await patientLink.click();
    await expect(page.getByRole("heading", { name: "Lecturas", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Plan de 30 días editar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Este paciente aún no tiene plan", exact: true })).toBeVisible();
    // El DTO de prescripción no incluye número de tests: verificar0/9 en el seed real.
    await capture("ficha", page.locator("main h1"));
    await page.getByLabel("Peso (kg)", { exact: true }).fill(live ? required("NUTRITION_E2E_WEIGHT") : "92");
    await page.getByLabel("Talla (cm)", { exact: true }).fill(live ? required("NUTRITION_E2E_HEIGHT") : "160");
    await page.getByLabel("Fecha de nacimiento", { exact: true }).fill(live ? required("NUTRITION_E2E_BIRTH_DATE") : "1982-04-10");
    await page.getByLabel("Sexo", { exact: true }).selectOption(live ? required("NUTRITION_E2E_SEX") : "female");
    if (!live) {
      await page.screenshot({ path: "qa-reports/nutrition/wave3-e1-generation-desktop.png", animations: "disabled" });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.querySelector("main")!.scrollWidth <= document.querySelector("main")!.clientWidth)).toBe(true);
      await page.screenshot({ path: "qa-reports/nutrition/wave3-e1-generation-mobile.png", animations: "disabled" });
    }
    const generationResponse = live ? page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/v1/nutrition/patients/${encodeURIComponent(patientId)}/prescriptions`, { timeout: 125_000 }) : null;
    await page.getByRole("button", { name: "Generar propuesta con IA", exact: true }).click();
    if (generationResponse) expect((await generationResponse).status(), "Generación real de la prescripción").toBe(201);
    await page.getByRole("tab", { name: "Resultados y ciclos", exact: true }).click();
    await expect(page.getByText("Plan provisional", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Plan de 30 días editar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Menú de 30 días", exact: true })).toBeVisible();
    await expect(page.getByLabel(/Gramos de/).first()).toBeVisible();
    await capture("editor", page.getByRole("heading", { name: "Menú de 30 días", exact: true }));
    await page.getByRole("button", { name: "Enviar a aprobación", exact: true }).click();
    await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Aprobar y publicar", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("checkbox", { name: /Revisé personalmente/ })).not.toBeChecked();
    await capture("aprobacion", dialog);
    await dialog.getByRole("checkbox", { name: /Revisé personalmente/ }).check();
    await dialog.getByRole("button", { name: "Aprobar y publicar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".nutrition-detail-header").getByText("Aprobado", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".nutrition-detail-header").getByText("Aprobado", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Resultados y ciclos", exact: true }).click();
    await expect(page.getByText("Versión publicada: v1", { exact: true })).toBeVisible();
    if (fixture) {
      const generated = fixture.writes.find((write) => write.path.endsWith("/prescriptions"));
      expect(generated?.body).toMatchObject({ birthDate: "1982-04-10", manual: { peso: 92, talla: 160, sexo: "F" } });
      const approved = fixture.writes.find((write) => write.path.endsWith("/approve"));
      expect(approved?.body.criticalConfirmed).toBe(true);
      expect(approved?.body).not.toHaveProperty("actor");
    }
  });
});

test("Nutrition.Approve basta y los textos cambian a inglés", async ({ page }) => {
  await session(page, ["Nutrition.Approve"], true);
  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "Nutritionist", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Patient plans" }).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("button", { name: /AI drafts/ })).toBeVisible();
});

test("sin permisos Nutrition no hay bandeja, enlace ni peticiones de datos", async ({ page }) => {
  await session(page, ["Wellness.View"]);
  await page.goto("/nutrition");
  await expect(page.getByText("Acceso denegado", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Planes de pacientes" })).toHaveCount(0);
  await expect(page.locator('a[href="/nutrition"]')).toHaveCount(0);
});

test("gateway local enruta prescripciones aunque su health esté degradado", async ({ page, request }, testInfo) => {
  test.skip(process.env.NUTRITION_E2E_MODE !== "live", "Sonda real local; no utiliza fixtures HTTP");
  await loginAsAdmin(page);
  const outgoing = page.waitForRequest((entry) => new URL(entry.url()).pathname === "/api/v1/nutrition/inbox");
  await page.goto("/nutrition");
  const authorization = (await outgoing).headers().authorization;
  expect(authorization).toBeTruthy();
  const patientId = process.env.NUTRITION_E2E_PATIENT_ID;
  if (!patientId) throw new Error("Configura NUTRITION_E2E_PATIENT_ID para la sonda local");
  const resource = `/api/v1/nutrition/patients/${encodeURIComponent(patientId)}/prescriptions`;
  const headers = { Authorization: authorization };
  const direct = await request.get(`http://localhost:5122${resource}`, { headers });
  const gateway = await request.get(`http://localhost:5080${resource}`, { headers });
  const health = await request.get("http://localhost:5080/health");
  const evidence = { resource, direct: direct.status(), gateway: gateway.status(), healthStatus: health.status(), health: await health.json() };
  await testInfo.attach("gateway-local-sin-credenciales", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
  console.log(JSON.stringify(evidence));
  expect(direct.status()).toBe(200);
  expect(gateway.status()).toBe(200);
  expect(Array.isArray(await gateway.json())).toBe(true);
});
