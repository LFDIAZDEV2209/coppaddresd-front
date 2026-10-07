import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { checkServiceUrls } from "./check-service-urls.mjs";

test("la configuración real de deploy contiene orígenes sin rutas", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/deploy-frontend.yml", import.meta.url),
    "utf8",
  );
  const environment = Object.fromEntries(
    [...workflow.matchAll(/^  (NEXT_PUBLIC_(?:GATEWAY_URL|COMMUNITY_API_URL)): (.+)$/gm)]
      .map((match) => [match[1], match[2]]),
  );
  assert.equal(Object.keys(environment).length, 2);
  checkServiceUrls(environment);
});

test("rechaza el prefijo que duplicaba la ruta GraphQL en producción", () => {
  assert.throws(() => checkServiceUrls({
    NEXT_PUBLIC_COMMUNITY_API_URL: "https://erp.coppadresd.com/api/v1/community",
  }), /NEXT_PUBLIC_COMMUNITY_API_URL/);
});

test("acepta gateway local, origen con slash final y override omitido", () => {
  checkServiceUrls({ NEXT_PUBLIC_GATEWAY_URL: "http://localhost:5080" });
  checkServiceUrls({ NEXT_PUBLIC_COMMUNITY_API_URL: "https://erp.coppadresd.com/" });
});

test("rechaza valores inválidos o componentes que cambian el endpoint", () => {
  for (const value of ["", "erp.coppadresd.com", "ws://localhost:5080", "https://example.com/?x=1", "https://example.com/#x", "https://user:password@example.com", " https://example.com"]) {
    assert.throws(() => checkServiceUrls({ NEXT_PUBLIC_GATEWAY_URL: value }));
  }
});
