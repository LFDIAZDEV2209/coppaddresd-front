import { expect, test, type Page } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
type Mode = "ready" | "empty" | "error";
async function setup(
  page: Page,
  { english = false, mode = "ready" as Mode, hold = false } = {},
) {
  const base = await mockPlatformStyleHttp(page, { english });
  let current = mode;
  let calls = 0;
  const agendas: string[] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/professionals-catalog")) {
      calls++;
      if (hold) await gate;
      if (current === "error")
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      const data =
        current === "empty"
          ? []
          : [
              {
                id: "qa-professional",
                fullName: "Ana Torres",
                professionalTypeName: "Medicina",
                specialties: [],
                locations: [],
                clinicIds: [],
                employeeId: "qa-employee",
                status: "Active",
              },
            ];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          data,
          total: data.length,
          page: 1,
          pageSize: 100,
          totalPages: 1,
        }),
      });
    }
    if (url.pathname.endsWith("/appointments/agenda")) {
      agendas.push(url.search);
      return route.fulfill({ contentType: "application/json", body: "[]" });
    }
    return route.fallback();
  });
  return {
    ...base,
    agendas,
    get calls() {
      return calls;
    },
    setMode: (mode: Mode) => (current = mode),
    release,
  };
}
test("selection empty state opens the real picker and keeps the chosen professional when switching views", async ({
  page,
}) => {
  const api = await setup(page);
  await page.goto("/appointments/agenda");
  await expect(
    page.getByRole("heading", {
      name: "Elige un profesional para comenzar",
      exact: true,
    }),
  ).toBeVisible();
  expect(api.agendas).toHaveLength(0);
  const initialCalls = api.calls;
  await page
    .getByRole("button", { name: "Seleccionar profesional", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Ana Torres · Medicina", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Elige un profesional para comenzar",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Agenda", exact: true }),
  ).toBeVisible();
  await expect.poll(() => api.agendas.length).toBeGreaterThan(0);
  expect(api.agendas[0]).toContain("professionalId=qa-professional");
  await page.getByRole("button", { name: "Calendario", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Calendario", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Profesional", exact: true }),
  ).toContainText("Ana Torres");
  expect(api.calls).toBe(initialCalls);
  expect(api.writes).toEqual([]);
});
test("empty catalogue offers an update instead of a disabled selection action", async ({
  page,
}) => {
  const api = await setup(page, { mode: "empty" });
  await page.goto("/appointments/agenda");
  await expect(
    page.getByRole("heading", {
      name: "No hay profesionales activos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Seleccionar profesional", exact: true }),
  ).toHaveCount(0);
  const initialCalls = api.calls;
  api.setMode("ready");
  await page
    .getByRole("button", { name: "Actualizar lista", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Elige un profesional para comenzar",
      exact: true,
    }),
  ).toBeVisible();
  expect(api.calls).toBe(initialCalls + 1);
  expect(api.writes).toEqual([]);
});
test("catalogue failure is distinct from an empty list and can recover", async ({
  page,
}) => {
  const api = await setup(page, { mode: "error" });
  await page.goto("/appointments/agenda");
  await expect(
    page.getByRole("heading", {
      name: "No pudimos cargar los profesionales",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "No hay profesionales activos",
      exact: true,
    }),
  ).toHaveCount(0);
  api.setMode("ready");
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Seleccionar profesional", exact: true }),
  ).toBeVisible();
  expect(api.agendas).toHaveLength(0);
});
test("pending catalogue loading does not claim that no professionals exist", async ({
  page,
}) => {
  const api = await setup(page, { hold: true });
  await page.goto("/appointments/agenda");
  await expect(page.getByRole("status")).toContainText(
    "Cargando profesionales",
  );
  await expect(
    page.getByRole("heading", {
      name: "No hay profesionales activos",
      exact: true,
    }),
  ).toHaveCount(0);
  api.release();
  await expect(
    page.getByRole("button", { name: "Seleccionar profesional", exact: true }),
  ).toBeVisible();
});
test("English empty state stays readable on phones and in dark mode", async ({
  page,
}) => {
  await setup(page, { english: true });
  await page.goto("/appointments/agenda");
  await expect(
    page.getByRole("heading", {
      name: "Choose a professional to get started",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector("main")!.scrollWidth <=
            document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Choose professional", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Choose professional", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Ana Torres · Medicina", exact: true }),
  ).toBeVisible();
});
