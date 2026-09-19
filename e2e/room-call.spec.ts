import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { loadFixtures } from "./fixtures/e2e-data";
import { stubTwilioVideo } from "./fixtures/twilio";

test.describe("sala con SDK de Twilio stubbeado", () => {
  test("prejoin → conectando → conectado → toggles → finalizar", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    const stub = await stubTwilioVideo(page);

    await loginAsAdmin(page);
    await page.goto(`/appointments/room/${fixtures.appointments.roomOpen}`);

    // El admin tiene SessionsManage: entra por la vía de gestión (sin startSession).
    const join = page.getByRole("button", {
      name: /Unirme a la consulta|Iniciar consulta y unirme/,
    });
    await expect(join).toBeVisible();
    await join.click();

    // El stub demora 800 ms: se alcanza a ver el estado intermedio.
    await expect(
      page.getByRole("button", { name: "Conectando…" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Finalizar consulta" }),
    ).toBeVisible();
    expect(stub.wasServed()).toBe(true);

    // Sin participantes remotos (el stub no emite participantConnected).
    await expect(
      page.getByText(
        /Esperando que (el paciente|el profesional) se conecte a la sala…/,
      ),
    ).toBeVisible();

    // Toggles de micrófono y cámara sobre los tracks falsos.
    await page.getByRole("button", { name: "Silenciar" }).click();
    await expect(
      page.getByRole("button", { name: "Activar micrófono" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Apagar cámara" }).click();
    await expect(
      page.getByRole("button", { name: "Encender cámara" }),
    ).toBeVisible();

    // Finalizar cierra la sesión real en el backend y navega al detalle.
    await page.getByRole("button", { name: "Finalizar consulta" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/appointments/citas/${fixtures.appointments.roomOpen}`),
    );
  });
});
