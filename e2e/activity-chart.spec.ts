import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { mockPatientsHttp } from "./fixtures/patients-http";

const values = [
  8, 0, 0, 1, 0, 2, 0, 3, 0, 0, 0, 0, 12, 9, 4, 10, 0, 1, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 1,
];
async function dashboard(page: Page, series = values, english = false) {
  await mockPatientsHttp(page, { english });
  await page.route("**/api/v1/dashboard/kpis?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalPatients: 14,
        newPatients30d: 0,
        healthTests30d: 0,
        inventoryEntries30d: 0,
        inventoryExits30d: 0,
        programTasks30d: series.reduce((a, b) => a + b, 0),
        activitySeries30d: series.map((value, index) => ({
          date: `Nov ${index + 1}`,
          newPatients: 0,
          tests: 0,
          entries: 0,
          exits: 0,
          programTasks: value,
        })),
      }),
    }),
  );
  await page.route("**/api/v1/agents**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().url().includes("/executions")
          ? { items: [], total: 0 }
          : [],
      ),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", {
      name: english ? "Activity (30 days)" : "Actividad (30 días)",
      exact: true,
    }),
  ).toBeVisible();
  // Esperar las entradas del dashboard antes de comparar coordenadas entre lecturas.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) => animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
}
async function capture(page: Page, name: string) {
  if (!process.env.CHART_CAPTURE_DIR) return;
  await mkdir(process.env.CHART_CAPTURE_DIR, { recursive: true });
  const card = page
    .getByRole("heading", {
      name: /Actividad \(30 días\)|Activity \(30 days\)/,
    })
    .locator("../../..");
  await card.screenshot({
    path: `${process.env.CHART_CAPTURE_DIR}/${name}.png`,
    animations: "disabled",
  });
}

test("daily bars share one baseline, real zero and an accurate mean", async ({
  page,
}) => {
  await dashboard(page);
  const plot = page.locator('[data-slot="activity-plot"]');
  const bars = page.locator(".bar-grow-y");
  await expect(bars).toHaveCount(values.length);
  const geometry = await bars.evaluateAll((nodes) =>
    nodes.map((el) => ({
      bottom: el.getBoundingClientRect().bottom,
      height: el.getBoundingClientRect().height,
      color: getComputedStyle(el).backgroundImage,
    })),
  );
  expect(
    Math.max(...geometry.map((x) => x.bottom)) -
      Math.min(...geometry.map((x) => x.bottom)),
  ).toBeLessThan(1);
  for (let i = 0; i < values.length; i++) {
    if (values[i] === 0) expect(geometry[i].height).toBe(0);
    else
      expect(geometry[i].height / values[i]).toBeCloseTo(
        geometry[0].height / values[0],
        1,
      );
  }
  expect(
    new Set(
      geometry.filter((_, index) => values[index] > 0).map((x) => x.color),
    ).size,
  ).toBeGreaterThan(3);
  const bounds = (await plot.boundingBox())!;
  const ticks = page.locator('[data-slot="activity-y-tick"]');
  const scale = Number(await ticks.last().getAttribute("data-value"));
  const top = (await ticks.last().boundingBox())!;
  const zero = (await ticks.first().boundingBox())!;
  expect(Math.abs(top.y + top.height / 2 - bounds.y)).toBeLessThan(1);
  expect(
    Math.abs(zero.y + zero.height / 2 - (bounds.y + bounds.height)),
  ).toBeLessThan(1);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const line = (await page
    .locator('[data-slot="activity-average"]')
    .boundingBox())!;
  expect(
    Math.abs(
      line.y - (bounds.y + bounds.height - (bounds.height * mean) / scale),
    ),
  ).toBeLessThan(1);
  await capture(page, "desktop");
});

test("chart stays aligned after sidebar resize and at phone widths", async ({
  page,
}) => {
  await dashboard(page);
  const rail = page.locator("aside");
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width >= 1024) await rail.hover();
    const plot = page.locator('[data-slot="activity-plot"]');
    await expect(plot).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector("main")!.scrollWidth <=
            document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
    const bottoms = await page
      .locator('[data-slot="activity-bar"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().bottom),
      );
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThan(1);
    await capture(page, `width-${width}`);
    if (width >= 1024) await page.mouse.move(width - 20, 200);
  }
});

test("daily values remain accessible without the visible data expander", async ({
  page,
}) => {
  await dashboard(page);
  const day = page.getByRole("button", {
    name: "13 nov: 12 registros",
    exact: true,
  });
  await day.focus();
  await expect(page.getByRole("tooltip")).toContainText("12");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(
    page.getByText("Ver datos diarios", { exact: true }),
  ).toHaveCount(0);
  const table = page.getByRole("table", {
    name: "Registros del día",
    exact: true,
  });
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await expect(table.locator("tbody tr").nth(1)).toContainText("0");
});

test("all-zero and empty periods render without fake activity", async ({
  page,
}) => {
  await dashboard(page, Array(30).fill(0));
  await expect(page.locator('[data-slot="activity-bar"]')).toHaveCount(30);
  for (const bar of await page.locator('[data-slot="activity-bar"]').all())
    expect((await bar.boundingBox())!.height).toBe(0);
  await capture(page, "zero");
  await page.unroute("**/api/v1/dashboard/kpis?**");
  await page.route("**/api/v1/dashboard/kpis?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalPatients: 0,
        newPatients30d: 0,
        healthTests30d: 0,
        inventoryEntries30d: 0,
        inventoryExits30d: 0,
        programTasks30d: 0,
        activitySeries30d: [],
      }),
    }),
  );
  await page.reload();
  await expect(
    page.getByText("Sin actividad en el período", { exact: true }),
  ).toBeVisible();
});

test("English labels and dark theme remain readable", async ({ page }) => {
  await dashboard(page, values, true);
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("View daily data", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page
      .getByRole("table", { name: "Daily records", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(30);
  await capture(page, "dark-en");
});
