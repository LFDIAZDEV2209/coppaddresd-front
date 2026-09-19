import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

const STUB_PATH = path.join(
  process.cwd(),
  "e2e",
  "stubs",
  "twilio-video.stub.js",
);

/**
 * Intercepta el CDN del SDK de Twilio y sirve el stub local. Devuelve un
 * contador para verificar que el loader de producción realmente pasó por acá.
 */
export async function stubTwilioVideo(
  page: Page,
): Promise<{ wasServed: () => boolean }> {
  const source = readFileSync(STUB_PATH, "utf8");
  let served = false;
  await page.route("https://sdk.twilio.com/**", async (route) => {
    served = true;
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: source,
    });
  });
  return { wasServed: () => served };
}
