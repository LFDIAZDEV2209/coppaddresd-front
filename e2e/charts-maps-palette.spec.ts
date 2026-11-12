import { expect, test, type Page, type Locator } from "@playwright/test";
import { mockChartsMapsHttp } from "./fixtures/charts-maps-http";
const capture = process.env.CHART_MAP_CAPTURE_DIR;
const card = (page: Page, title: string) =>
  page.getByRole("heading", { name: title, exact: true }).locator("../../..");
async function rgb(page: Page, tone: string) {
  return page.evaluate((tone) => {
    const s = document.createElement("span");
    s.style.color = `var(--spectrum-${tone}-chart)`;
    document.body.append(s);
    const color = getComputedStyle(s).color;
    s.remove();
    return color;
  }, tone);
}
// Comprueba la identidad semántica del color. chart-finish.spec verifica además los stops visibles.
const fills = (loc: Locator) =>
  loc.evaluateAll((nodes) =>
    nodes.map((el) => {
      const paint = getComputedStyle(el).fill;
      const id = paint.match(/#([^)"' ]+)/)?.[1];
      const gradient = id ? document.getElementById(id) : null;
      return gradient ? getComputedStyle(gradient).color : paint;
    }),
  );
const fill = async (loc: Locator) => (await fills(loc))[0];
async function shot(page: Page, name: string) {
  if (capture)
    await page.screenshot({
      path: `${capture}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
}
test("appointment trend stays in the shared palette through theme changes and aggregation", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const chart = card(page, "Actividad de citas");
  const line = chart.locator(".recharts-area-curve");
  await expect(line).toBeVisible();
  const stroke = await line.evaluate((el) => getComputedStyle(el).stroke);
  expect(stroke === (await rgb(page, "sky")) || stroke.includes("url(")).toBe(
    true,
  );
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(chart.locator("linearGradient[id$='-line'] stop")).toHaveCount(
    6,
  );
  const dark = await line.evaluate((el) => getComputedStyle(el).stroke);
  expect(dark === (await rgb(page, "sky")) || dark.includes("url(")).toBe(true);
  await chart.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(chart.locator(".recharts-bar-rectangle").first()).toBeVisible();
});
test("appointment hourly bars use all shared colours and preserve their values", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const chart = card(page, "Franjas de mayor demanda");
  const bars = chart.locator(".recharts-bar-rectangle path");
  await expect(bars).toHaveCount(7);
  const colors = await Promise.all(
    ["sky", "teal", "violet", "amber", "pink", "green", "slate"].map((t) =>
      rgb(page, t),
    ),
  );
  await expect.poll(() => fills(bars)).toEqual(colors);
  await shot(page, "appointments");
});
test("appointment status slices use the same semantic palette as their legends", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const chart = card(page, "Distribución por estado");
  const slices = chart.locator(".recharts-pie-sector path");
  await expect(slices).toHaveCount(4);
  await expect.poll(() => fill(slices.first())).not.toBe("");
  const green = await rgb(page, "green"),
    red = await rgb(page, "rose");
  await expect.poll(() => fill(slices.nth(0))).toBe(green);
  await expect.poll(() => fill(slices.nth(1))).toBe(red);
  const dots = chart.locator("li span.size-2");
  const colors = await dots.evaluateAll((nodes) =>
    nodes.map((el) => getComputedStyle(el).backgroundColor),
  );
  expect(colors).toEqual(await fills(slices));
});
test("appointment volume map shares its scale with the legend in both themes", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const map = page.getByRole("img", {
    name: "Mapa de citas por estado de EE. UU.",
    exact: true,
  });
  const state = map.locator('g[aria-label^="California:"] path');
  await expect(state).toBeVisible();
  expect(await fill(state)).toBe(await rgb(page, "pink"));
  const section = card(page, "Mapa de calor — Citas");
  const swatches = section.locator("span.size-3\\.5");
  expect(
    await swatches
      .last()
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(await fill(state));
  await section
    .getByRole("button", { name: "Porcentaje", exact: true })
    .click();
  expect(await fill(state)).toBe(await rgb(page, "pink"));
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  expect(await fill(state)).toBe(await rgb(page, "pink"));
});
test("patient volume map uses the shared scale and still filters by keyboard", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/patients?tab=mapa");
  const map = page.getByRole("img", {
    name: "Mapa de pacientes por estado de EE. UU.",
    exact: true,
  });
  const state = map.locator('g[aria-label^="California:"]');
  await expect(state).toBeVisible();
  expect(await fill(state.locator("path"))).toBe(await rgb(page, "pink"));
  await state.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/state=CA/);
  await shot(page, "patients-map");
});
test("clinical risk map uses shared green amber red and keeps no-data neutral", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/health-tests");
  const map = page.getByRole("img", {
    name: "Mapa de riesgo por estado",
    exact: true,
  });
  await expect(map).toBeVisible();
  for (const [name, tone] of [
    ["California", "green"],
    ["Florida", "amber"],
    ["Texas", "rose"],
  ])
    expect(
      await fill(
        map.getByRole("button", { name: new RegExp("^" + name + "\\.") }),
      ),
    ).toBe(await rgb(page, tone));
  const state = map.getByRole("button", { name: /^California\./ });
  const other = map.getByRole("button", { name: /^Florida\./ });
  await state.focus();
  await page.keyboard.press("Enter");
  await expect(other).toHaveAttribute("fill-opacity", "0.35");
  await page.keyboard.press("Escape");
  await expect(other).toHaveAttribute("fill-opacity", "1");
  await shot(page, "health-map");
});
test("community region markers use the same shared colours as the city legend", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/community/regions");
  const section = card(page, "Distribución geográfica");
  const marker = section
    .locator("circle")
    .filter({ has: page.locator("title", { hasText: "Miami" }) });
  await expect(marker).toBeVisible();
  expect(await fill(marker)).toBe(await rgb(page, "sky"));
  const legend = section
    .locator("div.flex.items-center")
    .filter({ has: page.getByText("Miami", { exact: true }) })
    .first()
    .locator("span.size-3");
  expect(
    await legend.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(await fill(marker));
  await shot(page, "community-map");
});
test("biometry map keeps its IMC thresholds with the shared semantic palette", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/program/dashboard");
  const map = page.getByRole("img", {
    name: "Mapa de IMC por estado",
    exact: true,
  });
  await expect(map).toBeVisible();
  for (const [name, tone] of [
    ["California", "green"],
    ["Florida", "amber"],
    ["Texas", "rose"],
  ]) {
    const path = map.locator("path").filter({
      has: page.locator("title", { hasText: new RegExp("^" + name) }),
    });
    expect(await fill(path)).toBe(await rgb(page, tone));
  }
  await shot(page, "biometry-map");
});

test("community chart colours remain independent of navigation accent in both themes", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/community/dashboard");
  const chart = card(page, "Actividad (30 días)");
  const line = chart.locator(".recharts-area-curve").first();
  await expect(line).toBeVisible();
  const sky = await rgb(page, "sky");
  await expect
    .poll(() => line.evaluate((el) => getComputedStyle(el).stroke))
    .toBe(sky);
  await page.goto("/users");
  await page.getByRole("button", { name: "Modo oscuro", exact: true }).click();
  await page.goto("/community/dashboard");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect
    .poll(() => line.evaluate((el) => getComputedStyle(el).stroke))
    .toBe(sky);
});

test("inventory movement bars and their legend use the same shared colours", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/inventory/reports");
  const chart = card(page, "Entradas vs. salidas");
  const entry = chart.locator('[title="Entradas: 5"]');
  await expect(entry).toBeVisible();
  const expected = await rgb(page, "sky");
  expect(
    await entry.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(expected);
  const exit = chart.locator('[title="Salidas: 2"]').first();
  expect(
    await exit.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(await rgb(page, "rose"));
  const legend = chart.locator("i");
  expect(
    await legend.first().evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(expected);
});
