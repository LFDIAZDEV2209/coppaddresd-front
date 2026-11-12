import { expect, test } from "@playwright/test";
import { mockMediaPagesHttp } from "./fixtures/media-pages-http";
test("media names repair encoding fragments while preserving valid accented names", async ({
  page,
}) => {
  await mockMediaPagesHttp(page);
  await page.goto("/media");
  await expect(
    page.getByRole("heading", { name: "Remo · Técnica (demo)", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Ângela García", { exact: true })).toBeVisible();
  await expect(page.getByText(/Â·|TÃ©cnica/)).toHaveCount(0);
});
test("media details open as a dedicated page and preserve playback metadata", async ({
  page,
}) => {
  await mockMediaPagesHttp(page);
  await page.goto("/media");
  await page.getByRole("button", { name: /Acciones de/ }).click();
  await page
    .getByRole("menuitem", { name: "Ver detalles", exact: true })
    .click();
  await expect(page).toHaveURL(/\/media\/qa-media$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Remo · Técnica (demo)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("video")).toHaveAttribute("controls", "");
  await page.getByRole("button", { name: "Editar medio", exact: true }).click();
  await expect(page).toHaveURL(/\/media\/qa-media\/edit$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar medio", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Título", { exact: false })).toHaveValue(
    "Remo · Técnica (demo)",
  );
});
test("the full edit page saves metadata without replacing the stored video", async ({
  page,
}) => {
  const api = await mockMediaPagesHttp(page);
  await page.goto("/media/qa-media/edit");
  const title = page.getByLabel("Título", { exact: false });
  await expect(title).toHaveValue("Remo · Técnica (demo)");
  await title.fill("Remo · Técnica actualizada");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page).toHaveURL(/\/media\/qa-media$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Remo · Técnica actualizada",
      exact: true,
    }),
  ).toBeVisible();
  expect(api.writes).toHaveLength(1);
  expect(api.writes[0].body.storageKey).toBe("media/exercises/qa.mp4");
  expect(api.writes[0].body.author).toBe("Ângela García");
});

test("media pages reflow on phones without a nested scroll area", async ({
  page,
}) => {
  await mockMediaPagesHttp(page);
  for (const path of ["/media/qa-media", "/media/qa-media/edit"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("video")).toBeVisible();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page
          .locator("main")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  }
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeVisible();
});
test("a failed media save keeps the edited form available to retry", async ({
  page,
}) => {
  const api = await mockMediaPagesHttp(page);
  let unavailable = true;
  await page.route("**/api/v1/media/qa-media", (route) =>
    route.request().method() === "PUT" && unavailable
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "No se pudo guardar el medio." }),
        })
      : route.fallback(),
  );
  await page.goto("/media/qa-media/edit");
  const title = page.getByLabel("Título", { exact: false });
  await expect(title).toBeVisible();
  await title.fill("Remo corregido");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(title).toHaveValue("Remo corregido");
  expect(api.writes).toHaveLength(0);
  unavailable = false;
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page).toHaveURL(/\/media\/qa-media$/);
  expect(api.writes).toHaveLength(1);
});
test("view-only media permission hides edit and publishing controls, including direct edit", async ({
  page,
}) => {
  await mockMediaPagesHttp(page);
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "media-viewer",
        email: "viewer@example.invalid",
        firstName: "Ana",
        lastName: "Pruebas",
        roles: ["QA"],
        permissions: ["Media.View"],
      }),
    }),
  );
  await page.goto("/media/qa-media");
  await expect(page.locator("video")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar medio", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Despublicar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Archivar", exact: true }),
  ).toHaveCount(0);
  await page.goto("/media/qa-media/edit");
  await expect(
    page.getByText("No tienes permiso para editar este medio.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
});
test("English media pages translate the form and enum metadata", async ({
  page,
}) => {
  await mockMediaPagesHttp(page, { english: true });
  await page.goto("/media/qa-media");
  await expect(
    page.getByText("Physical health", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit media", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: false })).toHaveValue(
    "Remo · Técnica (demo)",
  );
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
});
