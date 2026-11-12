import { expect, test } from "@playwright/test";
import { mockPlatformStyleHttp } from "./fixtures/platform-style-http";
const cases = [
  ["/community/clubs/new", "/community/clubs/new"],
  ["/community/clubs", "/community/clubs"],
  ["/community/dashboard", "/community/dashboard"],
  ["/community/diagnostics", "/community/diagnostics"],
  ["/community/feed", "/community/feed"],
  ["/community/groups", "/community/groups"],
  ["/community/inactive", "/community/inactive"],
  ["/community/members", "/community/members"],
  ["/community/moderation", "/community/moderation"],
  ["/community/networks", "/community/networks"],
  ["/community", "/community"],
  ["/community/posts", "/community/posts"],
  ["/community/regions", "/community/regions"],
  ["/community/rewards", "/community/rewards"],
  ["/community/streaks", "/community/streaks"],
  ["/agents/knowledge/new", "/agents/knowledge/new"],
  ["/agents/knowledge", "/agents/knowledge"],
  ["/agents/monitoring", "/agents/monitoring"],
  ["/agents/new", "/agents/new"],
  ["/agents", "/agents"],
  ["/agents/playground", "/agents/playground"],
  ["/appointments/admin/citas", "/appointments/admin/citas"],
  ["/appointments/admin", "/appointments/admin"],
  ["/appointments/admin/profesionales", "/appointments/admin/profesionales"],
  ["/appointments/admin/sesiones", "/appointments/admin/sesiones"],
  ["/appointments/admin/solicitudes", "/appointments/admin/solicitudes"],
  ["/appointments/agenda", "/appointments/agenda"],
  ["/appointments/alertas", "/appointments/alertas"],
  ["/appointments/calendario", "/appointments/calendario"],
  ["/appointments/citas", "/appointments/citas"],
  ["/appointments", "/appointments"],
  ["/appointments/solicitudes", "/appointments/solicitudes"],
  ["/employees", "/employees"],
  [
    "/health-tests/alertas/notificaciones",
    "/health-tests/alertas/notificaciones",
  ],
  ["/health-tests/alertas/notificar", "/health-tests/alertas/notificar"],
  ["/health-tests/alertas", "/health-tests/alertas"],
  ["/health-tests/alertas/plantillas", "/health-tests/alertas/plantillas"],
  ["/health-tests/analisis", "/health-tests/analisis"],
  ["/health-tests/baterias/new", "/health-tests/baterias/new"],
  ["/health-tests/baterias", "/health-tests/baterias"],
  ["/health-tests/catalogo", "/health-tests/catalogo"],
  ["/health-tests/cobertura", "/health-tests/cobertura"],
  ["/health-tests/dofa", "/health-tests/dofa"],
  ["/health-tests/indicadores", "/health-tests/indicadores"],
  ["/health-tests/pacientes", "/health-tests/pacientes"],
  ["/health-tests", "/health-tests"],
  ["/health-tests/seguimiento", "/health-tests/seguimiento"],
  ["/inventory/entries", "/inventory/entries"],
  ["/inventory/exits", "/inventory/exits"],
  ["/inventory/movements", "/inventory/movements"],
  ["/inventory/new", "/inventory/new"],
  ["/inventory", "/inventory"],
  ["/inventory/reports", "/inventory/reports"],
  ["/media/new", "/media/new"],
  ["/media", "/media"],
  ["/nutrition", "/nutrition"],
  ["/patients/appointments", "/patients/appointments"],
  ["/patients/new", "/patients/new"],
  ["/patients", "/patients"],
  ["/patients/prescriptions", "/patients/prescriptions"],
  ["/people/importar", "/people/importar"],
  ["/people/new", "/people/new"],
  ["/program/adherencia", "/program/adherencia"],
  ["/program/clinica", "/program/clinica"],
  ["/program/dashboard", "/program/dashboard"],
  ["/program/gestion", "/program/gestion"],
  ["/roles/new", "/roles/new"],
  ["/roles", "/roles"],
  ["/settings", "/settings"],
  ["/sos/alertas", "/sos/alertas"],
  ["/store/featured", "/store/featured"],
  ["/store", "/store"],
  ["/store/preview", "/store/preview"],
  ["/users/nuevo", "/users/nuevo"],
  ["/users", "/users"],
  ["/wellness/assignments/new", "/wellness/assignments/new"],
  ["/wellness/assignments", "/wellness/assignments"],
  ["/wellness/exercise-routines/new", "/wellness/exercise-routines/new"],
  ["/wellness/exercise-routines", "/wellness/exercise-routines"],
  ["/wellness/nutrition-plans/new", "/wellness/nutrition-plans/new"],
  ["/wellness/nutrition-plans", "/wellness/nutrition-plans"],
] as const;
for (const [url, title] of cases) {
  test(`approved header and responsive workspace: ${url}`, async ({ page }) => {
    await mockPlatformStyleHttp(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      if (process.env.ERP_STYLE_DEBUG) console.log(url, e.message);
    });
    page.on("console", (m) => {
      if (process.env.ERP_STYLE_DEBUG && m.type() === "error")
        console.log(url, m.text().slice(0, 800));
    });
    await page.goto(url);
    if (url === "/health-tests/alertas/notificar")
      await expect(page).toHaveURL(/\/health-tests\/alertas$/);
    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible();
    const header = heading.locator("../..");
    expect(
      await header.evaluate((el) =>
        parseFloat(getComputedStyle(el).borderBottomLeftRadius),
      ),
      title,
    ).toBeGreaterThanOrEqual(16);
    await expect(header).toHaveAttribute("data-slot", "page-header");
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const over = await page.evaluate(() => {
        const main = document.querySelector("main")!;
        return {
          ok:
            document.documentElement.scrollWidth <= innerWidth &&
            main.scrollWidth <= main.clientWidth,
          offenders: [...main.querySelectorAll("*")]
            .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 8)
            .map((el) => ({
              tag: el.tagName,
              classes: el.className,
              text: el.textContent?.slice(0, 50),
            })),
        };
      });
      expect(over.ok, `${url} ${width} ${JSON.stringify(over.offenders)}`).toBe(
        true,
      );
      expect(
        await heading.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("shared metrics and panels follow the compact Copp dashboard language", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/inventory/reports");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cards = page.locator('[data-slot="stat-card"]');
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    expect((await card.boundingBox())!.height).toBeLessThanOrEqual(116);
    await expect(card).toHaveCSS("transform", "none");
    await card.hover();
    await expect(card).toHaveCSS("transform", "none");
  }
});

test("user summary filters keep their behavior with compact stationary cards", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/users");
  const active = page.getByRole("button", { name: /^Activos\b/ });
  await expect(active).toBeEnabled();
  await active.hover();
  await expect(active).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: /^Inactivos\b/ }).click();
  await expect(
    page.getByRole("button", { name: /^Inactivos\b/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await active.click();
  await expect(active).toHaveAttribute("aria-pressed", "true");
});

test("line tabs keep readable text and form selects align with the other fields", async ({
  page,
}) => {
  await mockPlatformStyleHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(
    page.getByRole("tab", { name: "Estado clínico", exact: true }),
  ).toHaveCSS("background-image", "none");
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("/wellness/exercise-routines/new");
  await expect(page.locator("#routine-name")).toBeVisible();
  const field = (await page.locator("#routine-name").boundingBox())!;
  const select = page.locator('[data-slot="select-trigger"]').first();
  expect((await select.boundingBox())!.width).toBeGreaterThanOrEqual(
    field.width - 2,
  );
  expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(40);
});
