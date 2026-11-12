import { test, expect } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";

// UI real y API sintética: no publica planes de pacientes reales.
test("publicar no requiere rol ni confirmación personal de nutricionista", async ({ page }) => {
  const { writes } = await mockNutritionHttp(page, ["Nutrition.Manage"]);
  await page.goto("/nutrition/demo-patient-1");
  await expect(page.getByText("IMPORTANT DISCLAIMER – NUTRITIONAL RECOMMENDATIONS", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar plan", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Publicar plan", exact: true }).first().click();
  await expect.poll(() => writes.some(w => w.path.endsWith("/publish"))).toBe(true);
  const publication = writes.find(w => w.path.endsWith("/publish"))!;
  expect(publication.body).not.toHaveProperty("criticalConfirmed");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".nutrition-header-state")).toContainText("Publicado");
});
