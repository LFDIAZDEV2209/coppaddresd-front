import { test, expect } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";

test("la entrada usa el ancho para pacientes y conserva la navegación lista-ficha", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/nutrition");
  const rail = page.getByRole("complementary", { name: "Bandeja de pacientes" });
  await expect(page.getByRole("link", { name: "Carlos Demo", exact: true })).toBeVisible();
  expect((await rail.boundingBox())!.width).toBeGreaterThan(1000);
  await expect(page.locator(".nutrition-directory-columns")).toContainText("Vigencia");
  await page.getByRole("link", { name: "Carlos Demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Carlos Demo", exact: true })).toBeVisible();
  expect((await rail.boundingBox())!.width).toBeLessThan(360);
  await page.getByRole("button", { name: "Volver a la bandeja", exact: true }).click();
  expect((await rail.boundingBox())!.width).toBeGreaterThan(1000);
  expect(writes).toEqual([]);
});

test("el menú da prioridad a alimentos y permite consultar totales y nutrientes", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  const summary = page.locator("details.nutrition-daily-totals");
  await expect(summary).toBeVisible();
  await expect(summary).not.toHaveAttribute("open");
  await expect(summary.locator("summary")).toContainText("kcal");
  await expect(summary.locator("summary")).toContainText("sobre la meta");
  await summary.locator("summary").click();
  await expect(summary.getByLabel("Proteína respecto a la meta")).toBeVisible();
  await summary.locator("summary").click();
  const food = page.locator(".nutrition-food-row").filter({ hasText: "Avena demo" }).first();
  const nutrients = food.locator("details");
  await expect(nutrients).not.toHaveAttribute("open");
  await nutrients.locator("summary").click();
  await expect(nutrients.getByText("Carbohidratos", { exact: true })).toBeVisible();
  await food.getByLabel("Gramos de Avena demo", { exact: true }).fill("80");
  await expect.poll(() => writes.some(write => write.path.endsWith("/save"))).toBe(true);
  await page.getByRole("navigation", { name: "Comidas del día" }).getByRole("button", { name: /Almuerzo/ }).click();
  await expect(page.locator("#meal-almuerzo-title")).toBeVisible();
  await expect(page.locator(".nutrition-meal:visible")).toHaveCount(1);
});

