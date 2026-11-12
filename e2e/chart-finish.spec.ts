import { expect, test } from "@playwright/test";
import { mockChartsMapsHttp, analytics } from "./fixtures/charts-maps-http";
import { openDashboard } from "./fixtures/dashboard-http";
const card = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("heading", { name, exact: true }).locator("../../..");
test("hourly bars use the dashboard bright-to-deep gradient, including in dark mode", async ({
  page,
  context,
}) => {
  const reference = await context.newPage();
  await openDashboard(reference);
  const colours = await reference
    .locator('[data-slot="activity-bar"]')
    .first()
    .evaluate((el) =>
      getComputedStyle(el).backgroundImage.match(/rgb\([^)]+\)/g),
    );
  expect(colours).toHaveLength(2);
  await reference.close();
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const bar = card(page, "Franjas de mayor demanda")
    .locator(".recharts-bar-rectangle path")
    .first();
  await expect(bar).toBeVisible();
  const paint = () =>
    bar.evaluate((el) => {
      const fill = getComputedStyle(el).fill;
      const id = fill.match(/#([^)"]+)/)?.[1];
      const gradient = id ? document.getElementById(id) : null;
      return {
        fill,
        stops: gradient
          ? [...gradient.querySelectorAll("stop")].map(
              (s) => getComputedStyle(s).stopColor,
            )
          : [],
      };
    });
  await expect.poll(async () => (await paint()).stops).toEqual(colours);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect.poll(async () => (await paint()).stops).toEqual(colours);
});
test("professional bars remain readable with twelve professionals", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.route("**/api/v1/telemedicine/admin/analytics?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...analytics,
        professionalActivity: Array.from({ length: 12 }, (_, i) => ({
          professionalId: `qa-${i}`,
          professionalName: `Profesional ${i + 1}`,
          total: 12,
          completed: 6,
          cancelled: 0,
          uniquePatients: 12,
        })),
      }),
    }),
  );
  await page.goto("/appointments/admin");
  const chart = card(page, "Actividad por profesional");
  const bars = chart.locator(".recharts-bar-rectangle path");
  await expect(bars).toHaveCount(24);
  await expect
    .poll(async () =>
      Math.min(
        ...(await bars.evaluateAll((nodes) =>
          nodes.map((el) => el.getBoundingClientRect().height),
        )),
      ),
    )
    .toBeGreaterThanOrEqual(10);
  await chart.scrollIntoViewIfNeeded();
  await expect(
    chart.getByText("Completadas", { exact: true }),
  ).toBeInViewport();
  const plot = chart.locator('[data-slot="professional-plot"]');
  await expect(plot).toHaveAttribute("tabindex", "0");
  expect(await plot.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
});
test("map shading and its legend use the same bright-to-deep paint", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const chart = card(page, "Mapa de calor — Citas");
  const state = chart.locator('g[aria-label^="California:"] path');
  await expect(state).toBeVisible();
  const stops = await state.evaluate((el) => {
    const id = getComputedStyle(el).fill.match(/#([^)"]+)/)?.[1];
    const gradient = id ? document.getElementById(id) : null;
    return gradient
      ? [...gradient.querySelectorAll("stop")].map(
          (s) => getComputedStyle(s).stopColor,
        )
      : [];
  });
  expect(stops).toHaveLength(2);
  expect(stops[0]).not.toBe(stops[1]);
  const legend = await chart
    .locator("span.size-3\\.5")
    .last()
    .evaluate((el) =>
      getComputedStyle(el).backgroundImage.match(/rgb\([^)]+\)/g),
    );
  expect(legend).toEqual(stops);
});
