import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const server = base.webServer;
if (!server || Array.isArray(server))
  throw new Error("Expected one ERP test server");
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "appointments-hidden.spec.ts",
  webServer: {
    ...server,
    env: { ...server?.env, NEXT_PUBLIC_APPOINTMENTS_ENABLED: "false" },
  },
});
