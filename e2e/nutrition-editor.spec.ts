import { test, expect, type Page } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";

async function demoSession(page: Page, permissions = ["Nutrition.Manage", "Nutrition.Approve"], english = false) {
  return mockNutritionHttp(page, permissions, { english });
}

async function saved(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: "Todos los cambios guardados" })).toHaveText("Todos los cambios guardados");
}

test("editar, previsualizar catálogo, copiar 30 días y conservar al volver", async ({ page }) => {
  const { writes } = await demoSession(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByRole("heading", { name: "Carlos Demo", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plan provisional", exact: true })).toBeVisible();
  const action = page.getByRole("button", { name: "Enviar a aprobación", exact: true });
  const contrast = () => action.evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const foreground = luminance(style.color); const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.screenshot({ path: "qa-reports/nutrition/wave2-profile-desktop.png", animations: "disabled" });
  const grams = page.getByLabel("Gramos de Avena demo", { exact: true });
  await grams.fill("80");
  await saved(page);
  const firstSave = writes.find((write) => write.path.endsWith("/save"));
  expect(firstSave?.body.edit).not.toHaveProperty("targets");
  await page.getByLabel("Agregar alimento a Desayuno", { exact: true }).click();
  const picker = page.getByRole("dialog");
  await picker.getByLabel("Alimento", { exact: true }).selectOption("food-avocado");
  await picker.getByLabel("Cantidad en gramos", { exact: true }).fill("80");
  await expect(picker.getByText("140 kcal", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Agregar al menú", exact: true }).click();
  await expect(page.getByLabel("Gramos de Aguacate demo", { exact: true }).first()).toHaveValue("80");
  await page.getByLabel("Quitar Aguacate demo de Desayuno", { exact: true }).click();
  await page.getByRole("button", { name: "Aplicar este día a los 30 días", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Día 30", exact: true }).click();
  await expect(grams).toHaveValue("50");
  await page.getByRole("button", { name: "Día 1", exact: true }).click();
  await expect(grams).toHaveValue("80");
  await page.getByRole("button", { name: "Aplicar este día a los 30 días", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar copia a 30 días", exact: true }).click();
  await expect.poll(() => writes.filter((write) => write.path.endsWith("/apply-day")).length).toBe(1);
  expect(writes.find((write) => write.path.endsWith("/apply-day"))?.body).toMatchObject({ edit: { sourceDay: 1, confirmManualEdits: true } });
  await page.getByRole("button", { name: "Día 30", exact: true }).click();
  await expect(grams).toHaveValue("80");
  await page.getByLabel("Indicaciones del plan", { exact: true }).fill("Indicaciones editadas en demo");
  await saved(page);
  await page.getByRole("link", { name: "Volver a la bandeja", exact: true }).click();
  await page.getByRole("link", { name: "Carlos Demo", exact: true }).click();
  await expect(page.getByLabel("Indicaciones del plan", { exact: true })).toHaveValue("Indicaciones editadas en demo");
  await expect(grams).toHaveValue("80");
  await page.getByRole("heading", { name: "Menú de 30 días", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "qa-reports/nutrition/wave2-editor-desktop.png", animations: "disabled" });
  await page.getByRole("heading", { name: "Desayuno", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "qa-reports/nutrition/wave2-meal-desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Menú de 30 días", exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.querySelector("main")!.scrollWidth <= document.querySelector("main")!.clientWidth)).toBe(true);
  await page.screenshot({ path: "qa-reports/nutrition/wave2-editor-mobile.png", animations: "disabled" });
  await page.getByRole("heading", { name: "Desayuno", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "qa-reports/nutrition/wave2-meal-mobile.png", animations: "disabled" });
});

test("aprobar exige críticas; registra autoaprobación y actualiza bandeja", async ({ page }) => {
  await demoSession(page);
  const writes: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/nutrition/")) writes.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition/demo-patient-1");
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Aprobar y publicar", exact: true });
  await expect(dialog.getByRole("heading", { name: "Revisar aprobación del plan", exact: true })).toBeFocused();
  await expect(confirm).toBeDisabled();
  await expect(dialog).toHaveJSProperty("scrollWidth", await dialog.evaluate((element) => element.clientWidth));
  await page.screenshot({ path: "qa-reports/nutrition/wave2-review-mobile.png", animations: "disabled" });
  await dialog.getByRole("checkbox", { name: "Revisé personalmente las 2 alertas críticas de este plan.", exact: true }).check();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Auto-aprobado", { exact: true })).toHaveCount(2);
  await expect(page.getByText("2 alertas críticas confirmadas", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver a la bandeja", exact: true }).click();
  const maria = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "María Demo", exact: true }) });
  await expect(maria.getByText("Aprobado", { exact: true })).toBeVisible();
  expect(writes.some((path) => path.endsWith("/approve"))).toBe(true);
});

test("devolver exige comentario no vacío y lo conserva en ficha y bitácora", async ({ page }) => {
  await demoSession(page);
  await page.goto("/nutrition/demo-patient-7");
  await page.getByRole("button", { name: "Devolver con comentario", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmar devolución", exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motivo de devolución (obligatorio)", { exact: true }).fill("   ");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motivo de devolución (obligatorio)", { exact: true }).fill("Revisar la distribución de comidas");
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Devuelto", { exact: true })).toBeVisible();
  await expect(page.getByText("Revisar la distribución de comidas", { exact: true })).toHaveCount(2);
});

test("nueva versión conserva la publicada y bloquea aprobación con comida vacía", async ({ page }) => {
  const { writes } = await demoSession(page);
  await page.goto("/nutrition/demo-patient-4");
  await expect(page.getByLabel("Indicaciones del plan", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Crear nueva versión", exact: true }).click();
  await expect(page.getByText("Versión 2", { exact: true })).toBeVisible();
  await page.getByLabel("Indicaciones del plan", { exact: true }).fill("Borrador v2 sin publicar");
  await saved(page);
  const versionWrite = writes.find((write) => write.path.endsWith("/create-version"))!;
  const draftWrite = writes.find((write) => write.path.endsWith("/save"))!;
  expect(draftWrite.body.revision).toBe(1);
  expect(draftWrite.path.split("/").at(-2)).not.toBe(versionWrite.path.split("/").at(-2));
  await page.getByText("Ver versión publicada", { exact: true }).click();
  await expect(page.getByText("Indicaciones sintéticas para revisar y ajustar en la demostración.", { exact: true })).toBeVisible();
  await expect(page.getByText("Versión publicada: v1", { exact: true })).toBeVisible();
  await page.getByLabel("Quitar Avena demo de Desayuno", { exact: true }).click();
  await page.getByLabel("Quitar Yogur demo de Desayuno", { exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No se guardaron los últimos cambios.");
  await expect(page.getByText("Comida vacía", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar a aprobación", exact: true })).toBeDisabled();
});

test("permisos separados, inglés y paciente desconocido sin datos fabricados", async ({ page }) => {
  await demoSession(page, ["Nutrition.Approve"], true);
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByRole("heading", { name: "Clinical profile", exact: true })).toBeVisible();
  await expect(page.getByLabel("Grams of Avena demo", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Submit for approval", exact: true })).toHaveCount(0);
  await page.goto("/nutrition/unknown-patient");
  await expect(page.getByText("The Nutrition endpoint or resource is unavailable. No demo data is shown.", { exact: true })).toBeVisible();
});

test("cambiar metas exige regenerar antes de revisión y aprobación", async ({ page }) => {
  await demoSession(page);
  await page.goto("/nutrition/demo-patient-2");
  await page.getByText("Editar metas del borrador", { exact: true }).click();
  await page.locator("#target-kcal").fill("1800");
  await page.getByRole("button", { name: "Guardar metas", exact: true }).click();
  await saved(page);
  await expect(page.getByRole("button", { name: "Enviar a aprobación", exact: true })).toBeDisabled();
  await expect(page.getByText("Menús desactualizados: las metas cambiaron.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Regenerar propuesta", exact: true }).click();
  await expect(page.getByText("Menús desactualizados: las metas cambiaron.", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Enviar a aprobación", exact: true }).click();
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  await page.getByRole("button", { name: "Aprobar y publicar", exact: true }).click();
  await expect(page.getByText("Auto-aprobado", { exact: true })).toHaveCount(2);
});

test("Manage permite editar pero no aprobar ni devolver", async ({ page }) => {
  await demoSession(page, ["Nutrition.Manage"]);
  await page.goto("/nutrition/demo-patient-1");
  await expect(page.getByRole("heading", { name: "María Demo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar plan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Devolver con comentario", exact: true })).toHaveCount(0);
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByLabel("Gramos de Avena demo", { exact: true })).toBeEnabled();
});

test("agua nullable del contrato se conserva sin inventar cero", async ({ page }) => {
  const { store } = await mockNutritionHttp(page, ["Nutrition.Manage"], { nullableWater: true });
  await page.goto("/nutrition/demo-patient-2");
  await expect(page.getByLabel("Agua (vasos)", { exact: true }).first()).toHaveValue("");
  await expect(page.getByRole("progressbar", { name: "Agua respecto a la meta", exact: true })).toHaveCount(0);
  await page.getByLabel("Indicaciones del plan", { exact: true }).fill("Agua pendiente de registrar");
  await saved(page);
  expect(store.get("demo-patient-2")!.cycle!.meals[0].waterGlasses).toBeNull();
});

test("demografía inaccesible no bloquea una ficha autorizada por Nutrición", async ({ page }) => {
  for (const identityStatus of [403, 404] as const) {
    await page.unroute("**/api/**");
    await mockNutritionHttp(page, ["Nutrition.Manage"], { identityStatus });
    await page.goto("/nutrition/demo-patient-2");
    await expect(page.getByRole("heading", { name: "demo-patient-2", exact: true })).toBeVisible();
    await expect(page.getByText("Demografía fuera de alcance", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Gramos de Avena demo", { exact: true })).toBeEnabled();
    await page.getByLabel("Indicaciones del plan", { exact: true }).fill("Edición con permiso Nutrition.Manage");
    await saved(page);
  }
});

test("revisión sin fechas, autor legible, acciones fijas y consentimiento nuevo al reabrir", async ({ page }) => {
  const { store } = await demoSession(page);
  const cycle = store.get("demo-patient-1")!.cycle!;
  cycle.startDate = null; cycle.endDate = null;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/nutrition/demo-patient-1");
  const validity = page.locator('[aria-labelledby="nutrition-targets-title"] > p');
  await expect(validity).toContainText("Sin definir");
  await expect(validity).not.toContainText("→");
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const date = dialog.getByText("Vigencia del ciclo", { exact: true }).locator("..");
  await expect(date.getByText("Sin definir", { exact: true })).toHaveCount(2);
  await expect(date).not.toContainText("→");
  await expect(dialog.getByText("Nutricionista actual", { exact: true })).toBeVisible();
  const checkbox = dialog.getByRole("checkbox", { name: /Revisé personalmente/ });
  const confirm = dialog.getByRole("button", { name: "Aprobar y publicar", exact: true });
  await expect(checkbox).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  const before = await confirm.boundingBox();
  expect(before).not.toBeNull();
  expect(before!.y).toBeGreaterThanOrEqual(0);
  expect(before!.y + before!.height).toBeLessThanOrEqual(900);
  await checkbox.check();
  await expect(confirm).toBeEnabled();
  const after = await confirm.boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 0);
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  cycle.createdBy = "00000000-0000-4000-8000-000000000042";
  await page.reload();
  await page.getByRole("button", { name: "Aprobar plan", exact: true }).click();
  await expect(dialog.getByText("Nutricionista externo", { exact: true })).toBeVisible();
  await expect(dialog).not.toContainText(cycle.createdBy);
});

test("contraste AA del chip IA y exceso ámbar en valores del editor", async ({ page }) => {
  await demoSession(page);
  await page.goto("/nutrition");
  const ai = page.getByRole("button", { name: /Borradores IA/ });
  const contrast = () => ai.evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const a = luminance(style.color), b = luminance(style.backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.goto("/nutrition/demo-patient-2");
  const grams = page.getByLabel("Gramos de Avena demo", { exact: true });
  await expect(grams).toHaveCSS("font-family", /Plex.*Mono/i);
  await grams.fill("1000");
  await saved(page);
  const over = page.locator('[data-over-target="true"]').first();
  await expect(over).toBeVisible();
  const color = await over.locator("dd").evaluate((element) => getComputedStyle(element).color);
  const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  expect(r).toBeGreaterThan(g); expect(g).toBeGreaterThan(b);
  await expect(over.locator("p")).toContainText("sobre la meta");
});
