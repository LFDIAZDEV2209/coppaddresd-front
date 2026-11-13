import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import type { NutritionViewWire } from "../features/nutrition/types/nutrition-wire";

const captures = path.resolve(
  "test-results/nutrition-captures/cycles-design",
);

test("ciclos: agrupar versiones, abrir plan e historial y conservar bandeja", async ({
  page,
}) => {
  await mockNutritionHttp(page);
  await page.goto("/nutrition");
  const response = page.waitForResponse((response) =>
    /prescriptions\?/.test(response.url()),
  );
  await page.getByRole("link", { name: "María Demo", exact: true }).click();
  const original = (await (await response).json()) as NutritionViewWire[];
  await expect(
    page.getByRole("heading", { name: "Calendario del programa", exact: true }),
  ).toBeVisible();
  const template = original[0];
  const old = {
    ...template,
    id: "synthetic-previous",
    cycleId: "synthetic-cycle-previous",
    version: 2,
    state: "aprobado",
    isPublished: true,
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  } as NutritionViewWire;
  const older = {
    ...old,
    id: "synthetic-older-version",
    version: 1,
    isPublished: false,
  };
  await page.route(
    "**/nutrition/patients/demo-patient-1/prescriptions?*",
    (route) => route.fulfill({ json: [...original, old, older] }),
  );
  await page.route(
    "**/nutrition/patients/demo-patient-1/prescriptions/synthetic-**",
    (route) =>
      route.fulfill({
        json: route.request().url().endsWith("/history")
          ? [
              {
                id: "synthetic-history",
                prescriptionId: old.id,
                actorUserId: "synthetic-actor",
                occurredAt: "2026-09-01T14:00:00Z",
                action: "approve",
                revision: 2,
                comment: null,
                criticalCount: 0,
                criticalConfirmed: false,
                autoApproved: false,
                snapshotJson: '{"version":2}',
              },
            ]
          : route.request().url().endsWith("synthetic-previous")
            ? old
            : older,
      }),
  );
  // §19: el workspace queda igualmente interceptado para las vistas sintéticas.
  await page.route(
    "**/nutrition/patients/demo-patient-1/workspace?*",
    (route) => {
      const url = new URL(route.request().url());
      const id = url.searchParams.get("prescriptionId") ?? "";
      if (!id.startsWith("synthetic-")) return route.fallback();
      const reviewed = id === old.id ? old : older;
      return route.fulfill({
        json: {
          patientId: "demo-patient-1",
          patientName: "María Demo",
          patientDocument: "DEMO-0001",
          timezone: "America/Bogota",
          today: new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date()),
          profile: {
            hasMeasuredProfile: true,
            canGenerateWithoutManual: true,
            fields: {
              birthDate: {
                value: "1982-04-10",
                unit: null,
                source: "patient_profile",
              },
              age: {
                value: 44,
                unit: "years",
                source: "derived_from_birth_date",
              },
              sex: { value: "F", unit: null, source: "patient_profile" },
              weightKg: {
                value: 74.5,
                unit: "kg",
                source: "health_test_response",
              },
              heightCm: {
                value: 168,
                unit: "cm",
                source: "health_test_response",
              },
              bmi: {
                value: 26.4,
                unit: "kg/m2",
                source: "health_test_response",
              },
              hba1c: { value: 5.6, unit: "%", source: "health_test_response" },
              glucose: { value: null, unit: "mg/dl", source: "missing" },
              bodyFatPercent: { value: null, unit: "%", source: "missing" },
              movement: {
                value: "FLUJO",
                unit: null,
                source: "health_test_result",
              },
              nutritionRisk: {
                value: "bajo",
                unit: null,
                source: "health_test_result",
              },
              sleepLevel: {
                value: "consolidado",
                unit: null,
                source: "health_test_result",
              },
              sleepRiskFlags: { value: null, unit: "count", source: "missing" },
              testAdherence: {
                value: "A2",
                unit: null,
                source: "health_test_result",
              },
              cardiometabolicRisk: {
                value: "2",
                unit: null,
                source: "health_test_result",
              },
              stress: { value: null, unit: null, source: "missing" },
            },
            missingData: [
              "glucose",
              "bodyFatPercent",
              "sleepRiskFlags",
              "stress",
            ],
          },
          missingData: [
            "glucose",
            "bodyFatPercent",
            "sleepRiskFlags",
            "stress",
          ],
          generation: null,
          toReview: reviewed,
          currentPublished: old,
          history: {
            items: [
              {
                id: "synthetic-history",
                prescriptionId: old.id,
                actorUserId: "synthetic-actor",
                occurredAt: "2026-09-01T14:00:00Z",
                action: "approve",
                revision: 2,
                comment: null,
                criticalCount: 0,
                criticalConfirmed: false,
                autoApproved: false,
                snapshotJson: '{"version":2}',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 50,
          },
        },
      });
    },
  );
  await page.reload();
  const calendar = page.getByRole("list", {
    name: "Ciclos del programa",
    exact: true,
  });
  await expect(calendar.getByRole("listitem")).toHaveCount(2);
  await expect(
    page
      .getByRole("table", { name: "Planes y versiones por ciclo", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(2);
  // La zona llega del workspace (§19): el "hoy" solo se representa dentro del período.
  await expect(
    page.getByText("Zona del paciente pendiente: hoy no se representa.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Período finalizado", { exact: true }).first(),
  ).toBeVisible();
  for (const width of [1440, 1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.locator(".nutrition-program").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".nutrition-program")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    if (width !== 1366) {
      await mkdir(captures, { recursive: true });
      if (width !== 390)
        await page
          .locator(".nutrition-detail-panel")
          .evaluate((element) => (element.scrollTop = 0));
      await page.screenshot({
        path: path.join(
          captures,
          `ficha-ciclos${width === 390 ? "-mobile" : ""}.png`,
        ),
        animations: "disabled",
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Ver plan C1", exact: true }).click();
  await expect(page).toHaveURL(/prescriptionId=synthetic-previous/);
  await expect(
    page.getByRole("tab", { name: "Plan de 30 días", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".nutrition-patient-rail")).toBeVisible();
  await page
    .getByRole("tab", { name: "Resultados y ciclos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver historial C1", exact: true })
    .click();
  await expect(page.locator("#nutrition-audit-title")).toBeFocused();
  await expect(
    page.locator(".nutrition-audit").getByText("Plan aprobado", { exact: true }),
  ).toBeVisible();
});

test("exploración: cinco decisiones sin escrituras, teclado y capturas bilingües", async ({
  page,
}) => {
  await mockNutritionHttp(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /nutrition/.test(request.url()))
      writes.push(request.url());
  });
  await page.goto("/nutrition/cycles-preview");
  await expect(
    page.getByRole("heading", {
      name: "Exploración local de ciclos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Hoy · día 17 de 30", { exact: true }),
  ).toBeVisible();
  await mkdir(captures, { recursive: true });
  const metrics: unknown[] = [];
  const capture = async (name: string) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      if (name === "plan-por-ciclo")
        await page
          .getByRole("table", {
            name: "Planes y versiones por ciclo",
            exact: true,
          })
          .locator("tbody tr")
          .first()
          .scrollIntoViewIfNeeded();
      const dialog = page.getByRole("dialog");
      if (await dialog.count())
        await expect(
          dialog.getByRole("button", { name: /^Revisar/ }),
        ).toBeInViewport();
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        document: document.documentElement.scrollWidth,
        overflow: Array.from(
          document.querySelectorAll(".nutrition-program, [role=dialog]"),
        ).map((element) => ({
          width: element.clientWidth,
          scroll: element.scrollWidth,
        })),
      }));
      expect(geometry.document).toBeLessThanOrEqual(width);
      expect(
        geometry.overflow.every((element) => element.scroll <= element.width),
      ).toBe(true);
      metrics.push({ name, ...geometry });
      await page.screenshot({
        path: path.join(
          captures,
          `${name}${width === 390 ? "-mobile" : ""}.png`,
        ),
        animations: "disabled",
        fullPage: !(await dialog.count()),
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  };
  await capture("exploracion-calendario");
  await capture("plan-por-ciclo");
  const decisions = [
    "Repetir con variación",
    "Recalcular metas",
    "Pasar a mantenimiento",
    "Cerrar programa",
    "Registrar mediciones",
  ];
  for (const [index, decision] of decisions.entries()) {
    const trigger = page.getByRole("button", { name: decision, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await capture(`decision-${index + 1}`);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await page
    .getByRole("button", { name: "Registrar mediciones", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Fecha de medición", { exact: true })
    .fill("2026-11-01");
  await dialog.getByLabel("Hora de medición", { exact: true }).fill("09:30");
  await dialog
    .getByLabel("Origen de la medición", { exact: true })
    .selectOption("lab");
  await dialog
    .getByRole("button", { name: "Revisar mediciones", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Registra al menos una medición.",
  );
  await dialog.getByLabel("Peso (kg)", { exact: true }).fill("75");
  await dialog
    .getByRole("button", { name: "Revisar mediciones", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Vista previa local. No se guardaron cambios." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar programa", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await page.keyboard.press("Escape");
  expect(writes).toEqual([]);
  await writeFile(
    path.join(captures, "measurements.json"),
    JSON.stringify(
      {
        data: "HTTP sintético y fixtures de exploración; no acredita backend real",
        metrics,
        writes,
      },
      null,
      2,
    ),
    "utf8",
  );
});

test("exploración en inglés y modo oscuro sin claves nuevas ausentes", async ({
  page,
}) => {
  await mockNutritionHttp(page, undefined, { english: true });
  await page.goto("/nutrition/cycles-preview");
  await expect(
    page.getByRole("heading", { name: "Local cycle exploration", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page
    .getByRole("button", { name: "Repeat with variation", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Repeat with variation", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(captures, "variation-en-dark.png"),
    animations: "disabled",
  });
});

test("sin ciclos conserva creación existente y la exploración rechaza host remoto", async ({
  page,
  request,
}) => {
  await mockNutritionHttp(page);
  await page.goto("/nutrition");
  await page.getByRole("combobox", { name: "Estado del plan", exact: true }).selectOption("sin_plan");
  await page.getByRole("link", { name: "Diego Demo", exact: true }).click();
  await expect(
    page.getByText("Aún no hay ciclos para mostrar.", { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.screenshot({
      path: path.join(
        captures,
        `sin-ciclos${width === 390 ? "-mobile" : ""}.png`,
      ),
      animations: "disabled",
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Crear primera propuesta", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Plan de 30 días", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const response = await request.get("/nutrition/cycles-preview", {
    headers: { host: "example.invalid" },
  });
  expect(response.status()).toBe(404);
});
