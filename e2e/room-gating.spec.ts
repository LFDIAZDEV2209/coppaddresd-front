import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { loadFixtures } from "./fixtures/e2e-data";

test.describe("gating de sala", () => {
  test("fuera de ventana: aviso de prejoin, join deshabilitado y sin Twilio", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    const sdkRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("sdk.twilio.com")) {
        sdkRequests.push(request.url());
      }
    });

    await loginAsAdmin(page);
    await page.goto(`/appointments/room/${fixtures.appointments.roomClosed}`);

    await expect(page.getByText("La sala todavía no está abierta")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Unirme a la consulta" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Iniciar consulta y unirme" }),
    ).toHaveCount(0);
    expect(sdkRequests).toHaveLength(0);
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
