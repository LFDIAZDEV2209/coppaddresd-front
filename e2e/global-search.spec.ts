import { expect, test } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
import { mockPatientsHttp } from "./fixtures/patients-http";
test("top search navigates using keyboard and has no shortcut badge", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/patients");
  await expect(page.locator("header kbd")).toHaveCount(0);
  const search = page.getByRole("combobox", {
    name: "Buscar páginas o módulos",
    exact: true,
  });
  await search.fill("usuarios");
  await expect(
    page.getByRole("option", { name: /Usuarios.*Gestión/ }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/users$/);
  await expect(
    page.getByRole("listbox", { name: "Páginas y módulos", exact: true }),
  ).toHaveCount(0);
});
test("search excludes pages outside the user permissions and closes with Escape", async ({
  page,
}) => {
  await mockPatientsHttp(page, { permissions: ["Patients.View"] });
  await page.goto("/patients");
  const search = page.getByRole("combobox", {
    name: "Buscar páginas o módulos",
    exact: true,
  });
  await search.fill("roles");
  await expect(
    page.getByText("No encontramos páginas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(0);
  await search.fill("pacientes");
  await expect(
    page.getByRole("option", { name: /Pacientes.*Gestión/ }),
  ).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveAttribute("aria-expanded", "false");
});
test("English mobile search opens and navigates without horizontal overflow", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page, { english: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/patients");
  await page
    .getByRole("button", { name: "Search the ERP", exact: true })
    .click();
  const search = page.getByRole("combobox", {
    name: "Search pages or modules",
    exact: true,
  });
  await expect(search).toBeFocused();
  await search.fill("users");
  await expect(
    page.getByRole("option", { name: /Users.*Management/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await search.press("Enter");
  await expect(page).toHaveURL(/\/users$/);
});
