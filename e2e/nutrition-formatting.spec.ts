import { test, expect } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import { nutritionMockCatalog } from "./fixtures/nutrition-demo-workspace";
import { dayTotals } from "../features/nutrition/lib/nutrition-calculations";

for (const timezoneId of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
  test.describe(`fecha civil en ${timezoneId}`, () => {
    test.use({ timezoneId });
    test("conserva día y año entre programación y calendario", async ({ page }) => {
      const { store, writes } = await mockNutritionHttp(page);
      const cycle = store.get("demo-patient-2")!.cycle!;
      cycle.startDate = "2026-12-31";
      cycle.endDate = "2027-01-29";
      await page.goto("/nutrition/demo-patient-2?tab=programacion");
      const period = page.locator(".nutrition-cycle-summary").filter({ visible: true });
      await expect(period).toContainText(/31.*dic.*2026/);
      await expect(period).toContainText(/29.*ene.*2027/);
      await page.getByRole("tab", { name: "Resultados y ciclos", exact: true }).click();
      await expect(page.locator(".nutrition-program-period-title").first()).toContainText(/31.*dic.*2026/);
      expect(writes).toHaveLength(0);
    });
  });
}

test("inspector conserva decimales, signo y diferencias subdecimales", async ({ page }) => {
  const { store, writes } = await mockNutritionHttp(page);
  const cycle = store.get("demo-patient-2")!.cycle!;
  const actual = dayTotals(cycle.meals.filter((meal) => meal.dayNumber === 1), nutritionMockCatalog).kcal;
  for (const [difference, expected] of [
    [0.3, "+0,3 kcal"], [-0.3, "-0,3 kcal"], [0, "desviación 0 kcal"],
    [0.03, "Menos de 0,1 kcal sobre la meta"], [-0.03, "Menos de 0,1 kcal bajo la meta"],
  ] as const) {
    cycle.targets.kcal = actual - difference;
    await page.goto("/nutrition/demo-patient-2?tab=programacion");
    await expect(page.locator(".nutrition-month-inspector output")).toContainText(expected);
  }
  expect(writes).toHaveLength(0);
});

test("formato inglés y vigencia desconocida sin fechas fabricadas", async ({ page }) => {
  const { store } = await mockNutritionHttp(page, undefined, { english: true });
  const cycle = store.get("demo-patient-2")!.cycle!;
  cycle.startDate = null;
  cycle.endDate = null;
  const actual = dayTotals(cycle.meals.filter((meal) => meal.dayNumber === 1), nutritionMockCatalog).kcal;
  cycle.targets.kcal = actual - 0.03;
  await page.goto("/nutrition/demo-patient-2?tab=programacion");
  await expect(page.locator(".nutrition-month-inspector output")).toContainText("Less than 0.1 kcal above target");
  await expect(page.locator(".nutrition-cycle-summary").filter({ visible: true })).toContainText("Not set");
});
