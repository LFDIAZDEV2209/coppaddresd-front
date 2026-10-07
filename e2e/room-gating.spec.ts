import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { loadFixtures } from "./fixtures/e2e-data";

test.describe("gating de sala", () => {
  test("fuera de ventana: el personal puede iniciar o unirse a la sala", async ({
    page,
  }) => {
    const fixtures = loadFixtures();

    await loginAsAdmin(page);
    await page.goto(`/appointments/room/${fixtures.appointments.roomClosed}`);

    // La ventana horaria ya no restringe al personal del ERP.
    await expect(page.getByText("La sala todavía no está abierta")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /Unirme a la consulta|Iniciar consulta y unirme/,
      }),
    ).toBeVisible();
  });

  test("cita completada fuera de la gracia no ofrece reabrir", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    await loginAsAdmin(page);
    await page.goto(`/appointments/citas/${fixtures.appointments.reopenOld}`);

    await expect(page.getByText("Completada").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reabrir consulta" }),
    ).toHaveCount(0);
  });
});
