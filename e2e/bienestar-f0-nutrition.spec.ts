import { test, expect, type Page } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import { profileOverview } from "./fixtures/profile360-http";

test.use({ timezoneId: "Pacific/Kiritimati" });

/** HTTP sintético explícito: comparte plan y metas con la ficha existente. */
async function setup(
  page: Page,
  options: {
    permissions?: string[];
    empty?: boolean;
    english?: boolean;
    ordinal?: boolean;
  } = {},
) {
  const patientId = options.empty ? "demo-patient-6" : "demo-patient-4";
  const http = await mockNutritionHttp(
    page,
    options.permissions ?? ["Program.Profile360View", "Nutrition.View"],
    { english: options.english },
  );
  const patient = http.store.get(patientId)!;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const civil = Date.parse(`${today}T00:00:00Z`);
  const startDate = new Date(civil - 12 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const endDate = new Date(civil + 17 * 86_400_000).toISOString().slice(0, 10);
  if (patient.cycle && patient.publishedCycle) {
    patient.cycle.startDate = patient.publishedCycle.startDate = startDate;
    patient.cycle.endDate = patient.publishedCycle.endDate = endDate;
  }
  await page.route("**/api/v1/program/**", (route) => {
    const overview =
      new URL(route.request().url()).pathname ===
      `/api/v1/program/erp/patients/${patientId}/overview`;
    return route.fulfill({
      status: overview ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(
        overview
          ? {
              ...profileOverview,
              patient_name: patient.patientName,
              enrollment: null,
              currentCycle:
                options.ordinal === false || options.empty
                  ? null
                  : { number: 1, day: 13, of: 30, startDate, endDate },
            }
          : { detail: "Sin datos sintéticos" },
      ),
    });
  });
  const requests: { path: string; method: string }[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/v1/nutrition/"))
      requests.push({ path, method: request.method() });
  });
  const open = async () => {
    await page.goto(`/patients/${patientId}/360`);
    await page
      .getByRole("tab", {
        name: options.english ? "Nutrition" : "Nutrición",
        exact: true,
      })
      .click();
  };
  return { ...http, patientId, patient, requests, open };
}

