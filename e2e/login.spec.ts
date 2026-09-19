import { test, expect } from "@playwright/test";
import { confirmLogin, loginAsProfessional } from "./fixtures/auth";

test.describe("login", () => {
  test("credenciales de demostración (solo dev) entran al dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    const demoButton = page
      .getByRole("button")
      .filter({ hasText: "@coppaddresd.com" })
      .first();

    if ((await demoButton.count()) === 0) {
      test.skip(true, "El panel demo solo se renderiza en desarrollo");
    }

    await demoButton.click();
    // Confirmación con la alternativa de teclado del slider.
    await confirmLogin(page);
  });

  test("credenciales válidas del profesional entran al dashboard", async ({
    page,
  }) => {
    await loginAsProfessional(page);
  });

  test("credenciales inválidas muestran error sin salir del login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nadie@coppaddresd.com");
    await page.locator("#password").fill("ClaveIncorrecta123!");
    await page.getByRole("slider", { name: "Comencemos" }).focus();
    await page.getByRole("slider", { name: "Comencemos" }).press("End");

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
