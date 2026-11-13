import { test, expect } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import { mkdir } from "node:fs/promises";

test("evidencia sintética de estados y recuperación de carga", async ({ page }) => {
  const directory = "test-results/nutrition-final-states";
  await mkdir(directory, { recursive: true });
  const { store } = await mockNutritionHttp(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [state, patient] of [
    ["borrador-ia", "demo-patient-2"], ["por-aprobar", "demo-patient-1"],
    ["aprobado", "demo-patient-4"], ["sin-plan", "demo-patient-6"],
  ]) {
    if (state === "sin-plan") store.get(patient)!.cycle = null;
    await page.goto(`/nutrition/${patient}?tab=plan`);
    await expect(page.locator(".nutrition-detail-header")).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator("main").evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: `${directory}/${state}-${width}.png`, animations: "disabled" });
    }
  }
  await page.unroute("**/api/**");
  await mockNutritionHttp(page, undefined, { unavailable: "/api/v1/nutrition/inbox" });
  await page.goto("/nutrition");
  await expect(page.locator(".nutrition-module").getByRole("alert")).toHaveCount(1);
  await page.getByText("Detalles del error", { exact: true }).click();
  await page.screenshot({ path: `${directory}/error-390.png`, animations: "disabled" });
  await page.unroute("**/api/**");
  await mockNutritionHttp(page);
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("list", { name: "Planes de pacientes" })).toBeVisible();
});

test("detalle nutricional, foco y contexto en cinco anchos sin escrituras de presentación", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  const grams = page.getByLabel("Gramos de Avena demo", { exact: true });
  await expect(grams).toBeEnabled();
  const original = await grams.inputValue();
  const identity = await grams.elementHandle();
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const row = page.locator(".nutrition-food-row").filter({ has: grams });
    const detail = row.locator("details");
    if (await detail.isVisible()) {
      const summary = detail.locator("summary");
      await summary.focus();
      if (!(await detail.evaluate((element) => (element as HTMLDetailsElement).open))) await summary.press("Enter");
      await expect(detail.locator("dt")).toHaveCount(5);
      await expect(detail.getByText("Carbohidratos", { exact: true })).toBeVisible();
      await expect(summary).toBeFocused();
    } else {
      await expect(row.locator(".nutrition-food-wide dt")).toHaveCount(5);
    }
    await grams.focus();
    await expect(grams).toBeFocused();
    await expect(grams).toHaveValue(original);
    expect(await grams.evaluate((element, previous) => element === previous, identity)).toBe(true);
    const context = page.locator(".nutrition-context-bar");
    await page.locator(".nutrition-meal:visible").getByRole("heading").scrollIntoViewIfNeeded();
    await expect(page.getByLabel("Día del ciclo", { exact: true })).toBeInViewport();
    await expect(context.getByText("Todos los cambios guardados", { exact: true })).toBeInViewport();
    const bounds = await context.boundingBox();
    expect(bounds!.height).toBeLessThanOrEqual(144);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(writes).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("fila en inglés, oscuro y zoom conserva edición y nutrientes", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page, undefined, { english: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const summary = page.getByLabel("View nutrients for Avena demo", { exact: true });
  await summary.click();
  const detail = page.locator("details").filter({ has: summary });
  await expect(detail.getByText("Carbohydrates", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 780, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await expect(detail.getByText("Fiber", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toHaveLength(0);
});
