import { expect, test, type Page } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
async function setup(page: Page) {
  await mockPlatformStyleHttp(page);
  const writes: string[] = [];
  const items = [
    {
      id: "qa-info",
      type: "NewAppointment",
      severity: "Info",
      title: "Nueva cita asignada",
      body: "Paciente de prueba con un nombre largo · Medicina familiar. Revisa la información de esta cita antes de la atención.",
      relatedAppointmentId: "qa-appointment",
      readAt: null,
      createdAt: "2026-11-10T12:00:00Z",
    },
    {
      id: "qa-warning",
      type: "AppointmentRescheduled",
      severity: "Warning",
      title: "Cita reprogramada",
      body: "La cita cambió de horario. Consulta el detalle para revisar la programación.",
      relatedAppointmentId: "qa-appointment-2",
      readAt: null,
      createdAt: "2026-11-09T12:00:00Z",
    },
  ];
  await page.route("**/api/v1/telemedicine/alerts**", (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith("/summary"))
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ unread: items.filter((i) => !i.readAt).length }),
      });
    if (route.request().method() === "POST") {
      writes.push(p);
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items,
        total: 2,
        unread: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    });
  });
  return writes;
}
test("notification cards use a neutral surface and retain clear unread/severity signals", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/appointments/alertas");
  const card = page
    .locator("main li")
    .filter({ hasText: "Nueva cita asignada" });
  await expect(card).toBeVisible();
  expect(
    await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.backgroundColor ===
        getComputedStyle(document.documentElement)
          .getPropertyValue("--card")
          .trim()
        ? "token"
        : s.backgroundColor;
    }),
  ).toBe("rgb(255, 255, 255)");
  await expect(card.getByText("Nueva", { exact: true })).toHaveCount(0);
  await expect(card.getByText("Info", { exact: true })).toHaveCount(0);
  await expect(card.getByLabel("Sin leer", { exact: true })).toBeVisible();
  await expect(
    page
      .locator("main li")
      .filter({ hasText: "Cita reprogramada" })
      .getByText("Advertencia", { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () =>
          document.querySelector("main")!.scrollWidth <=
          document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
  }
});
test("details and read actions keep their existing behaviour", async ({
  page,
}) => {
  const writes = await setup(page);
  await page.goto("/appointments/alertas");
  const card = page
    .locator("main li")
    .filter({ hasText: "Nueva cita asignada" });
  await card
    .getByRole("button", {
      name: "Alerta sin leer: Nueva cita asignada",
      exact: true,
    })
    .click();
  const link = card.getByRole("link", {
    name: "Abrir cita relacionada",
    exact: true,
  });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute(
    "href",
    "/appointments/citas/qa-appointment",
  );
  expect(await link.evaluate((el) => el.closest("button") === null)).toBe(true);
  await card
    .getByRole("button", {
      name: "Marcar como leída: Nueva cita asignada",
      exact: true,
    })
    .click();
  await expect(card.getByLabel("Sin leer", { exact: true })).toHaveCount(0);
  expect(writes).toEqual(["/api/v1/telemedicine/alerts/qa-info/read"]);
});