test("0.8 · ciclo y metas coinciden con la ficha; lectura sin escrituras", async ({
  page,
}) => {
  const http = await setup(page);
  await http.open();
  const card = page.getByRole("region", {
    name: "Nutrición vigente",
    exact: true,
  });
  await expect(card).toBeVisible();
  await expect(
    card.getByText("Ciclo 1 · día 13 de 30", { exact: true }),
  ).toBeVisible();
  await expect(
    card.locator("input, textarea, select, [contenteditable=true]"),
  ).toHaveCount(0);
  const targets = await card.getByRole("definition").allTextContents();
  expect(targets).toHaveLength(6);
  const link = card.getByRole("link", {
    name: "Abrir ficha de Nutrición",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", `/nutrition/${http.patientId}`);
  // Strict Mode puede repetir lecturas; el resumen solo necesita este endpoint.
  const patientReads = http.requests.filter((request) =>
    request.path.includes("/patients/"),
  );
  expect([...new Set(patientReads.map((request) => request.path))]).toEqual([
    `/api/v1/nutrition/patients/${http.patientId}/workspace`,
  ]);
  expect(patientReads.every((request) => request.method === "GET")).toBe(true);
  await link.focus();
  await expect(link).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/nutrition/${http.patientId}$`));
  const workspace = page.getByRole("region", {
    name: "Ficha nutricional",
    exact: true,
  });
  const row = workspace.getByRole("row", { name: /^C1 Versión 1 / });
  await expect(row).toBeVisible();
  for (const value of targets.slice(0, 4))
    await expect(row).toContainText(value.trim());
  await expect(
    workspace.getByRole("button", { name: "Publicar plan", exact: true }),
  ).toHaveCount(0);
  expect(http.writes).toHaveLength(0);
});

test("0.8 · no sustituye el plan vigente por el borrador en revisión", async ({
  page,
}) => {
  const http = await setup(page);
  const published = http.patient.publishedCycle!;
  http.patient.cycle = {
    ...structuredClone(published),
    id: "draft-other-cycle",
    version: 2,
    state: "borrador_ia",
    targets: { ...published.targets, kcal: 9999 },
  };
  await http.open();
  const card = page.getByRole("region", {
    name: "Nutrición vigente",
    exact: true,
  });
  await expect(card.getByRole("definition").first()).toHaveText(
    `${new Intl.NumberFormat("es-CO").format(published.targets.kcal)} kcal`,
  );
  await expect(card).not.toContainText("9.999");
});

test("0.8 · sin plan vigente muestra un estado vacío con acceso a la ficha", async ({
  page,
}) => {
  const http = await setup(page, { empty: true });
  await http.open();
  const card = page.getByRole("region", {
    name: "Nutrición vigente",
    exact: true,
  });
  await expect(card).toContainText(
    "Este paciente no tiene un plan nutricional publicado vigente.",
  );
  await expect(card.getByRole("definition")).toHaveCount(0);
  await expect(card.getByRole("link")).toHaveAttribute(
    "href",
    `/nutrition/${http.patientId}`,
  );
});

test("0.8 · sin lectura de nutrición no consulta el workspace ni ofrece el enlace", async ({
  page,
}) => {
  const http = await setup(page, { permissions: ["Program.Profile360View"] });
  await http.open();
  const panel = page.getByRole("tabpanel", { name: "Nutrición", exact: true });
  await expect(panel).toContainText(
    "No tienes permiso para consultar la nutrición de este paciente.",
  );
  await expect(panel.getByRole("link")).toHaveCount(0);
  expect(http.requests).toHaveLength(0);
});

test("0.8 · 404 de paciente ajeno no muestra metas ni enlace", async ({
  page,
}) => {
  const http = await setup(page);
  await page.route(
    `**/api/v1/nutrition/patients/${http.patientId}/workspace`,
    (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Paciente no encontrado." }),
      }),
  );
  await http.open();
  const panel = page.getByRole("tabpanel", { name: "Nutrición", exact: true });
  await expect(panel.getByRole("alert")).toContainText(
    "No pudimos cargar Nutrición",
  );
  await expect(panel.getByRole("definition")).toHaveCount(0);
  await expect(panel.getByRole("link")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Reintentar", exact: true }),
  ).toBeVisible();
});

test("0.8 · contrato de otro paciente se rechaza sin mostrar su identidad", async ({
  page,
}) => {
  const http = await setup(page);
  await page.route(
    `**/api/v1/nutrition/patients/${http.patientId}/workspace`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          patientId: "otro-paciente",
          patientName: "Nombre que no debe filtrarse",
          currentPublished: null,
          today: "2026-11-13",
        }),
      }),
  );
  await http.open();
  const panel = page.getByRole("tabpanel", { name: "Nutrición", exact: true });
  await expect(panel.getByRole("alert")).toContainText(
    "No pudimos cargar Nutrición",
  );
  await expect(panel).not.toContainText("Nombre que no debe filtrarse");
  await expect(panel.getByRole("definition")).toHaveCount(0);
});

test("0.8 · fallo transitorio permite reintentar", async ({ page }) => {
  const http = await setup(page);
  let failing = true;
  await page.route(
    `**/api/v1/nutrition/patients/${http.patientId}/workspace`,
    (route) =>
      failing
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: "{}",
          })
        : route.fallback(),
  );
  await http.open();
  const retry = page
    .getByRole("tabpanel", { name: "Nutrición", exact: true })
    .getByRole("button", { name: "Reintentar", exact: true });
  await expect(retry).toBeVisible();
  failing = false;
  await retry.click();
  await expect(
    page.getByRole("region", { name: "Nutrición vigente", exact: true }),
  ).toContainText("Ciclo 1 · día 13 de 30");
});

test("0.8 · inglés y compatibilidad sin ordinal de 0.9", async ({ page }) => {
  const http = await setup(page, { english: true, ordinal: false });
  await http.open();
  const card = page.getByRole("region", {
    name: "Current nutrition",
    exact: true,
  });
  await expect(card).toContainText("Day 13 of 30");
  await expect(
    card.getByRole("link", { name: "Open Nutrition workspace", exact: true }),
  ).toHaveAttribute("href", `/nutrition/${http.patientId}`);
});
