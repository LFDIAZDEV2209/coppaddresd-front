import { expect, type Page } from "@playwright/test";
import { loadFixtures } from "./e2e-data";

/**
 * Confirma el login con la alternativa de teclado del slider
 * (`SlideToConfirm`: el thumb enfocable acepta End/Enter). El formulario no
 * tiene botón submit, por lo que Enter dentro de los inputs no lo envía.
 */
export async function confirmLogin(page: Page): Promise<void> {
  const slider = page.getByRole("slider", { name: "Comencemos" });
  await slider.focus();
  await slider.press("End");
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Login por UI con las credenciales indicadas. */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await confirmLogin(page);
}

/** Login con el profesional sembrado por `seed-e2e.py` (dueño de las citas). */
export async function loginAsProfessional(page: Page): Promise<void> {
  const { professional } = loadFixtures();
  await login(page, professional.email, professional.password);
}

/**
 * Login con el admin del Auth seeder (permisos globales). Los journeys de
 * sala/detalle lo usan para no depender del scope de clínica en el header
 * `X-Clinic-Id` (ver e2e/README.md, limitaciones).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(
    page,
    process.env.E2E_ADMIN_EMAIL ?? "admin@coppaddresd.com",
    process.env.E2E_ADMIN_PASSWORD ?? "Test@1234",
  );
}
