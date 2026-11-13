import { test, expect } from "@playwright/test";
import { login } from "./fixtures/auth";

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
    }
  }

  const denied = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
      `/api/v1/program/erp/patients/${foreign}/overview`,
  );
  await page.goto(`/patients/${foreign}/360`);
  expect((await denied).status()).toBe(404);
  await expect(page.getByRole("alert")).toContainText(
    "Este paciente no está disponible o no tienes acceso a su perfil.",
  );
  await expect(page.getByRole("tab")).toHaveCount(0);
});
