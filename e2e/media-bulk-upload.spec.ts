import { test, expect, type Page } from "@playwright/test";
import { mockPatientsHttp } from "./fixtures/patients-http";
import type { MediaInput, MediaItem } from "../features/media/types";

/** WAV PCM real de un segundo para ejercitar la detección HTML5 de duración. */
function audioFile(name: string) {
  const buffer = Buffer.alloc(44 + 16_000);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(16000, 40);
  return { name, mimeType: "audio/wav", buffer };
}

async function mockBulkHttp(page: Page, writable = true) {
  await mockPatientsHttp(page, {
    permissions: writable
      ? ["Media.View", "Media.Create", "Media.Edit", "Media.Publish"]
      : ["Media.View"],
  });
  const store = new Map<string, MediaItem>();
  const filenames = new Map<string, string>();
  const creates: string[] = [];
  const publishes: string[] = [];
  const uploads: string[] = [];
  const updates: MediaInput[] = [];
  let failCreate = true;
  let losePublishResponse = true;
  const intents: string[] = [];
  await page.route("**/api/v1/storage/**", (route) => {
    uploads.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/v1/media**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (method !== "GET" && !writable) return reply({}, 403);
    if (path.endsWith("/upload-intent")) {
      const input = request.postDataJSON();
      intents.push(input.fileName);
      const storageKey = `media/audio/test-${intents.length}.wav`;
      filenames.set(storageKey, input.fileName);
      return reply({
        storageKey,
        presignedUrl: `${new URL(page.url()).origin}/api/v1/storage/${storageKey}`,
        expiresInSeconds: 900,
      });
    }
    if (path === "/api/v1/media" && method === "POST") {
      const input = request.postDataJSON() as MediaInput;
      const name = filenames.get(input.storageKey)!;
      creates.push(name);
      if (name === "episodio_5.wav" && failCreate) {
        failCreate = false;
        return reply(
          { detail: "Error controlado al registrar el quinto archivo." },
          422,
        );
      }
      const id =
        Array.from(store.values()).find(
          (item) => item.storageKey === input.storageKey,
        )?.id ??
        `00000000-0000-4000-8000-${String(store.size + 1).padStart(12, "0")}`;
      const item: MediaItem = {
        ...input,
        id,
        publishedAt: null,
        createdAt: "2026-11-13T12:00:00Z",
        updatedAt: null,
        createdBy: null,
      };
      store.set(id, item);
      return reply(item, 201);
    }
    const match = path.match(/^\/api\/v1\/media\/([^/]+)(\/publish)?$/);
    if (!match) return reply({}, 404);
    const item = store.get(match[1]);
    if (!item) return reply({}, 404);
    if (method === "GET") return reply(item);
    if (method === "PUT") {
      const input = request.postDataJSON() as MediaInput;
      updates.push(input);
      Object.assign(item, input);
      return reply(item);
    }
    if (method === "POST" && match[2]) {
      publishes.push(item.id);
      item.status = "Published";
      if (
        filenames.get(item.storageKey) === "episodio_3.wav" &&
        losePublishResponse
      ) {
        losePublishResponse = false;
        return reply({ detail: "Respuesta perdida después de publicar." }, 503);
      }
      return reply({
        id: item.id,
        status: item.status,
        publishedAt: "2026-11-13T12:00:00Z",
        validation: {
          storageKeyVerified: true,
          thumbnailVerified: false,
          durationSecs: 1,
          fileSizeBytes: item.fileSizeBytes,
        },
      });
    }
    return reply({}, 405);
  });
  return { store, creates, publishes, uploads, updates, intents };
}

