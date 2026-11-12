import { expect, test, type Page } from "@playwright/test";
import { agents, openDashboard } from "./fixtures/dashboard-http";
function card(page: Page, name: string) {
  return page.getByRole("heading", { name, exact: true }).locator("../../..");
}
async function capture(page: Page, name: string) {
  if (!process.env.DASHBOARD_CAPTURE_DIR) return;
  await page
    .locator("main section[aria-label]")
    .last()
    .screenshot({
      path: `${process.env.DASHBOARD_CAPTURE_DIR}/${name}-details.png`,
      animations: "disabled",
    });
  await page.locator("main").screenshot({
    path: `${process.env.DASHBOARD_CAPTURE_DIR}/${name}.png`,
    animations: "disabled",
  });
}

test("summary cards end with their own content instead of stretching to the feed", async ({
  page,
}) => {
  await openDashboard(page);
  if (process.env.DASHBOARD_CAPTURE_DIR)
    await capture(page, "before-or-after-desktop");
  for (const name of ["Uso de agentes", "Crecimiento", "Acciones rápidas"]) {
    const host = card(page, name);
    const space = await host.evaluate((el) => {
      const body = el.lastElementChild!;
      return (
        el.getBoundingClientRect().bottom - body.getBoundingClientRect().bottom
      );
    });
    expect(space, `${name}: unused space below body`).toBeLessThan(24);
  }
});
test("growth uses real localized months and exposes values by keyboard", async ({
  page,
}) => {
  await openDashboard(page);
  const growth = card(page, "Crecimiento");
  await expect(growth.getByText("2026-11", { exact: true })).toHaveCount(0);
  const point = growth.getByRole("button", {
    name: "Noviembre de 2026: 10 pacientes nuevos",
    exact: true,
  });
  await point.focus();
  await expect(growth.getByRole("tooltip")).toContainText("10");
  await page.keyboard.press("Escape");
  await expect(growth.getByRole("tooltip")).toHaveCount(0);
  await growth.getByText("Ver datos mensuales", { exact: true }).click();
  await expect(growth.getByRole("table").locator("tbody tr")).toHaveCount(6);
});
test("zero-base growth does not invent a percentage increase", async ({
  page,
}) => {
  await openDashboard(page);
  const growth = card(page, "Crecimiento");
  await growth
    .getByRole("button", {
      name: "Julio de 2026: 4 pacientes nuevos",
      exact: true,
    })
    .focus();
  await expect(growth.getByRole("tooltip")).not.toContainText("400%");
});
test("agent names remain readable and empty agent usage is explicit", async ({
  page,
}) => {
  await openDashboard(page);
  const usage = card(page, "Uso de agentes");
  const name = usage.getByText(agents[0].name, { exact: true });
  expect(await name.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(usage.getByRole("meter")).toHaveCount(6);
  await openDashboard(page, { empty: true });
  await expect(
    card(page, "Uso de agentes").getByText("Sin ejecuciones de agentes", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    card(page, "Crecimiento").getByText("Sin datos de crecimiento", {
      exact: true,
    }),
  ).toBeVisible();
});
test("dashboard stays readable on narrow screens with a long recent feed", async ({
  page,
}) => {
  await openDashboard(page);
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector("main")!.scrollWidth <=
            document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
    const recent = card(page, "Ejecuciones recientes de IA");
    expect(
      await recent
        .getByText(agents[0].name, { exact: true })
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await capture(page, `width-${width}`);
  }
});
test("English shortcuts and growth labels translate, including in dark mode", async ({
  page,
}) => {
  await openDashboard(page, { english: true });
  await expect(
    page.getByRole("link", { name: "Create user", exact: true }),
  ).toBeVisible();
  const growth = card(page, "Growth");
  await expect(
    growth.getByRole("button", {
      name: "November 2026: 10 new patients",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await capture(page, "dark-en");
});
