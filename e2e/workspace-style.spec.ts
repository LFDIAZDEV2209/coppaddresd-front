import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { mockPatientsHttp } from "./fixtures/patients-http";

// Evidencia visual fuera del repositorio; todas las APIs usan datos sintéticos.
const captures = process.env.ERP_STYLE_CAPTURE_DIR;
async function capture(page: Page, name: string) {
  if (!captures) return;
  await mkdir(captures, { recursive: true });
  await page.screenshot({
    path: `${captures}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        document.querySelector("main")!.scrollWidth <=
          document.querySelector("main")!.clientWidth,
    ),
  ).toBe(true);
}

test("desktop: Copp colours, one work surface and stable chrome", async ({
  page,
}) => {
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  await page.locator("aside").hover();
  await capture(page, "desktop");
  const nav = page.getByRole("navigation", {
    name: "Navegación principal",
    exact: true,
  });
  const background = await nav.evaluate(
    (node) => getComputedStyle(node.closest("aside") ?? node).backgroundColor,
  );
  expect(background, "keep Copp's original light navigation surface").toBe(
    "rgb(255, 255, 255)",
  );
  const selected = nav.locator('a[aria-current="page"]');
  const brandGradient = await page
    .getByRole("heading", { name: "Pacientes", exact: true })
    .evaluate(
      (el) =>
        getComputedStyle(el.parentElement!.parentElement!).backgroundImage,
    );
  expect(brandGradient).toContain("linear-gradient");
  await expect(selected).toHaveCSS("background-image", brandGradient);
  const create = page.getByRole("button", {
    name: "Nuevo paciente",
    exact: true,
  });
  await expect(create).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(create).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    page.getByRole("button", { name: "Importar CSV", exact: true }),
  ).not.toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute(
    "href",
    "/patients",
  );
  const workspace = page.getByRole("region", {
    name: "Directorio clínico",
    exact: true,
  });
  await expect(workspace.getByLabel("Buscar pacientes")).toBeVisible();
  await expect(workspace.getByRole("table")).toBeVisible();
  expect(
    await page
      .getByRole("heading", { name: "Pacientes", exact: true })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(24);
  const topbar = page.locator("header").first();
  const before = await topbar.evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    image: getComputedStyle(el).backgroundImage,
  }));
  await page.locator("main").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect
    .poll(() =>
      topbar.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        image: getComputedStyle(el).backgroundImage,
      })),
    )
    .toEqual(before);
  expect(before.image).toBe("none");
  await noPageOverflow(page);
});

test("filters, pagination and geographic context survive shell changes", async ({
  page,
}) => {
  const api = await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
  await page.mouse.move(700, 200);
  await expect(page.locator("aside")).toHaveCSS("width", "80px");
  await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
  const rail = page.locator("aside");
  const brand = rail.getByRole("link", { name: "Copp Adresd", exact: true });
  await expect
    .poll(
      async () => {
        const railBox = await rail.boundingBox();
        const logoBox = await brand.locator("img").boundingBox();
        return Math.abs(
          logoBox!.x + logoBox!.width / 2 - (railBox!.x + railBox!.width / 2),
        );
      },
      { message: "The Copp logo stays centred in the collapsed rail" },
    )
    .toBeLessThan(1.5);
  expect(
    (await brand.locator("img").boundingBox())!.width,
    "The original logo remains readable with its transparent margins",
  ).toBeGreaterThanOrEqual(48);
  await capture(page, "desktop-collapsed");
  await page.locator("aside").hover();
  await expect(page.locator("aside")).toHaveCSS("width", "256px");
  await page.goto("/patients?tab=estado-clinico&state=CA");
  await page.getByLabel("Buscar pacientes").fill("María Fernanda");
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
  await page.mouse.move(700, 200);
  await expect(page.locator("aside")).toHaveCSS("width", "80px");
  await expect(page.getByLabel("Buscar pacientes")).toHaveValue(
    "María Fernanda",
  );
  await expect(page).toHaveURL(/tab=estado-clinico&state=CA/);
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.getByLabel("Buscar pacientes")).toHaveValue("");
  await expect(page).toHaveURL(/tab=estado-clinico$/);
  const summary = page.getByRole("region", { name: "Resumen clínico" });
  await summary.getByRole("button", { name: /Riesgo alto/ }).click();
  await expect(
    summary.getByRole("button", { name: /Riesgo alto/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => api.gets.some((entry) => entry.query.risk === "high"))
    .toBe(true);
  await page
    .getByRole("button", { name: /Acciones para / })
    .first()
    .click();
  await expect(page.getByRole("menuitem", { name: "Ver ficha" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(api.writes).toHaveLength(0);
});

test("mobile: contained table and accessible drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  await capture(page, "mobile");
  await noPageOverflow(page);
  const opener = page.getByRole("button", { name: "Abrir menú", exact: true });
  await opener.click();
  const drawer = page.getByRole("dialog", {
    name: "Navegación principal",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(
    drawer.getByRole("navigation").locator('a[aria-current="page"]'),
  ).toHaveAttribute("href", "/patients");
  await capture(page, "mobile-menu");
  await page.keyboard.press("Shift+Tab");
  expect(
    await drawer.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole("button", { name: "Cerrar menú", exact: true }).click();
  await expect(opener).toBeFocused();
  await page
    .getByRole("region", { name: "Directorio clínico", exact: true })
    .evaluate((node) => node.scrollIntoView({ block: "start" }));
  await capture(page, "mobile-directory");
});

test("keyboard tabs, tablet, English and dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await mockPatientsHttp(page, { english: true });
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  await capture(page, "tablet-en");
  const clinical = page.getByRole("tab", {
    name: "Clinical status",
    exact: true,
  });
  await clinical.focus();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Overview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(clinical).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await noPageOverflow(page);
  await capture(page, "tablet-dark-en");
});

test("empty and recoverable error states keep filters usable", async ({
  page,
}) => {
  const api = await mockPatientsHttp(page, { boardUnavailable: true });
  await page.goto("/patients?tab=estado-clinico");
  await expect(
    page.getByText("No pudimos cargar el tablero clínico", { exact: true }),
  ).toBeVisible();
  await capture(page, "error");
  api.recoverBoard();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("Buscar pacientes").fill("sin-resultados-qa");
  await expect(
    page.getByText("Sin resultados con los filtros", { exact: true }),
  ).toBeVisible();
  await capture(page, "empty");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("own-patient permissions keep management actions hidden", async ({
  page,
}) => {
  const api = await mockPatientsHttp(page, {
    permissions: ["Patients.ViewOwn"],
  });
  await page.goto("/patients?tab=estado-clinico");
  await expect(
    page.getByRole("heading", { name: "Mis pacientes", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nuevo paciente", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /Acciones para / })
    .first()
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("menuitem", { name: "Eliminar", exact: true }),
  ).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
});

test("loading and denied access remain explicit", async ({ page }) => {
  await mockPatientsHttp(page, { initialBoardDelayMs: 1800 });
  await page.goto("/patients?tab=estado-clinico");
  await expect(
    page.getByLabel("Cargando pacientes", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.unroute("**/api/**");
  const api = await mockPatientsHttp(page, { permissions: [] });
  await page.reload();
  await expect(
    page.getByText("Acceso denegado", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(
    api.gets.filter((request) => request.path.startsWith("/api/v1/patients/")),
  ).toHaveLength(0);
});

test("narrow phone and tablet keep navigation and filters readable", async ({
  page,
}) => {
  const api = await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await noPageOverflow(page);
    const tabs = page.getByRole("tablist", { name: "Secciones de pacientes" });
    expect(await tabs.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    for (const label of [
      "Buscar pacientes",
      "Filtrar por riesgo",
      "Filtrar por aseguradora",
    ]) {
      const control = page.getByLabel(label, { exact: true });
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(40);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  }
  expect(api.writes).toHaveLength(0);
});

test("desktop sidebar automatically resizes the responsive workspace", async ({
  page,
}) => {
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  const rail = page.locator("aside");
  const main = page.locator("main");
  await expect(
    page.getByRole("button", { name: /^(Expandir|Colapsar) sidebar$/ }),
  ).toHaveCount(0);
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.mouse.move(700, 200);
    await expect(rail).toHaveCSS("width", "80px");
    const initial = (await main.boundingBox())!;
    await rail.hover();
    const overlaps = await page.evaluate(async () => {
      const samples: number[] = [];
      for (let frame = 0; frame < 16; frame++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        samples.push(
          document.querySelector("aside")!.getBoundingClientRect().right -
            document.querySelector("main")!.getBoundingClientRect().left,
        );
      }
      return samples;
    });
    expect(
      Math.max(...overlaps),
      "navigation never overlaps the workspace during expansion",
    ).toBeLessThanOrEqual(1);
    await expect(rail).toHaveCSS("width", "256px");
    const resized = (await main.boundingBox())!;
    expect(resized.x).toBe(256);
    expect(resized.width).toBe(width - 256);
    expect(resized.width).toBeLessThan(initial.width);
    if (width <= 1280) {
      expect(
        (await page
          .getByLabel("Filtrar por riesgo", { exact: true })
          .boundingBox())!.width,
        "filters adapt to the available workspace",
      ).toBeGreaterThanOrEqual(180);
    }
    await noPageOverflow(page);
    await capture(page, `responsive-${width}`);
    await page.mouse.move(700, 200);
    await expect(rail).toHaveCSS("width", "80px");
    expect((await main.boundingBox())!.x).toBe(initial.x);
    expect((await main.boundingBox())!.width).toBe(initial.width);
  }
});

test("keyboard focus and the account menu keep automatic navigation open", async ({
  page,
}) => {
  await page.mouse.move(700, 200);
  await mockPatientsHttp(page);
  await page.goto("/patients?tab=estado-clinico");
  await expect(page.getByRole("table")).toBeVisible();
  await page.mouse.move(700, 200);
  const rail = page.locator("aside");
  const brand = rail.getByRole("link", { name: "Copp Adresd", exact: true });
  await page
    .getByRole("link", { name: "Ir al contenido", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(brand).toBeFocused();
  await expect(rail).toHaveCSS("width", "256px");
  await page.keyboard.press("Tab");
  expect(
    await rail.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  await page.getByLabel("Buscar pacientes", { exact: true }).focus();
  await expect(rail).toHaveCSS("width", "80px");
  await rail.hover();
  await rail.getByRole("button", { name: "Mi perfil", exact: true }).click();
  const menu = page.getByRole("menu");
  await menu.hover();
  await expect(menu).toBeVisible();
  await expect(rail).toHaveCSS("width", "256px");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.getByLabel("Buscar pacientes", { exact: true }).focus();
  await page.mouse.move(700, 200);
  await expect(rail).toHaveCSS("width", "80px");
});

test("touch desktop keeps full navigation and phone keeps the drawer", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await mockPatientsHttp(page);
    await page.goto("/patients?tab=estado-clinico");
    await expect(page.getByRole("table")).toBeVisible();
    expect(
      await page.evaluate(
        () => matchMedia("(hover: hover) and (pointer: fine)").matches,
      ),
    ).toBe(false);
    await expect(page.locator("aside")).toHaveCSS("width", "256px");
    expect((await page.locator("main").boundingBox())!.x).toBe(256);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("aside")).toBeHidden();
    await page.getByRole("button", { name: "Abrir menú", exact: true }).tap();
    await expect(
      page.getByRole("dialog", { name: "Navegación principal", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cerrar menú", exact: true }).tap();
    await expect(
      page.getByRole("dialog", { name: "Navegación principal", exact: true }),
    ).toBeHidden();
    await noPageOverflow(page);
  } finally {
    await context.close();
  }
});

test("hybrid desktop supports touch opening and outside dismissal", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
  });
  try {
    // Chromium emula touch como puntero primario: simular la capacidad de un
    // portátil híbrido conserva taps reales y fuerza solo la media query del ratón.
    await context.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const media = original(query);
        if (query !== "(hover: hover) and (pointer: fine)") return media;
        return new Proxy(media, {
          get(target, property) {
            if (property === "matches") return true;
            const value = Reflect.get(target, property, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      };
    });
    const page = await context.newPage();
    await mockPatientsHttp(page);
    await page.goto("/patients?tab=estado-clinico");
    await expect(page.getByRole("table")).toBeVisible();
    await page.mouse.move(700, 200);
    const rail = page.locator("aside");
    await expect(rail).toHaveCSS("width", "80px");
    await rail.getByRole("button", { name: "Gestión", exact: true }).tap();
    await expect(rail).toHaveCSS("width", "256px");
    await expect(
      rail.getByRole("link", { name: "Pacientes", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Buscar pacientes", { exact: true }).tap();
    await expect(rail).toHaveCSS("width", "80px");
  } finally {
    await context.close();
  }
});
