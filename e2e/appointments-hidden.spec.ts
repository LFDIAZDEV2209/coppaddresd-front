import { expect, test } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
test("appointments are hidden from navigation and global search while Nutrition stays accessible", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/dashboard");
  await expect(
    page.locator("aside").getByRole("link", { name: "Citas", exact: true }),
  ).toHaveCount(0);
  const search = page.getByRole("combobox", {
    name: "Buscar páginas o módulos",
    exact: true,
  });
  await search.fill("citas");
  await expect(page.getByRole("option")).toHaveCount(0);
  await search.fill("nutrición");
  await expect(page.getByRole("option", { name: /Nutrición/ })).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/nutrition$/);
});
test("old appointment URLs including standalone rooms return to the dashboard", async ({
  page,
}) => {
  const api = await mockPlatformStyleHttp(page);
  for (const path of [
    "/appointments",
    "/appointments/agenda",
    "/appointments/admin",
    "/appointments/room/qa-room",
    "/patients/appointments",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  expect(api.writes).toEqual([]);
});
