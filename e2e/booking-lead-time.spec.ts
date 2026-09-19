import { test, expect } from "@playwright/test";
import { loginAsProfessional } from "./fixtures/auth";
import { loadFixtures, localDateOf } from "./fixtures/e2e-data";

const LEAD_HOURS = 2;
const MARGIN_MINUTES = 30;

/** Reimplementación de `nextBookableStart` para validar el contrato. */
function nextBookableStart(now: number): number {
  const start = new Date(now);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60);
  const minLeadMs = (LEAD_HOURS * 60 + MARGIN_MINUTES) * 60_000;
  while (start.getTime() - now < minLeadMs) {
    start.setTime(start.getTime() + 30 * 60_000);
  }
  return start.getTime();
}

test.describe("reserva con anticipación mínima", () => {
  test("crear cita manual prellena el primer hueco válido (≥ 2 h 30 min)", async ({
    page,
  }) => {
    await loginAsProfessional(page);
    await page.goto("/appointments/agenda");

    const newButton = page.getByRole("button", { name: "Nueva cita" });
    await expect(newButton).toBeVisible();
    await newButton.click();

    const date = await page.locator("#create-date").inputValue();
    const time = await page.locator("#create-time").inputValue();
    expect(date).not.toBe("");
    expect(time).not.toBe("");

    const selected = new Date(`${date}T${time}`).getTime();
    const now = Date.now();
    const minLeadMs = (LEAD_HOURS * 60 + MARGIN_MINUTES) * 60_000;

    // Primer hueco: respeta la anticipación mínima y está alineado a 30 min,
    // sin alejarse más de un bloque del cálculo local.
    expect(selected - now).toBeGreaterThanOrEqual(minLeadMs - 60_000);
    expect(selected - now).toBeLessThanOrEqual(minLeadMs + 45 * 60_000);
    expect(new Date(selected).getMinutes() % 30).toBe(0);
    expect(selected).toBeGreaterThanOrEqual(nextBookableStart(now) - 60_000);
  });

  test("reprogramar a un horario demasiado próximo muestra el guard local", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    await loginAsProfessional(page);
    await page.goto(
      `/appointments/agenda?fecha=${localDateOf(fixtures.appointments.roomClosed)}`,
    );

    // Solo las citas Confirmed muestran la acción de reprogramar.
    const reschedule = page
      .getByRole("button", { name: "Reprogramar" })
      .first();
    await expect(reschedule).toBeVisible();
    await reschedule.click();

    // Horario dentro de la anticipación mínima (10 min en el futuro local).
    const near = new Date(Date.now() + 10 * 60_000);
    const pad = (value: number) => String(value).padStart(2, "0");
    const localInput = `${near.getFullYear()}-${pad(near.getMonth() + 1)}-${pad(
      near.getDate(),
    )}T${pad(near.getHours())}:${pad(near.getMinutes())}`;

    await page.locator("#reschedule-start").fill(localInput);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Reprogramar" })
      .click();

    await expect(
      page.getByText("La nueva fecha debe respetar la anticipación mínima configurada."),
    ).toBeVisible();
  });
});
