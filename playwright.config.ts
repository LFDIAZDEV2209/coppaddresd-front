import { defineConfig } from "@playwright/test";

/**
 * Suite E2E del ERP (F5). Requiere el stack local levantado:
 *   coppAddresdBack/scripts/dev-up.sh + migración de Telemedicina (--migrate)
 *   + seeds (`yarn e2e:seed`). Atajo: `scripts/e2e-local.sh`.
 *
 * El SDK de Twilio se stubbea por `page.route` sobre el CDN (sin credenciales
 * ni media real); la media real, los webhooks entrantes y WKWebView quedan
 * fuera de CI (ver e2e/README.md).
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // Seed único + estado compartido en el backend: una sola corrida a la vez.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-ES",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-390",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
      // El prejoin móvil se valida con el gating de sala (sin Twilio).
      testMatch: /room-gating\.spec\.ts/,
    },
  ],
  webServer: {
    command: "yarn dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_GATEWAY_URL:
        process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:5080",
      NEXT_PUBLIC_APPLICATION_CODE: "erp",
    },
  },
});
