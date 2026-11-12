import { expect, test } from "@playwright/test";
import { mockChartsMapsHttp } from "./fixtures/charts-maps-http";
test("appointment donut fills its available plot and remains contained on phones", async ({
  page,
}) => {
  await mockChartsMapsHttp(page);
  await page.goto("/appointments/admin");
  const card = page
    .getByRole("heading", { name: "Distribución por estado", exact: true })
    .locator("../../..");
  const pie = card.locator(".recharts-pie");
  await expect(pie).toBeVisible();
  await expect
    .poll(async () => (await pie.boundingBox())!.width)
    .toBeGreaterThan(185);
  await expect(card.getByText("40", { exact: true })).toBeVisible();
  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () =>
          document.querySelector("main")!.scrollWidth <=
          document.querySelector("main")!.clientWidth,
      ),
    ).toBe(true);
    await expect(card.locator("ul")).toBeVisible();
  }
});
