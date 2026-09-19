import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { loadFixtures } from "./fixtures/e2e-data";

test.describe("gracia de reapertura (default del backend)", () => {
  test("dentro de la gracia: botón visible con el copy del DTO", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    // El seed no toca `reopen_grace_minutes`: el E2E corre con el default 60
    // (la configurabilidad la cubren los unit tests del backend).
    expect(fixtures.settings.reopenGraceMinutes).toBe(60);
    await loginAsAdmin(page);
    await page.goto(`/appointments/citas/${fixtures.appointments.reopenRecent}`);

    await expect(
      page.getByRole("button", { name: "Reabrir consulta" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        `Se puede reabrir hasta ${fixtures.settings.reopenGraceMinutes} minutos después de finalizada.`,
      ),
    ).toBeVisible();
  });

  test("fuera de la gracia: sin botón ni copy de reapertura", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    await loginAsAdmin(page);
    await page.goto(`/appointments/citas/${fixtures.appointments.reopenOld}`);

    await expect(
      page.getByRole("button", { name: "Reabrir consulta" }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        `Se puede reabrir hasta ${fixtures.settings.reopenGraceMinutes} minutos después de finalizada.`,
      ),
    ).toHaveCount(0);
  });

  test("reabrir dentro de la gracia devuelve la cita a En curso", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TWILIO_REAL !== "1",
      "ReopenSessionCommand crea una sala nueva en el proveedor: requiere Twilio real/red (QA manual).",
    );

    const fixtures = loadFixtures();
    await loginAsAdmin(page);
    await page.goto(`/appointments/citas/${fixtures.appointments.reopenRecent}`);

    const reopen = page.getByRole("button", { name: "Reabrir consulta" });
    if (await reopen.isVisible().catch(() => false)) {
      await reopen.click();
    }

    await expect(page.getByText("En curso").first()).toBeVisible();
  });
});
