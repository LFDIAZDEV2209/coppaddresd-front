import type { Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mockPatientsHttp } from "./patients-http";

function permissionCodes() {
  const codes = new Set<string>();
  function scan(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.tsx?$/.test(e.name)) {
        for (const match of readFileSync(p, "utf8").matchAll(
          /["']([A-Z][A-Za-z]+(?:\.[A-Z][A-Za-z]+)+)["']/g,
        ))
          codes.add(match[1]);
      }
    }
  }
  scan("lib/config");
  scan("features");
  return [...codes];
}
const emptyPage = {
  data: [],
  items: [],
  total: 0,
  totalCount: 0,
  totalPages: 1,
  page: 1,
  pageSize: 20,
};
const qaUser = {
  id: "style-user",
  firstName: "Ana",
  lastName: "Estilo",
  email: "style@example.invalid",
  isActive: true,
  createdAt: "2026-11-01T12:00:00Z",
  roles: [],
  scopedRoles: [],
  permissions: [],
  phoneNumber: null,
};

/** QA aislado: datos de presentación vacíos/sintéticos, ninguna escritura de negocio sale al backend. */
export async function mockPlatformStyleHttp(
  page: Page,
  { english = false } = {},
) {
  const base = await mockPatientsHttp(page, {
    permissions: permissionCodes(),
    english,
  });
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname;
    const reply = (body: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (p.includes("graphql")) {
      const body = req.postData() ?? url.searchParams.get("query") ?? "";
      if (/\bmutation\b/.test(body))
        return route.fulfill({ status: 405, body: "{}" });
      return reply({ data: { profilesPage: { items: [], totalCount: 0 } } });
    }
    if (req.method() !== "GET") return route.fallback();
    if (p === "/api/auth/users") return reply([qaUser]);
    if (
      p === "/api/auth/roles" ||
      p === "/api/auth/permissions" ||
      p.endsWith("/permissions") ||
      p === "/api/v1/legal-documents" ||
      p.endsWith("/all-versions")
    )
      return reply([]);
    if (p.startsWith("/api/v1/inventory/")) {
      if (/\/(categories|suppliers)$/.test(p)) return reply([]);
      if (p.endsWith("/analytics"))
        return reply({
          totalValue: 0,
          activeProducts: 0,
          lowStock: 0,
          outOfStock: 0,
          expiringSoon: 0,
          expired: 0,
          entries: 0,
          exits: 0,
          unitsEntered: 0,
          unitsExited: 0,
          movementSeries: [],
          topMoving: [],
          categoryValue: [],
          products: [],
        });
      return reply(emptyPage);
    }
    if (p === "/api/v1/agents/active") return reply([]);
    if (
      p === "/api/v1/agents" ||
      p === "/api/v1/agents/executions" ||
      p === "/api/v1/agents/knowledge-bases"
    )
      return reply(emptyPage);
    if (p === "/api/v1/employees" || p === "/api/v1/professionals-catalog")
      return reply(emptyPage);
    if (p === "/api/v1/organizations/tree") return reply([]);
    if (p === "/api/v1/professionals/stats")
      return reply({
        total: 0,
        active: 0,
        invited: 0,
        inactive: 0,
        byType: [],
      });
    if (
      /\/api\/v1\/(professional-types|specialties|organizations|clinics|roles|program\/xp-rules)$/.test(
        p,
      )
    )
      return reply([]);
    if (p.startsWith("/api/v1/health-tests")) {
      if (p.endsWith("/geo"))
        return reply({
          cities: [],
          alerts: [],
          totalPatients: 0,
          avgScore: null,
          highRiskCount: 0,
        });
      if (p.endsWith("/stats"))
        return reply({
          totalPatients: 0,
          withPending: 0,
          completed: 0,
          highRisk: 0,
          activeAlerts: 0,
        });
      if (
        /\/(coverage-trend|master|indicators|pending|indicator-aggregates|alert-rules)$/.test(
          p,
        )
      )
        return reply([]);
      return reply(emptyPage);
    }
    if (p === "/api/v1/media") return reply(emptyPage);
    if (p.startsWith("/api/v1/wellness/")) return reply(emptyPage);
    if (p === "/api/v1/store/items/stats")
      return reply({ total: 0, visible: 0, hidden: 0, featured: 0 });
    if (
      p === "/api/v1/store/items" ||
      p === "/api/v1/sos/alerts" ||
      p === "/api/v1/program/enrollments" ||
      p === "/api/v1/program/templates"
    )
      return reply(emptyPage);
    return route.fallback();
  });
  return base;
}
