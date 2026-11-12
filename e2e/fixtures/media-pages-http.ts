import type { Page } from "@playwright/test";
import { mockPlatformStyleHttp } from "./platform-style-http";
export async function mockMediaPagesHttp(page: Page, { english = false } = {}) {
  const base = await mockPlatformStyleHttp(page, { english });
  const writes: { path: string; body: Record<string, unknown> }[] = [];
  let item = {
    id: "qa-media",
    title: "Remo Â· TÃ©cnica (demo)",
    description: "Video de tÃ©cnica para el ejercicio.",
    author: "Ângela García",
    mediaType: "Video",
    category: "SaludFisica",
    storageKey: "media/exercises/qa.mp4",
    thumbnailKey: null,
    contentType: "video/mp4",
    fileSizeBytes: 1024000,
    durationSecs: 15,
    status: "Published",
    sortOrder: 900,
    day: 0,
    month: 0,
    publishedAt: "2026-11-08T12:00:00Z",
    createdAt: "2026-11-08T12:00:00Z",
    updatedAt: null,
    createdBy: null,
    chapters: [],
    takeaways: [],
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname;
    const reply = (body: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (p === "/api/v1/media")
      return reply({
        items: [item],
        totalCount: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    if (p === "/api/v1/media/qa-media") {
      if (req.method() === "PUT") {
        const body = req.postDataJSON();
        writes.push({ path: p, body });
        item = { ...item, ...body };
      }
      return reply(item);
    }
    if (p === "/api/v1/storage/sign")
      return reply({ url: "/qa-media-preview.mp4" });
    return route.fallback();
  });
  await page.route("**/qa-media-preview.mp4", (route) =>
    route.fulfill({ contentType: "video/mp4", body: "" }),
  );
  return { ...base, writes };
}
