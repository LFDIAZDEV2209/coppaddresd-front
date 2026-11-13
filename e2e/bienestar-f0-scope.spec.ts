import { test, expect } from "@playwright/test";
import { login } from "./fixtures/auth";
import type { NutritionWorkspaceWire } from "../features/nutrition/types/nutrition-wire";

function required(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Configura ${name} para comprobar el alcance real de la Fase 0.`,
    );
  return value;
}

/** Sin mocks: ejecutar por el orquestador después de 0.10a y 0.11c/0.11d. */
test("0.14 · nutricionista lee su paciente y recibe 404 para el ajeno", async ({
  page,
}) => {
  const own = required("E2E_F0_ASSIGNED_PATIENT_ID");
  const foreign = required("E2E_F0_FOREIGN_PATIENT_ID");
  expect(foreign).not.toBe(own);
  await login(
    page,
    required("E2E_F0_NUTRITIONIST_EMAIL"),
    required("E2E_F0_NUTRITIONIST_PASSWORD"),
  );

  const overviewPath = `/api/v1/program/erp/patients/${own}/overview`;
  const outgoing = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === overviewPath &&
      !!request.headers().authorization,
  );
  const incoming = page.waitForResponse(
    (response) => new URL(response.url()).pathname === overviewPath,
  );
  await page.goto(`/patients/${own}/360`);
  expect((await incoming).status()).toBe(200);
  await expect(page.getByRole("tab")).toHaveText([
    "Resumen",
    "Plan semanal",
    "Nutrición",
    "Seguimiento",
    "Progreso",
  ]);

  const request = await outgoing;
  const origin = new URL(request.url()).origin;
  const headers = request.headers();
  const authorized = {
    Authorization: headers.authorization,
    ...(headers["x-clinic-id"]
      ? { "X-Clinic-Id": headers["x-clinic-id"] }
      : {}),
  };
  let ownWorkspace: NutritionWorkspaceWire | null = null;
  for (const patientId of [own, foreign]) {
    for (const path of [
      `/api/v1/program/erp/patients/${patientId}/overview`,
      `/api/v1/nutrition/patients/${patientId}/workspace`,
    ]) {
      const response = await page.request.get(`${origin}${path}`, {
        headers: authorized,
      });
      expect(
        response.status(),
        "Permiso y alcance comprobados con el mismo token",
      ).toBe(patientId === own ? 200 : 404);
      if (patientId === own && path.endsWith("/workspace"))
        ownWorkspace = await response.json();
    }
  }

  // La misma respuesta protegida debe alimentar la tarjeta de solo lectura.
  await page.getByRole("tab", { name: "Nutrición", exact: true }).click();
  const nutrition = page.getByRole("tabpanel", {
    name: "Nutrición",
    exact: true,
  });
  const card = nutrition.getByRole("region", {
    name: "Nutrición vigente",
    exact: true,
  });
  await expect(card).toBeVisible();
  if (ownWorkspace?.currentPublished) {
    const current = ownWorkspace.currentPublished;
    const day =
      (Date.parse(`${ownWorkspace.today}T00:00:00Z`) -
        Date.parse(`${current.startDate}T00:00:00Z`)) /
        86_400_000 +
      1;
    await expect(card).toContainText(`día ${day} de 30`);
    const format = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
    await expect(card.getByRole("definition")).toHaveText([
      `${format.format(current.targets.k)} kcal`,
      `${format.format(current.targets.c)} g`,
      `${format.format(current.targets.p)} g`,
      `${format.format(current.targets.f)} g`,
      `${format.format(current.targets.fi)} g`,
      `${format.format(current.targets.vasos)} vasos`,
    ]);
  } else {
    await expect(card).toContainText(
      "Este paciente no tiene un plan nutricional publicado vigente.",
    );
  }
  await expect(card.getByRole("link")).toHaveAttribute(
    "href",
    `/nutrition/${own}`,
  );
  await expect(
    card.locator("input, textarea, select, [contenteditable=true]"),
  ).toHaveCount(0);

  const denied = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
      `/api/v1/program/erp/patients/${foreign}/overview`,
  );
  await page.goto(`/patients/${foreign}/360`);
  expect((await denied).status()).toBe(404);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Este paciente no está disponible o no tienes acceso a su perfil.",
  );
  await expect(page.getByRole("tab")).toHaveCount(0);
});
