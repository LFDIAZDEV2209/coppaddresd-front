import { test, expect, type Page } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import { mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Capturación UX del rediseño de bandeja y ficha (espaciado, selector de ciclo,
 * aviso de copia publicada). El HTML sintético alimenta la app; nada toca prod.
 */
const captures = path.resolve(
  "test-results/nutrition-captures/ux-rail-2026-11-09",
);

async function demo(page: Page) {
  await mockNutritionHttp(page, ["Nutrition.Manage", "Nutrition.Approve"]);
}

test("bandeja compacta conserva siete estados y espacio útil", async ({ page }) => {
  await demo(page);
  await page.goto("/nutrition");
  const state = page.getByRole("combobox", { name: "Estado del plan", exact: true });
  await expect(state.locator("option")).toHaveCount(7);
  await expect(page.locator(".nutrition-patient-option")).toHaveCount(10);
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => ({
      list: document.querySelector(".nutrition-patient-list")!.clientHeight,
      first: document.querySelector(".nutrition-patient-option")!.getBoundingClientRect().top,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(geometry.overflow).toBe(false);
    if (width >= 1024) expect(geometry.list).toBeGreaterThanOrEqual(400);
    if (width === 390) expect(geometry.first).toBeLessThan(450);
  }
  await state.focus();
  await state.press("End");
  await state.press("Enter");
  await expect(state).toHaveValue("sin_plan");
  await expect(page.locator(".nutrition-patient-option")).toHaveCount(2);
});

test("breadcrumb largo cede espacio al buscador sin perder nombre clínico", async ({ page }) => {
  const { store } = await mockNutritionHttp(page);
  const name = "Paciente QA con nombre clínico deliberadamente largo para revisar orientación y búsqueda";
  store.get("demo-patient-2")!.patientName = name;
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  for (const width of [1440, 1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
    await expect(breadcrumb).toContainText(name);
    const bounds = await breadcrumb.boundingBox();
    const search = await page.getByRole("combobox", { name: "Buscar páginas o módulos", exact: true }).boundingBox();
    expect(bounds).not.toBeNull();
    expect(search).not.toBeNull();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(search!.x);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("bandeja: filtros neutros, filas densas y selección visible", async ({
  page,
}) => {
  await demo(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/nutrition");
  const list = page.getByRole("list", { name: "Planes de pacientes" });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await mkdir(captures, { recursive: true });
  await page.screenshot({
    path: path.join(captures, "bandeja-desktop.png"),
    animations: "disabled",
  });
  // Entrar a la ficha y volver: la fila del paciente activo queda a la vista.
  await page.getByRole("link", { name: "María Demo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "María Demo", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".nutrition-patient-option[data-selected='true']"),
  ).toBeInViewport({ ratio: 0.5 });
});

test("ficha: selector de ciclo visible con borrador sobre publicado", async ({
  page,
}) => {
  await demo(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/nutrition");
  // Crear versión sobre un plan aprobado: publicado v1 + borrador v2.
  await page.getByRole("link", { name: "Andrés Demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear nueva versión", exact: true })
    .click();
  const switcher = page.getByLabel("Selector de ciclo y versión");
  await expect(switcher).toBeVisible();
  await expect(switcher.locator("option")).toHaveCount(2);
  await expect(
    page.getByText(/La copia publicada v\d+ sigue vigente/),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(captures, "ficha-switcher-desktop.png"),
    animations: "disabled",
  });
  // Cambiar a la copia publicada recarga el workspace y deja la vista de solo lectura.
  await switcher.locator("select").selectOption({ index: 1 });
  await expect(
    page.getByText("Plan de solo lectura", { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
  await page.screenshot({
    path: path.join(captures, "ficha-publicada-desktop.png"),
    animations: "disabled",
  });
});

test("móvil: ficha y bandeja sin desbordes", async ({ page }) => {
  await demo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(captures, "bandeja-mobile.png"),
    animations: "disabled",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Andrés Demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear nueva versión", exact: true })
    .click();
  await expect(page.getByLabel("Selector de ciclo y versión")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: path.join(captures, "ficha-switcher-mobile.png"),
    animations: "disabled",
  });
});
