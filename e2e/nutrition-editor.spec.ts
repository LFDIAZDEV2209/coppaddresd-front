import { test, expect, type Page } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";

async function demoSession(
  page: Page,
  permissions = ["Nutrition.Manage", "Nutrition.Approve"],
  english = false,
) {
  return mockNutritionHttp(page, permissions, { english });
}

async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Todos los cambios guardados" }),
  ).toHaveText("Todos los cambios guardados");
}

test("editar, previsualizar catálogo, copiar 30 días y conservar al volver", async ({
  page,
}) => {
  const { writes } = await demoSession(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await expect(
    page.getByRole("heading", { name: "Carlos Demo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Resultados y ciclos", exact: true })
    .click();
  await expect(
    page.getByText("Plan provisional", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Plan de 30 días", exact: true }).click();
  const action = page.getByRole("button", {
    name: "Publicar plan",
    exact: true,
  });
  const contrast = () =>
    action.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await page.screenshot({
    path: "qa-reports/nutrition/wave2-profile-desktop.png",
    animations: "disabled",
  });
  const grams = page.getByLabel("Gramos de Avena demo", { exact: true });
  await grams.fill("80");
  await saved(page);
  const firstSave = writes.find((write) => write.path.endsWith("/save"));
  expect(firstSave?.body.edit).not.toHaveProperty("targets");
  await page.getByLabel("Agregar alimento a Desayuno", { exact: true }).click();
  const picker = page.getByRole("dialog");
  await picker
    .getByLabel("Alimento", { exact: true })
    .selectOption("food-avocado");
  await picker.getByLabel("Cantidad en gramos", { exact: true }).fill("80");
  await expect(picker.getByText("140 kcal", { exact: true })).toBeVisible();
  await picker
    .getByRole("button", { name: "Agregar al menú", exact: true })
    .click();
  await expect(
    page.getByLabel("Gramos de Aguacate demo", { exact: true }).first(),
  ).toHaveValue("80");
  await page
    .getByLabel("Quitar Aguacate demo de Desayuno", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Aplicar este día a los 30 días",
      exact: true,
    })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.getByLabel("Día del ciclo", { exact: true }).selectOption("30");
  await expect(grams).toHaveValue("50");
  await page.getByLabel("Día del ciclo", { exact: true }).selectOption("1");
  await expect(grams).toHaveValue("80");
  await page
    .getByRole("button", {
      name: "Aplicar este día a los 30 días",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirmar copia a 30 días", exact: true })
    .click();
  await expect
    .poll(
      () => writes.filter((write) => write.path.endsWith("/apply-day")).length,
    )
    .toBe(1);
  expect(
    writes.find((write) => write.path.endsWith("/apply-day"))?.body,
  ).toMatchObject({ edit: { sourceDay: 1, confirmManualEdits: true } });
  await page.getByLabel("Día del ciclo", { exact: true }).selectOption("30");
  await expect(grams).toHaveValue("80");
  await page
    .getByLabel("Indicaciones del plan", { exact: true })
    .fill("Indicaciones editadas en demo");
  await saved(page);
  await page
    .getByRole("button", { name: "Volver a la bandeja", exact: true })
    .click();
  await page.getByRole("link", { name: "Carlos Demo", exact: true }).click();
  await page.getByRole("tab", { name: "Plan de 30 días", exact: true }).click();
  await expect(
    page.getByLabel("Indicaciones del plan", { exact: true }),
  ).toHaveValue("Indicaciones editadas en demo");
  await expect(grams).toHaveValue("80");
  await page
    .getByRole("heading", { name: "Menú de 30 días", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "qa-reports/nutrition/wave2-editor-desktop.png",
    animations: "disabled",
  });
  await page
    .getByRole("heading", { name: "Desayuno", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "qa-reports/nutrition/wave2-meal-desktop.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("heading", { name: "Menú de 30 días", exact: true })
    .scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () =>
        document.querySelector("main")!.scrollWidth <=
        document.querySelector("main")!.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "qa-reports/nutrition/wave2-editor-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("heading", { name: "Desayuno", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "qa-reports/nutrition/wave2-meal-mobile.png",
    animations: "disabled",
  });
});

test("publicar conserva las alertas sin afirmar revisión clínica y actualiza la bandeja", async ({ page }) => {
  const { writes } = await demoSession(page, ["Nutrition.Manage"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nutrition/demo-patient-1");
  await page.getByRole("button", { name: "Publicar plan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".nutrition-header-state")).toContainText("Publicado");
  await page.getByText("Bitácora del plan", { exact: false }).click();
  await expect(page.getByText("Plan publicado", { exact: true })).toBeVisible();
  await expect(page.getByText("2 alertas críticas confirmadas", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Volver a la bandeja", exact: true }).click();
  const maria = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "María Demo", exact: true }) });
  await expect(maria.getByText("Publicado", { exact: true })).toBeVisible();
  expect(writes.some(write => write.path.endsWith("/publish"))).toBe(true);
});

test("devolver exige comentario no vacío y lo conserva en ficha y bitácora", async ({
  page,
}) => {
  await demoSession(page);
  await page.goto("/nutrition/demo-patient-7");
  await page
    .getByRole("button", { name: "Devolver con comentario", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", {
    name: "Confirmar devolución",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await dialog
    .getByLabel("Motivo de devolución (obligatorio)", { exact: true })
    .fill("   ");
  await expect(confirm).toBeDisabled();
  await dialog
    .getByLabel("Motivo de devolución (obligatorio)", { exact: true })
    .fill("Revisar la distribución de comidas");
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .locator(".nutrition-detail-header")
      .getByText("Devuelto", { exact: true }),
  ).toBeVisible();
  await page.getByText("Bitácora del plan", { exact: false }).click();
  await expect(
    page.getByText("Revisar la distribución de comidas", { exact: true }),
  ).toHaveCount(2);
});

test("nueva versión conserva la publicada y bloquea publicación con comida vacía", async ({
  page,
}) => {
  const { writes } = await demoSession(page);
  await page.goto("/nutrition/demo-patient-4?tab=plan");
  await expect(
    page.getByLabel("Indicaciones del plan", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Crear nueva versión", exact: true })
    .click();
  await expect(
    page.getByLabel("Ciclo y versión", { exact: true }),
  ).toContainText("Versión 2");
  await page
    .getByLabel("Indicaciones del plan", { exact: true })
    .fill("Borrador v2 sin publicar");
  await saved(page);
  const versionWrite = writes.find((write) =>
    write.path.endsWith("/create-version"),
  )!;
  const draftWrite = writes.find((write) => write.path.endsWith("/save"))!;
  expect(draftWrite.body.revision).toBe(1);
  expect(draftWrite.path.split("/").at(-2)).not.toBe(
    versionWrite.path.split("/").at(-2),
  );
  await page
    .getByRole("tab", { name: "Resultados y ciclos", exact: true })
    .click();
  await page.getByText("Versión publicada: v1", { exact: true }).click();
  await expect(
    page.getByText(
      "Indicaciones sintéticas para revisar y ajustar en la demostración.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Versión publicada: v1", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Plan de 30 días", exact: true }).click();
  await page
    .getByLabel("Quitar Avena demo de Desayuno", { exact: true })
    .click();
  await page
    .getByLabel("Quitar Yogur demo de Desayuno", { exact: true })
    .click();
  await expect(
    page.locator(".nutrition-detail-toolbar").getByRole("status"),
  ).toContainText("No se guardaron los últimos cambios.");
  await expect(page.getByText("Comida vacía", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publicar plan", exact: true }),
  ).toBeDisabled();
});

test("permisos separados, inglés y paciente desconocido sin datos fabricados", async ({
  page,
}) => {
  await demoSession(page, ["Nutrition.Approve"], true);
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await page
    .getByRole("tab", { name: "Results and cycles", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Readings", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "30-day plan", exact: true }).click();
  await expect(
    page.getByLabel("Grams of Avena demo", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Submit for approval", exact: true }),
  ).toHaveCount(0);
  await page.goto("/nutrition/unknown-patient");
  await expect(
    page.getByText(
      "The Nutrition endpoint or resource is unavailable. No demo data is shown.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("cambiar metas exige regenerar antes de publicar", async ({
  page,
}) => {
  await demoSession(page);
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await page.getByText("Editar metas del borrador", { exact: true }).click();
  await page.locator("#target-kcal").fill("1800");
  await page
    .getByRole("button", { name: "Guardar metas", exact: true })
    .click();
  await saved(page);
  await expect(
    page.getByRole("button", { name: "Publicar plan", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Menús desactualizados: las metas cambiaron.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Regenerar propuesta", exact: true })
    .click();
  await expect(
    page.getByText("Menús desactualizados: las metas cambiaron.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Publicar plan", exact: true })
    .click();
  await expect(page.locator(".nutrition-header-state")).toContainText("Publicado");
});

test("Manage permite editar pero no aprobar ni devolver", async ({ page }) => {
  await demoSession(page, ["Nutrition.Manage"]);
  await page.goto("/nutrition/demo-patient-1");
  await expect(
    page.getByRole("heading", { name: "María Demo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aprobar plan", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Devolver con comentario", exact: true }),
  ).toHaveCount(0);
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await expect(
    page.getByLabel("Gramos de Avena demo", { exact: true }),
  ).toBeEnabled();
});

test("agua nullable del contrato se conserva sin inventar cero", async ({
  page,
}) => {
  const { store } = await mockNutritionHttp(page, ["Nutrition.Manage"], {
    nullableWater: true,
  });
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  await expect(
    page.getByLabel("Agua (vasos)", { exact: true }).first(),
  ).toHaveValue("");
  await expect(
    page.getByRole("progressbar", {
      name: "Agua respecto a la meta",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByLabel("Indicaciones del plan", { exact: true })
    .fill("Agua pendiente de registrar");
  await saved(page);
  expect(store.get("demo-patient-2")!.cycle!.meals[0].waterGlasses).toBeNull();
});

test("demografía inaccesible no bloquea una ficha autorizada por Nutrición", async ({
  page,
}) => {
  // §19: la identidad del workspace alimenta la ficha; la demanda opcional de
  // Patients API desapareció, y aun sin Patients.View la ficha es operable.
  for (const identityStatus of [403, 404] as const) {
    await page.unroute("**/api/**");
    await mockNutritionHttp(page, ["Nutrition.Manage"], { identityStatus });
    await page.goto("/nutrition/demo-patient-2?tab=plan");
    await expect(
      page.getByRole("heading", { name: "Carlos Demo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Demografía fuera de alcance", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Gramos de Avena demo", { exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("Indicaciones del plan", { exact: true })
      .fill("Edición con permiso Nutrition.Manage");
    await saved(page);
  }
});

test("publicación muestra vigencia y aviso sin introducir consentimiento clínico", async ({ page }) => {
  const { store } = await demoSession(page, ["Nutrition.Manage"]);
  const cycle = store.get("demo-patient-1")!.cycle!;
  cycle.startDate = null; cycle.endDate = null;
  await page.goto("/nutrition/demo-patient-1");
  await page.getByRole("tab", { name: "Programación", exact: true }).click();
  const validity = page.getByRole("tabpanel", { name: "Programación", exact: true }).locator(".nutrition-cycle-summary");
  await expect(validity).toContainText("Sin definir");
  await expect(validity).not.toContainText("→");
  await expect(page.getByText("IMPORTANT DISCLAIMER – NUTRITIONAL RECOMMENDATIONS", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publicar plan", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".nutrition-header-state")).toContainText("Publicado");
});

test("contraste AA del chip IA y exceso ámbar en valores del editor", async ({
  page,
}) => {
  await demoSession(page);
  await page.goto("/nutrition");
  // El chip IA vive en las filas de la bandeja; los filtros inactivos son neutros.
  await page.getByRole("combobox", { name: "Estado del plan", exact: true }).selectOption("borrador_ia");
  const ai = page
    .locator(
      '.nutrition-patient-option .nutrition-chip[data-status="borrador_ia"]',
    )
    .first();
  await ai.waitFor({ state: "visible" });
  const contrast = () =>
    ai.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) =>
        color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => {
            const c = n / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
      const a = luminance(style.color),
        b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Modo claro", exact: true }).click();
  await page.goto("/nutrition/demo-patient-2?tab=plan");
  const grams = page.getByLabel("Gramos de Avena demo", { exact: true });
  await expect(grams).toHaveCSS("font-family", /Plex.*Mono/i);
  await grams.fill("1000");
  await saved(page);
  const over = page
    .locator('.nutrition-daily-totals [data-over-target="true"]')
    .first();
  await expect(over).toBeVisible();
  const color = await over
    .locator("dd")
    .evaluate((element) => getComputedStyle(element).color);
  const [r, g, b] = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number);
  expect(r).toBeGreaterThan(g);
  expect(g).toBeGreaterThan(b);
  await expect(over.locator("p")).toContainText("sobre la meta");
});
