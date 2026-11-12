import { test, expect } from '@playwright/test';
import { mockNutritionHttp } from './fixtures/nutrition-http';

test('calendario y selector usan publicación sin pedir aprobación previa', async ({ page }) => {
  await mockNutritionHttp(page);
  await page.goto('/nutrition/demo-patient-1');
  await expect(page.locator('.nutrition-program-legend')).not.toContainText('Por aprobar');
  await expect(page.locator('.nutrition-program-legend')).toContainText('Por publicar');
  await page.getByRole('tab', { name: 'Programación', exact: true }).click();
  await expect(page.locator('.nutrition-month:visible')).not.toContainText('antes de aprobar');
});
