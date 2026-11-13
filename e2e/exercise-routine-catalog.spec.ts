import { test, expect, type Page } from "@playwright/test";
import { mockPatientsHttp } from "./fixtures/patients-http";
import type {
  CreateExerciseRoutineInput,
  ExerciseRoutine,
  RoutineExercise,
} from "../features/wellness/types";

const exercise: RoutineExercise = {
  id: "exercise-source",
  name: "Marcha en el lugar",
  description: "Eleva las rodillas con suavidad.",
  sets: 3,
  repetitions: 12,
  restSeconds: 30,
  durationSecs: 40,
  weightKg: 0,
  targetMuscle: "Piernas",
  equipment: "Sin equipo",
  tempo: "2-1-2",
  rpe: 4,
  tips: "Respira de forma natural.",
  mediaId: "demo-source",
  sortOrder: 2,
};
const routine: ExerciseRoutine = {
  id: "routine-source",
  name: "Cardio activo",
  description: "Rutina de catálogo",
  difficulty: "Moderado",
  estimatedMinutes: 30,
  category: "Cardio",
  status: "Active",
  targetMuscles: "Piernas",
  equipment: null,
  warmupNotes: null,
  cooldownNotes: null,
  mediaId: null,
  createdBy: null,
  createdAt: "2026-11-13T12:00:00Z",
  updatedAt: null,
  exercises: [exercise],
};

async function fixture(page: Page, failDetail = false) {
  await mockPatientsHttp(page, {
    permissions: [
      "Nutrition.Manage",
      "Wellness.View",
      "Wellness.Manage",
      "Media.View",
    ],
  });
  const writes: CreateExerciseRoutineInput[] = [];
  const details: string[] = [];
  const lists: URL[] = [];
  const patientRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/patients"))
      patientRequests.push(request.url());
  });
  // React Strict Mode monta el efecto de lectura dos veces en desarrollo.
  let failuresRemaining = failDetail ? 2 : 0;
  await page.route("**/api/v1/media/demo-source", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Demostración no disponible en esta prueba.",
      }),
    }),
  );
  await page.route("**/api/v1/wellness/exercise-routines**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const reply = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "POST") {
      const input = request.postDataJSON() as CreateExerciseRoutineInput;
      writes.push(input);
      return reply({ ...routine, ...input, id: "created-routine" }, 201);
    }
    if (url.pathname.endsWith("/routine-source")) {
      details.push(url.pathname);
      if (failuresRemaining > 0) {
        failuresRemaining -= 1;
        return reply({ detail: "Fallo controlado" }, 422);
      }
      return reply(routine);
    }
    lists.push(url);
    const matches =
      !url.searchParams.get("search") ||
      routine.name
        .toLocaleLowerCase()
        .includes(url.searchParams.get("search")!.toLocaleLowerCase());
    return reply({
      data: matches ? [routine] : [],
      total: matches ? 1 : 0,
      page: 1,
      pageSize: 10,
      totalPages: matches ? 1 : 0,
    });
  });
  return { writes, details, lists, patientRequests };
}

test("2.20a · copia un ejercicio del catálogo y crea la rutina sin asignar paciente", async ({
  page,
}) => {
  const http = await fixture(page);
  await page.goto("/wellness/exercise-routines/new");
  await expect(
    page.getByText("Paciente (opcional)", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generar rutina con IA", exact: true }),
  ).toHaveCount(0);
  await page.locator("#routine-name").fill("Rutina reutilizada");
  await page
    .getByRole("button", { name: "Elegir de la biblioteca", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Elegir de la biblioteca",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Cardio activo", exact: true })
    .click();
  await dialog
    .getByRole("button", {
      name: "Seleccionar Marcha en el lugar",
      exact: true,
    })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Nombre del ejercicio *", exact: true }),
  ).toHaveValue(exercise.name);
  await expect(
    page.getByRole("spinbutton", { name: "Series", exact: true }),
  ).toHaveValue("3");
  await page.getByRole("spinbutton", { name: "Series", exact: true }).fill("4");
  await page.getByRole("button", { name: "Crear rutina", exact: true }).click();
  await expect.poll(() => http.writes.length).toBe(1);
  expect(http.writes[0]).not.toHaveProperty("patientId");
  expect(http.writes[0].status).toBe("Draft");
  expect(http.writes[0].exercises).toEqual([
    {
      name: exercise.name,
      description: exercise.description,
      sets: 4,
      repetitions: 12,
      restSeconds: 30,
      durationSecs: 40,
      weightKg: 0,
      targetMuscle: "Piernas",
      equipment: "Sin equipo",
      tempo: "2-1-2",
      rpe: 4,
      tips: exercise.tips,
      mediaId: "demo-source",
      sortOrder: 0,
    },
  ]);
  expect([...new Set(http.details)]).toEqual(["/api/v1/wellness/exercise-routines/routine-source"]);
  expect(http.patientRequests).toEqual([]);
});

test("2.20a · búsqueda, detalle fallido y reintento accesible en móvil", async ({
  page,
}, testInfo) => {
  const http = await fixture(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wellness/exercise-routines/new");
  await page
    .getByRole("button", { name: "Elegir de la biblioteca", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Elegir de la biblioteca",
    exact: true,
  });
  const search = dialog.getByRole("textbox", { name: "Rutina", exact: true });
  await search.fill("inexistente");
  await expect(
    dialog.getByText("Sin resultados", { exact: true }),
  ).toBeVisible();
  await search.fill("Cardio");
  await dialog
    .getByRole("button", { name: "Cardio activo", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "No se pudo cargar el detalle",
  );
  await dialog.getByRole("button", { name: "Reintentar", exact: true }).click();
  const select = dialog.getByRole("button", {
    name: "Seleccionar Marcha en el lugar",
    exact: true,
  });
  await expect(select).toBeVisible();
  await select.focus();
  await expect(select).toBeFocused();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog-mobile.png"),
    fullPage: true,
  });
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Nombre del ejercicio *", exact: true }),
  ).toHaveValue(exercise.name);
  expect(http.details.length).toBeGreaterThanOrEqual(3);
  expect(http.writes).toHaveLength(0);
  expect(
    http.lists.some((url) => url.searchParams.get("search") === "Cardio"),
  ).toBe(true);
});
