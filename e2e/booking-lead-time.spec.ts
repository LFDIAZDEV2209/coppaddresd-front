import { test, expect } from "@playwright/test";
import { loginAsProfessional } from "./fixtures/auth";
import { loadFixtures, localDateOf } from "./fixtures/e2e-data";

test.describe("reserva con anticipación mínima", () => {
  test("crear cita manual consulta slots antes de permitir agendar", async ({
    page,
  }) => {
    await loginAsProfessional(page);
    await page.goto("/appointments/agenda");

    const newButton = page.getByRole("button", { name: "Nueva cita" });
    await expect(newButton).toBeVisible();
    await newButton.click();

    const date = await page.locator("#create-date").inputValue();
    expect(date).not.toBe("");
    await expect(page.locator("#create-duration")).toBeVisible();
    await expect(
      page.getByText("Horarios disponibles", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#create-time")).toHaveCount(0);
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
