import { test, expect, type Page } from "@playwright/test";

const routineId = "11111111-1111-4111-8111-111111111111";
const videoId = "22222222-2222-4222-8222-222222222222";
const imageId = "33333333-3333-4333-8333-333333333333";
const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK8sAAAAASUVORK5CYII=", "base64");
const routine = {
  id: routineId, name: "Rutina clínica de prueba", description: "Datos sintéticos", difficulty: "Facil",
  estimatedMinutes: 10, category: "Fuerza", status: "Active", targetMuscles: "Piernas", equipment: "Silla",
  warmupNotes: "Indicaciones de prueba", cooldownNotes: null, mediaId: videoId,
  createdAt: "2026-11-01T12:00:00Z", updatedAt: null, createdBy: null,
  exercises: [{ id: "44444444-4444-4444-8444-444444444444", name: "Movimiento de prueba", description: "Técnica prescrita",
    sets: 3, repetitions: 10, restSeconds: 30, durationSecs: 60, weightKg: 2,
    targetMuscle: "Piernas", equipment: "Silla", tempo: "2-1-2", rpe: 4, tips: "Indicaciones clínicas de prueba",
    mediaId: imageId, sortOrder: 0 }],
};
const medium = (id: string, mediaType = "Image") => ({
  id, title: mediaType === "Image" ? "Imagen técnica de prueba" : "Vídeo técnico de prueba", mediaType,
  storageKey: `media/test/${id}.png`, contentType: mediaType === "Image" ? "image/png" : "video/mp4",
  status: "Published", category: "SaludFisica", author: "Equipo de prueba", description: null,
  thumbnailKey: null, fileSizeBytes: 100, durationSecs: mediaType === "Image" ? null : 60,
  day: 0, month: 0, sortOrder: 0, createdAt: "2026-11-01T12:00:00Z", updatedAt: null,
});

async function mockApi(page: Page) {
  const writes: { path: string; method: string; body: Record<string, unknown> }[] = [];
  await page.route("**/qa-exercise.png", (route) => route.fulfill({ contentType: "image/png", body: imageBytes }));
  // Todas las peticiones API se interceptan, incluidas las escrituras. Esta
  // prueba no crea pacientes, publica medios ni modifica rutinas reales.
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    const method = request.method();
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/auth/refresh") return reply({ accessToken: "synthetic-test-token", expiresIn: 3600 });
    if (path === "/api/auth/me") return reply({ id: routineId, email: "qa@example.invalid", firstName: "QA", lastName: "Sintético", roles: ["Admin"],
      permissions: ["Wellness.View", "Wellness.Manage", "Media.View", "Media.Create", "Media.Publish"] });
    if (path === "/api/v1/me/context") return reply({ userId: routineId, employeeId: null, professionalId: null, organization: null,
      isProfessional: false, professionalTypeName: null, onboardingCompleted: true, employeeStatus: "Active", clinics: [], activeClinicId: null });
    if (path === "/api/v1/storage/sign") return reply({ url: `${url.origin}/qa-exercise.png` });
    if (path === "/api/v1/media/upload-intent") return reply({ storageKey: "media/thumbnails/new.png", presignedUrl: `${url.origin}/api/v1/storage/new.png`, expiresInSeconds: 900 });
    if (path === "/api/v1/storage/new.png" && method === "PUT") return route.fulfill({ status: 204 });
    if (path === "/api/v1/media" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>; writes.push({ path, method, body });
      return reply({ ...medium(imageId), ...body, id: imageId });
    }
    if (path === `/api/v1/media/${imageId}/publish`) { writes.push({ path, method, body: {} }); return reply({ id: imageId, status: "Published" }); }
    if (path === "/api/v1/media") {
      const type = url.searchParams.get("mediaType") ?? "Image";
      return reply({ items: [medium(type === "Image" ? imageId : videoId, type)], totalCount: 1, page: 1, pageSize: 20, totalPages: 1 });
    }
    if (path === `/api/v1/media/${imageId}` || path === `/api/v1/media/${videoId}`) return reply(medium(path.endsWith(imageId) ? imageId : videoId, path.endsWith(imageId) ? "Image" : "Video"));
    if (path === "/api/v1/wellness/exercise-routines" && method === "GET") return reply({ data: [routine], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    if (path === `/api/v1/wellness/exercise-routines/${routineId}` && method === "GET") return reply(routine);
    if (path.startsWith("/api/v1/wellness/exercise-routines") && ["POST", "PUT"].includes(method)) {
      const body = request.postDataJSON() as Record<string, unknown>; writes.push({ path, method, body }); return reply({ ...routine, ...body });
    }
    return reply({}, 404);
  });
  return writes;
}

test("editing keeps exercise demonstration and routine cover", async ({ page }, testInfo) => {
  const writes = await mockApi(page);
  await page.goto("/wellness/exercise-routines");
  await page.getByTitle("Editar", { exact: true }).click();
  await expect(page.getByLabel("Nombre del ejercicio *")).toHaveValue("Movimiento de prueba");
  await page.screenshot({ path: testInfo.outputPath("exercise-erp-edit-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => writes.find((entry) => entry.method === "PUT")?.body).toMatchObject({
    mediaId: videoId, exercises: [{ mediaId: imageId, name: "Movimiento de prueba", weightKg: 2, tempo: "2-1-2", rpe: 4 }],
  });
});

test("new routine uploads, publishes and attaches a real image with mobile scrolling", async ({ page }, testInfo) => {
  const writes = await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/wellness/exercise-routines/new");
  await page.locator("#routine-name").fill("Rutina visual de prueba");
  await page.getByRole("button", { name: "Agregar ejercicio", exact: true }).click();
  await page.getByLabel("Nombre del ejercicio *").fill("Movimiento con demostración");
  await page.getByLabel("Subir imagen o vídeo").setInputFiles({ name: "demostracion.png", mimeType: "image/png", buffer: imageBytes });
  await expect.poll(() => writes.some((entry) => entry.path.endsWith("/publish"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("exercise-erp-create-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Crear rutina", exact: true }).click();
  await expect.poll(() => writes.find((entry) => entry.path === "/api/v1/wellness/exercise-routines")?.body).toMatchObject({
    exercises: [{ name: "Movimiento con demostración", mediaId: imageId }],
  });
  expect(writes.find((entry) => entry.path === "/api/v1/media")?.body).toMatchObject({ mediaType: "Image", durationSecs: null, status: "Draft", contentType: "image/png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("routine detail displays the configured demonstration with its exercise", async ({ page }, testInfo) => {
  await mockApi(page);
  await page.goto("/wellness/exercise-routines");
  await page.getByTitle("Ver detalles", { exact: true }).click();
  const demonstration = page.getByRole("region", { name: "Movimiento de prueba", exact: true })
    .getByRole("img", { name: "Movimiento de prueba", exact: true });
  await expect(demonstration).toBeVisible();
  await expect.poll(() => demonstration.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("exercise-erp-detail-desktop.png"), fullPage: true });
});