test("1.19 · cinco audios, fallo parcial, edición y reintento sin repetir los correctos", async ({
  page,
}) => {
  const http = await mockBulkHttp(page);
  await page.goto("/media/new?mode=bulk");
  await page
    .getByLabel("Seleccionar varios archivos", { exact: true })
    .setInputFiles(
      Array.from({ length: 5 }, (_, index) =>
        audioFile(`episodio_${index + 1}.wav`),
      ),
    );
  for (let index = 1; index <= 5; index++) {
    await expect(
      page.getByLabel(`Título de episodio_${index}.wav`, { exact: true }),
    ).toHaveValue(`episodio ${index}`);
    await page
      .getByLabel(`Autor de episodio_${index}.wav`, { exact: true })
      .fill("Autor QA");
  }
  const table = page.getByRole("table", {
    name: "Archivos del lote",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Guardar borradores", exact: true })
    .click();
  await expect(table.getByText("Borrador listo", { exact: true })).toHaveCount(
    4,
  );
  const failed = table
    .getByRole("row")
    .filter({
      has: page.getByRole("textbox", {
        name: "Título de episodio_5.wav",
        exact: true,
      }),
    });
  await expect(failed.getByRole("alert")).toContainText("Error controlado");
  await failed.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(table.getByText("Borrador listo", { exact: true })).toHaveCount(
    5,
  );
  expect(http.intents).toHaveLength(5);
  expect(http.uploads).toHaveLength(5);
  expect(http.creates).toEqual([
    "episodio_1.wav",
    "episodio_2.wav",
    "episodio_3.wav",
    "episodio_4.wav",
    "episodio_5.wav",
    "episodio_5.wav",
  ]);
  await page
    .getByLabel("Título de episodio_1.wav", { exact: true })
    .fill("Primer episodio revisado");
  await page
    .getByLabel("Categoría de episodio_1.wav", { exact: true })
    .selectOption("Habitos");
  await page.getByRole("button", { name: /^Publicar \d+ listos$/ }).click();
  await expect(table.getByText("Publicado", { exact: true })).toHaveCount(4);
  const lostResponse = table
    .getByRole("row")
    .filter({
      has: page.getByRole("textbox", {
        name: "Título de episodio_3.wav",
        exact: true,
      }),
    });
  await expect(
    lostResponse.getByRole("button", { name: "Reintentar", exact: true }),
  ).toBeVisible();
  await lostResponse
    .getByRole("button", { name: "Reintentar", exact: true })
    .click();
  await expect(table.getByText("Publicado", { exact: true })).toHaveCount(5);
  expect(http.publishes).toHaveLength(5);
  expect(http.updates).toHaveLength(1);
  expect(http.updates[0]).toMatchObject({
    title: "Primer episodio revisado",
    category: "Habitos",
    status: "Draft",
  });
  expect(http.store.size).toBe(5);
  await expect(
    page.getByLabel("Título de episodio_1.wav", { exact: true }),
  ).toBeDisabled();
});

test("1.19 · lectura no autoriza subir ni publicar", async ({ page }) => {
  const http = await mockBulkHttp(page, false);
  await page.goto("/media/new?mode=bulk");
  await expect(
    page.getByLabel("Seleccionar varios archivos", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Guardar borradores", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Publicar \d+ listos$/ }),
  ).toBeDisabled();
  expect(http.creates).toHaveLength(0);
  expect(http.publishes).toHaveLength(0);
});

test("1.19 · tabla accesible en móvil y traducción al inglés", async ({
  page,
}, testInfo) => {
  await mockBulkHttp(page);
  await page.goto("/media/new?mode=bulk");
  await page
    .getByLabel("Seleccionar varios archivos", { exact: true })
    .setInputFiles([
      audioFile("sesion_respiracion_consciente.wav"),
      audioFile("alimentacion_consciente.wav"),
    ]);
  await page.screenshot({
    path: testInfo.outputPath("bulk-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const region = page.getByRole("region", {
    name: "Archivos del lote",
    exact: true,
  });
  await region.focus();
  await expect(region).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("bulk-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Cambiar idioma a English", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Upload podcasts",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save drafts", exact: true }),
  ).toBeVisible();
});

test("1.18 · el formulario individual no pide día ni mes y enlaza la carga múltiple", async ({
  page,
}) => {
  await mockBulkHttp(page);
  await page.goto("/media/new");
  await expect(
    page.getByRole("textbox", { name: "Título", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Día", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Mes", { exact: true })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Carga múltiple de podcasts", exact: true })
    .click();
  await expect(page).toHaveURL(/\/media\/new\?mode=bulk$/);
});