test("el formulario móvil conserva agua legible y no desborda", async ({ page }) => {
  await mockNutritionHttp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  const water = page.getByLabel("Agua (vasos)", { exact: true }).first();
  await expect(water).toHaveValue("2");
  expect((await water.boundingBox())!.width).toBeGreaterThanOrEqual(60);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("la ficha muestra perfil e historial sin acordeones ni aviso legal", async ({ page }) => {
  await mockNutritionHttp(page);
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByRole("heading", { name: "Carlos Demo", exact: true })).toBeVisible();
  await expect(page.getByText("IMPORTANT DISCLAIMER – NUTRITIONAL RECOMMENDATIONS", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Perfil clínico", exact: true })).toBeVisible();
  await expect(page.locator(".nutrition-audit")).toBeAttached();
  await expect(page.locator(".nutrition-audit summary, .nutrition-profile-section summary")).toHaveCount(0);
  await page.goto("/nutrition/demo-patient-2?history=1");
  await expect(page.locator("#nutrition-audit-title")).toBeFocused();
});

test("el resumen de la bandeja filtra pacientes sin escrituras", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  await page.goto("/nutrition");
  const overview = page.getByRole("navigation", { name: "Estado del plan" });
  await overview.getByRole("button", { name: /Sin plan/ }).click();
  await expect(page.locator("#nutrition-state")).toHaveValue("sin_plan");
  await expect(page.getByRole("link", { name: "Diego Demo", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Carlos Demo", exact: true })).toHaveCount(0);
  await overview.getByRole("button", { name: /Todos/ }).click();
  await expect(page.locator("#nutrition-state")).toHaveValue("all");
  await expect(page.getByRole("link", { name: "Carlos Demo", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("los botones muestran una sola comida y conservan los cambios al alternar", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  const nav = page.getByRole("navigation", { name: "Comidas del día" });
  const breakfast = nav.getByRole("button", { name: "Desayuno", exact: true });
  const lunch = nav.getByRole("button", { name: "Almuerzo", exact: true });
  await expect(page.locator(".nutrition-meal:visible")).toHaveCount(1);
  await expect(breakfast).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Gramos de Avena demo", { exact: true }).fill("80");
  await expect.poll(() => writes.filter(write => write.path.endsWith("/save")).length).toBeGreaterThan(0);
  const count = writes.length;
  const totals = await page.locator(".nutrition-daily-totals summary strong").textContent();
  await lunch.click();
  await expect(page.locator(".nutrition-meal:visible")).toHaveCount(1);
  await expect(page.locator("#meal-almuerzo-title")).toBeVisible();
  await expect(lunch).toHaveAttribute("aria-pressed", "true");
  await expect(breakfast).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".nutrition-daily-totals summary strong")).toHaveText(totals!);
  await page.getByLabel("Día del ciclo", { exact: true }).selectOption("2");
  await expect(page.locator("#meal-almuerzo-title")).toBeVisible();
  await page.getByLabel("Día del ciclo", { exact: true }).selectOption("1");
  await breakfast.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Gramos de Avena demo", { exact: true })).toHaveValue("80");
  for (const label of ["Merienda", "Cena", "Desayuno"]) {
    await nav.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(".nutrition-meal:visible")).toHaveCount(1);
    await expect(page.locator(".nutrition-meal:visible").getByRole("heading", { name: label, exact: true })).toBeVisible();
  }
  expect(writes).toHaveLength(count);
});

test("el escritorio ajusta el espacio y no permite desplazarse a un fondo vacío", async ({ page }) => {
  await mockNutritionHttp(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1440, height: 650 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/nutrition");
    await expect(page.getByRole("link", { name: "Carlos Demo", exact: true })).toBeVisible();
    expect(await page.locator("main").evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(2);
    await page.getByRole("link", { name: "Carlos Demo", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Carlos Demo", exact: true })).toBeVisible();
    for (const tab of ["Resultados y ciclos", "Programación", "Plan de 30 días"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      expect(await page.locator("main").evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(2);
      const panel = page.locator(".nutrition-detail-panel");
      expect(await panel.evaluate(element => element.clientHeight)).toBeGreaterThan(300);
      await panel.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await page.locator("main").evaluate(element => element.scrollTop)).toBe(0);
    }
  }
});

test("la bandeja muestra primero los planes publicados antes de paginar", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  await page.goto("/nutrition");
  const list = page.getByRole("list", { name: "Planes de pacientes" });
  await expect(list.getByRole("listitem").first().locator('.nutrition-chip')).toHaveText("Publicado");
  await expect(list.getByRole("link", { name: "Samuel Demo", exact: true })).toBeVisible();
  const firstPage = await list.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href")));
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Paginación de nutrición" }).getByRole("status")).toContainText("Página 2");
  const secondPage = await list.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href")));
  expect(secondPage.some(href => firstPage.includes(href))).toBe(false);
  await page.getByRole("navigation", { name: "Estado del plan" }).getByRole("button", { name: /Sin plan/ }).click();
  await expect(list.getByRole("link", { name: "Diego Demo", exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});


test("publicados primero funciona con el API antiguo, sin perder pacientes al paginar", async ({ page }) => {
  const { store, writes } = await mockNutritionHttp(page, undefined, { legacyInboxOrder: true });
  const requests: string[] = [];
  page.on("request", request => requests.push(new URL(request.url()).pathname));
  const empty = store.get("demo-patient-6")!;
  for (let index = 0; index < 11; index++) {
    const patient = structuredClone(empty);
    patient.patientId = `legacy-empty-${index}`;
    patient.patientName = `AAA sin plan ${index}`;
    store.set(patient.patientId, patient);
  }
  await page.goto("/nutrition");
  const list = page.getByRole("list", { name: "Planes de pacientes" });
  await expect(list.getByRole("listitem").first().locator(".nutrition-chip")).toHaveText("Publicado");
  await expect(list.getByRole("link", { name: "Samuel Demo", exact: true })).toBeVisible();
  const identities: string[] = [];
  for (let number = 1; number <= 3; number++) {
    await expect(page.getByRole("navigation", { name: "Paginación de nutrición" }).getByRole("status")).toContainText(`Página ${number}`);
    identities.push(...await list.getByRole("link").evaluateAll(links => links.map(link => link.getAttribute("href")!)));
    if (number < 3) await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  }
  expect(identities).toHaveLength(store.size);
  expect(new Set(identities).size).toBe(store.size);
  await page.getByRole("searchbox", { name: "Buscar paciente", exact: true }).fill("Samuel");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("link", { name: "Samuel Demo", exact: true })).toBeVisible();
  expect(requests.some(path => path.includes("/nutrition/patients/"))).toBe(false);
  expect(writes).toEqual([]);
});
