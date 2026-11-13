import { test, expect } from "@playwright/test";
import { mockNutritionHttp } from "./fixtures/nutrition-http";
import {
  foreignProfilePatientId,
  mockProfile360Http,
  mockProfileProgramHttp,
  profilePatientId,
} from "./fixtures/profile360-http";

const profileUrl = `/patients/${profilePatientId}/360`;
const tabLabels = [
  "Resumen",
  "Plan semanal",
  "Nutrición",
  "Seguimiento",
  "Progreso",
];

test.describe("Fase 0 · navegación con HTTP sintético", () => {
  test("0.3/0.6 · URL directa, cinco pestañas y teclado en escritorio y móvil", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto(profileUrl);
    await expect(
      page.getByRole("heading", { name: "Paciente Perfil QA", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveText(tabLabels);
    await expect(
      page.getByRole("tab", { name: "Contenido", exact: true }),
    ).toHaveCount(0);
    const summary = page.getByRole("tab", { name: "Resumen", exact: true });
    const weekly = page.getByRole("tab", { name: "Plan semanal", exact: true });
    await summary.focus();
    await page.keyboard.press("ArrowRight");
    await expect(weekly).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(weekly).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tabpanel", { name: "Plan semanal", exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const label of tabLabels) {
      const tab = page.getByRole("tab", { name: label, exact: true });
      await expect(tab).toBeVisible();
      expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test("0.4 · redirecciones conservan paciente y retiran las vistas antiguas", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto("/program/gestion?view=perfil-360");
    await expect(page).toHaveURL(/\/patients$/);
    await page.goto(
      `/program/gestion?view=perfil-360&patient=${profilePatientId}`,
    );
    await expect(page).toHaveURL(new RegExp(`${profileUrl}$`));
    await expect(
      page.getByRole("heading", { name: "Paciente Perfil QA", exact: true }),
    ).toBeVisible();
    await page.goto("/program/gestion?view=contenido");
    await expect(page).toHaveURL(/\/program\/gestion\?view=plantillas$/);
    await expect(
      page.getByRole("tab", { name: "Contenido", exact: true }),
    ).toHaveCount(0);
    await page.goto(`/program/patients/${profilePatientId}`);
    await expect(page).toHaveURL(new RegExp(`${profileUrl}$`));
  });

  test("0.2 · Rutinas es un enlace único y conserva su ruta", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto(profileUrl);
    const routines = page.getByRole("link", { name: "Rutinas", exact: true });
    await expect(routines).toHaveCount(1);
    await expect(routines).toHaveAttribute(
      "href",
      "/wellness/exercise-routines",
    );
    await expect(
      page.getByRole("button", { name: "Bienestar", exact: true }),
    ).toHaveCount(0);
    await routines.click();
    await expect(page).toHaveURL(/\/wellness\/exercise-routines$/);
  });

  test("0.5 · la lista abre el Perfil 360 del paciente de esa fila", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto("/patients?tab=estado-clinico");
    const profile = page.locator(`a[href="${profileUrl}"]`);
    await expect(profile).toHaveAttribute("href", profileUrl);
    await profile.click();
    await expect(page).toHaveURL(new RegExp(`${profileUrl}$`));
    await expect(
      page.getByRole("heading", { name: "Paciente Perfil QA", exact: true }),
    ).toBeVisible();
  });

  test("0.5 · Nutrición enlaza el mismo id estable", async ({ page }) => {
    await mockNutritionHttp(page, [
      "Nutrition.Manage",
      "Program.Profile360View",
    ]);
    await mockProfileProgramHttp(page);
    await page.goto("/nutrition/demo-patient-2");
    const profile = page.getByRole("link", { name: "Perfil 360", exact: true });
    await expect(profile).toHaveAttribute(
      "href",
      "/patients/demo-patient-2/360",
    );
    await profile.click();
    await expect(page).toHaveURL(/\/patients\/demo-patient-2\/360$/);
  });

  test("0.7 · la tabla cuenta semanas y no muestra el plan legacy", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto(profileUrl);
    await page.getByRole("tab", { name: "Plan semanal", exact: true }).click();
    const panel = page.getByRole("tabpanel", {
      name: "Plan semanal",
      exact: true,
    });
    await expect(
      panel.getByText("Semanas del programa (12)", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByRole("columnheader")).toHaveText([
      "Semana",
      "Fecha",
      "Rutina de ejercicio",
      "Podcast de la semana",
    ]);
    await expect(panel.getByText("Caminata QA", { exact: true })).toBeVisible();
    await expect(
      panel.getByText("Plan que no debe aparecer en la tabla"),
    ).toHaveCount(0);
  });

  for (const [oldKey, label] of [
    ["gamificacion", "Progreso"],
    ["xp-ledger", "Progreso"],
    ["clinica", "Seguimiento"],
    ["controles", "Seguimiento"],
    ["contenido", "Plan semanal"],
  ]) {
    test(`0.6 · la selección ${oldKey} migra a ${label}`, async ({ page }) => {
      await mockProfile360Http(page);
      await page.addInitScript(
        (key) =>
          sessionStorage.setItem("program:charttab:perfil360:unified-v3", key),
        oldKey,
      );
      await page.goto(profileUrl);
      await expect(
        page.getByRole("tab", { name: label, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
    });
  }

  test("0.2/0.6 · etiquetas traducidas al inglés", async ({ page }) => {
    await mockProfile360Http(page, { english: true });
    await page.goto(profileUrl);
    await expect(page.getByRole("tab")).toHaveText([
      "Summary",
      "Weekly plan",
      "Nutrition",
      "Follow-up",
      "Progress",
    ]);
    await expect(
      page.getByRole("link", { name: "Routines", exact: true }),
    ).toHaveAttribute("href", "/wellness/exercise-routines");
  });

  test("0.3 · el permiso de Perfil 360 funciona sin abrir dashboards", async ({
    page,
  }) => {
    await mockProfile360Http(page, { permissions: ["Program.Profile360View"] });
    await page.goto(profileUrl);
    await expect(
      page.getByRole("heading", { name: "Paciente Perfil QA", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dashboard General", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Gestión del programa", exact: true }),
    ).toHaveCount(0);
  });

  test("0.3 · Program.View no concede acceso al Perfil 360", async ({
    page,
  }) => {
    const http = await mockProfile360Http(page, {
      permissions: ["Patients.View", "Program.View"],
    });
    await page.goto(profileUrl);
    await expect(
      page.getByText("Acceso denegado", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    expect(http.program.reads).toHaveLength(0);
  });

  test("0.14 · un 404 de alcance oculta identidad y pestañas", async ({
    page,
  }) => {
    await mockProfile360Http(page);
    await page.goto(`/patients/${foreignProfilePatientId}/360`);
    await expect(page.getByRole("alert")).toContainText(
      "Este paciente no está disponible o no tienes acceso a su perfil.",
    );
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(
      page.getByText("Paciente Perfil QA", { exact: true }),
    ).toHaveCount(0);
  });
});
