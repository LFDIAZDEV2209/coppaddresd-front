import { expect, test, type Locator } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
import { mockPatientsHttp } from "./fixtures/patients-http";
async function contrast(tag: Locator) {
  return tag.evaluate((el) => {
    const s = getComputedStyle(el);
    const rgb = (c: string) =>
      (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (c: number[]) =>
      c
        .map((x) => {
          const v = x / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
    const fg = rgb(s.color),
      bg = rgb(s.backgroundColor),
      a = luminance(fg),
      b = luminance(bg);
    return {
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      fg,
      bg,
      border: parseFloat(s.borderTopWidth),
    };
  });
}

test("summary cards use distinct rainbow accents without changing filters", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/users");
  const cards = page.locator('[data-slot="stat-card"]');
  await expect(cards).toHaveCount(5);
  const colors = await cards.evaluateAll((nodes) =>
    nodes.map((el) => getComputedStyle(el).backgroundColor),
  );
  expect(new Set(colors).size).toBeGreaterThanOrEqual(4);
  await page.getByRole("button", { name: /^Inactivos\b/ }).click();
  await expect(
    page.getByRole("button", { name: /^Inactivos\b/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("active tags have a soft green surface and AA contrast in both themes", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/users");
  const active = page.getByText("Activo", { exact: true });
  await expect(active).toBeVisible();
  let style = await contrast(active);
  expect(style.border).toBeGreaterThanOrEqual(1);
  expect(Math.max(...style.bg)).toBeGreaterThan(220);
  expect(style.fg[1]).toBeGreaterThan(style.fg[0]);
  expect(style.ratio).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  style = await contrast(active);
  expect(style.ratio).toBeGreaterThanOrEqual(4.5);
  expect(style.fg[1]).toBeGreaterThan(style.fg[0]);
});
test("clinical critical tags stay red and readable after the palette change", async ({
  page,
}) => {
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  const risk = page.getByText("Riesgo crítico", { exact: true }).first();
  await expect(risk).toBeVisible();
  let style = await contrast(risk);
  expect(style.ratio).toBeGreaterThanOrEqual(4.5);
  expect(style.fg[0]).toBeGreaterThan(style.fg[1] * 1.1);
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  style = await contrast(risk);
  expect(style.ratio).toBeGreaterThanOrEqual(4.5);
  expect(style.fg[0]).toBeGreaterThan(style.fg[1] * 1.1);
});

test("patient distribution bars use the rainbow palette and keep chart switching", async ({
  page,
}) => {
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=resumen");
  const chart = page
    .getByRole("heading", { name: "Aseguradora", exact: true })
    .locator("../../..");
  const bars = chart.getByRole("img");
  await expect(bars.first()).toBeVisible();
  await expect(bars).toHaveCount(3);
  const colors = await bars.evaluateAll((nodes) =>
    nodes.map((el) => getComputedStyle(el).backgroundColor),
  );
  expect(new Set(colors).size).toBeGreaterThanOrEqual(3);
  await chart
    .getByRole("button", { name: "Ver como círculo", exact: true })
    .click();
  await expect(chart.locator(".recharts-pie")).toBeVisible();
  await chart
    .getByRole("button", { name: "Ver como barras", exact: true })
    .click();
  await expect(bars.first()).toBeVisible();
});
