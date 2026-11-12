import { expect, type Page } from "@playwright/test";
import { mockPatientsHttp } from "./patients-http";
export const agents = Array.from({ length: 6 }, (_, i) => ({
  id: `qa-agent-${i}`,
  name:
    i === 0
      ? "Vita acompañamiento y orientación del paciente"
      : `Agente de prueba ${i + 1}`,
}));
export async function openDashboard(
  page: Page,
  { english = false, empty = false, failed = false, agentCount = 6 } = {},
) {
  await mockPatientsHttp(page, { english });
  await page.route("**/api/v1/dashboard/kpis?**", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        totalPatients: 1200,
        newPatients30d: 10,
        healthTests30d: 15,
        inventoryEntries30d: 4,
        inventoryExits30d: 2,
        programTasks30d: 20,
        activitySeries30d: Array.from({ length: 30 }, (_, i) => ({
          date: `Nov ${i + 1}`,
          newPatients: i % 4,
          tests: 0,
          entries: 0,
          exits: 0,
          programTasks: 0,
        })),
      }),
    }),
  );
  await page.route("**/api/v1/patients/dashboard?**", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        newPatientsByMonth: empty
          ? []
          : [0, 4, 0, 7, 3, 10].map((count, i) => ({
              year: 2026,
              month: i + 6,
              count,
            })),
      }),
    }),
  );
  await page.route("**/api/v1/agents**", (r) => {
    if (failed)
      return r.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    const u = new URL(r.request().url());
    const items = empty
      ? []
      : Array.from({ length: 5 }, (_, i) => ({
          id: `qa-execution-${i}`,
          agentTypeId: agents[i].id,
          status: "completado",
          createdAt: `2026-11-11T12:0${i}:00Z`,
        }));
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        u.pathname.endsWith("/active")
          ? empty
            ? []
            : agents.slice(0, agentCount)
          : {
              items: u.searchParams.has("agentTypeId") ? [] : items,
              total: empty
                ? 0
                : 12 -
                  Number(u.searchParams.get("agentTypeId")?.slice(-1) ?? 0),
            },
      ),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", {
      name: english ? "Activity (30 days)" : "Actividad (30 días)",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
}
