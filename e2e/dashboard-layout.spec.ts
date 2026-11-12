import { expect, test, type Page } from "@playwright/test";
import { openDashboard } from "./fixtures/dashboard-http";
function panel(page: Page, name: string) {
  return page.getByRole("heading", { name, exact: true }).locator("../../..");
}

test("dashboard uses compact metrics and a chart-led hierarchy", async ({
  page,
}) => {
  await openDashboard(page);
  const metrics = page.getByRole("region", {
    name: "Indicadores clave",
    exact: true,
  });
  for (const box of await metrics.locator(":scope > *").all())
    expect((await box.boundingBox())!.height).toBeLessThanOrEqual(104);
  const activity = (await panel(page, "Actividad (30 días)").boundingBox())!;
  const usage = (await panel(page, "Uso de agentes").boundingBox())!;
  const growth = (await panel(page, "Crecimiento").boundingBox())!;
  expect(Math.abs(activity.y - usage.y)).toBeLessThan(1);
  expect(usage.x).toBeGreaterThan(activity.x + activity.width);
  expect(growth.width).toBeGreaterThan(activity.width + 100);
  await expect(
    page.getByText("Pacientes nuevos (6 meses)", { exact: true }),
  ).toBeVisible();
  if (process.env.DASHBOARD_DESIGN_CAPTURE_DIR) {
    for (const [name, width] of [
      ["desktop", 1440],
      ["mobile", 390],
    ] as const) {
      await page.setViewportSize({ width, height: 1000 });
      const height = await page
        .locator("main")
        .evaluate((el) => el.scrollHeight);
      await page.setViewportSize({ width, height: Math.ceil(height + 72) });
      await page.locator("main").evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({
        path: `${process.env.DASHBOARD_DESIGN_CAPTURE_DIR}/${name}.png`,
        animations: "disabled",
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Modo oscuro", exact: true })
      .click();
    const height = await page.locator("main").evaluate((el) => el.scrollHeight);
    await page.setViewportSize({ width: 1440, height: Math.ceil(height + 72) });
    await page.locator("main").evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: `${process.env.DASHBOARD_DESIGN_CAPTURE_DIR}/dark.png`,
      animations: "disabled",
    });
  }
});
test("refresh reads new dashboard values without hiding the current charts", async ({
  page,
}) => {
  await openDashboard(page);
  let reads = 0;
  await page.route("**/api/v1/dashboard/kpis?**", async (route) => {
    reads++;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalPatients: 1350,
        newPatients30d: 20,
        healthTests30d: 22,
        inventoryEntries30d: 5,
        inventoryExits30d: 4,
        programTasks30d: 0,
        activitySeries30d: [
          {
            date: "Nov 11",
            newPatients: 20,
            tests: 22,
            entries: 5,
            exits: 4,
            programTasks: 0,
          },
        ],
      }),
    });
  });
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Actualizar|Actualizando/ }),
  ).toBeDisabled();
  await expect(page.locator('[data-slot="activity-plot"]')).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Indicadores clave", exact: true }),
  ).toContainText("1.350");
  await expect(
    page.getByRole("button", { name: "Actualizar", exact: true }),
  ).toBeEnabled();
  expect(reads).toBe(1);
});
test("shortcuts are a compact row and retain the existing destinations", async ({
  page,
}) => {
  await openDashboard(page);
  const shortcuts = panel(page, "Acciones rápidas");
  expect((await shortcuts.boundingBox())!.height).toBeLessThan(120);
  for (const [name, href] of [
    ["Crear usuario", "/users?action=create"],
    ["Crear agente", "/agents?action=create"],
    ["Administrar roles", "/roles"],
    ["Ver auditoría", "/settings/audit"],
  ])
    await expect(
      shortcuts.getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
});
test("dashboard composition adapts to the sidebar and to phone widths", async ({
  page,
}) => {
  await openDashboard(page);
  for (const width of [1440, 1280, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width >= 1024) await page.locator("aside").hover();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector("main")!.scrollWidth <=
            document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Actualizar", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole("heading", { name: "Resumen", exact: true })
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    if (width < 600) {
      const a = (await panel(page, "Actividad (30 días)").boundingBox())!,
        u = (await panel(page, "Uso de agentes").boundingBox())!;
      expect(u.y).toBeGreaterThanOrEqual(a.y + a.height);
    }
    if (width >= 1024) await page.mouse.move(width - 20, 150);
  }
});

test("primary panels align at the bottom without empty space below the ranking", async ({
  page,
}) => {
  for (const agentCount of [5, 6]) {
    await openDashboard(page, { agentCount });
    const activity = (await panel(page, "Actividad (30 días)").boundingBox())!;
    const usage = panel(page, "Uso de agentes");
    const box = (await usage.boundingBox())!;
    expect(
      Math.abs(activity.y + activity.height - box.y - box.height),
    ).toBeLessThan(1);
    const last = (await usage.getByRole("meter").last().boundingBox())!;
    expect(box.y + box.height - last.y - last.height).toBeLessThan(24);
    if (process.env.DASHBOARD_GAP_CAPTURE_DIR)
      await panel(page, "Actividad (30 días)")
        .locator("..")
        .screenshot({
          path: `${process.env.DASHBOARD_GAP_CAPTURE_DIR}/row-${agentCount}.png`,
          animations: "disabled",
        });
  }
});
