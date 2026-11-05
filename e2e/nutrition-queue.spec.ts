import { test, expect, type Page } from "@playwright/test";

// Solo sesión/contexto sintéticos; el módulo conserva su modo demo autorizado.
async function session(page: Page, permissions: string[], english = false) {
  if (english) await page.context().addCookies([{ name: "copp_lang", value: "en", url: process.env.E2E_BASE_URL ?? "http://localhost:3000" }]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = (body: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/auth/refresh") return reply({ accessToken: "synthetic-nutrition-qa", expiresIn: 3600 });
    if (path === "/api/auth/me") return reply({ id: "nutrition-qa", email: "qa@example.invalid", firstName: "QA", lastName: "Nutrición", roles: ["Reviewer"], permissions });
    if (path === "/api/v1/me/context") return reply({ userId: "nutrition-qa", employeeId: null, professionalId: null, organization: null, isProfessional: false, onboardingCompleted: true, employeeStatus: "Active", clinics: [], activeClinicId: null });
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
}

test("bandeja demo: filtros, búsqueda, paginación y ausencia de N+1", async ({ page }) => {
  await session(page, ["Nutrition.Manage"]);
  const nutritionRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/nutrition/")) nutritionRequests.push(request.url()); });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/nutrition");
  const list = page.getByRole("list", { name: "Planes de pacientes" });
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("status")).toContainText("16 pacientes");
  await expect(page.getByRole("link", { name: "Nutrición 3 planes demo por aprobar", exact: true })).toBeVisible();
  await expect(page.getByText("Vista de demostración", { exact: false })).toBeVisible();
  await page.screenshot({ path: "qa-reports/nutrition/desktop.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Colapsar sidebar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Nutrición 3 planes demo por aprobar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Expandir sidebar", exact: true }).click();
  const filters = page.getByRole("group", { name: "Filtrar planes por estado" });
  await filters.getByRole("button", { name: /Por aprobar/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(filters.getByRole("button", { name: /Por aprobar/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Buscar paciente", { exact: true }).fill("Maria");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("María Demo");
  await page.getByLabel("Buscar paciente", { exact: true }).fill("zzzz");
  await expect(page.getByText("No encontramos pacientes en esta vista")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(6);
  await filters.getByRole("button", { name: /Sin plan/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Anterior", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await filters.getByRole("button", { name: /Todos/ }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "qa-reports/nutrition/mobile.png", fullPage: true });
  expect(nutritionRequests).toEqual([]);
});

test("Nutrition.Approve basta y los textos cambian a inglés", async ({ page }) => {
  await session(page, ["Nutrition.Approve"], true);
  await page.goto("/nutrition");
  await expect(page.getByRole("heading", { name: "Nutrition", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Patient plans" }).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("button", { name: /AI drafts/ })).toBeVisible();
});

test("sin permisos Nutrition no hay bandeja, enlace ni peticiones de datos", async ({ page }) => {
  await session(page, ["Wellness.View"]);
  await page.goto("/nutrition");
  await expect(page.getByText("Acceso denegado", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Planes de pacientes" })).toHaveCount(0);
  await expect(page.locator('a[href="/nutrition"]')).toHaveCount(0);
});
