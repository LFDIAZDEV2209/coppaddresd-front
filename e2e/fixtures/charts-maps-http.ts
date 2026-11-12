import type { Page } from "@playwright/test";
import { mockPlatformStyleHttp } from "./platform-style-http";
export const analytics = {
  kpis: {
    totalAppointments: 40,
    appointmentsToday: 4,
    upcomingAppointments: 6,
    completed: 20,
    cancelled: 4,
    noShow: 6,
    pending: 10,
    uniquePatients: 24,
    activeProfessionals: 4,
  },
  dailySeries: Array.from({ length: 12 }, (_, i) => ({
    day: `2026-11-${String(i + 1).padStart(2, "0")}`,
    count: [1, 3, 6, 2, 4, 3, 1, 5, 3, 2, 1, 2][i],
  })),
  statusDistribution: [
    { status: "Completed", count: 20 },
    { status: "Cancelled", count: 4 },
    { status: "NoShow", count: 6 },
    { status: "Confirmed", count: 10 },
  ],
  hourlyDistribution: Array.from({ length: 7 }, (_, i) => ({
    hour: 8 + i,
    count: [2, 4, 7, 3, 6, 1, 5][i],
  })),
  professionalActivity: ["Ana Torres", "Luis Gómez", "María Ruiz"].map(
    (name, i) => ({
      professionalId: `qa-${i}`,
      professionalName: name,
      total: 12 - i * 2,
      completed: 8 - i,
      cancelled: 1,
      uniquePatients: 10 - i,
    }),
  ),
  upcomingAppointments: [],
  states: [
    { code: "CA", count: 20 },
    { code: "FL", count: 12 },
    { code: "NY", count: 6 },
    { code: "TX", count: 2 },
  ],
};
export async function mockChartsMapsHttp(page: Page) {
  const base = await mockPlatformStyleHttp(page);
  await page.addInitScript(() =>
    localStorage.setItem("copp-accent", "#123B63"),
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname;
    const reply = (body: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (p.endsWith("/inventory/analytics"))
      return reply({
        totalValue: 1000,
        activeProducts: 2,
        lowStock: 0,
        outOfStock: 0,
        expiringSoon: 0,
        expired: 0,
        entries: 8,
        exits: 4,
        unitsEntered: 8,
        unitsExited: 4,
        movementSeries: [
          { label: "01 nov", entries: 5, exits: 2 },
          { label: "02 nov", entries: 3, exits: 2 },
        ],
        topMoving: [],
        categoryValue: [],
        products: [],
      });
    if (p.endsWith("/admin/analytics")) return reply(analytics);
    if (p.endsWith("/admin/summary"))
      return reply({
        appointmentsToday: 4,
        appointmentsPending: 10,
        appointmentsCompleted: 20,
        requestsPending: 0,
        activeSessions: 0,
        alertsUnread: 0,
      });
    if (p.endsWith("/health-tests/geo"))
      return reply({
        cities: [
          ["CA", 10],
          ["FL", 30],
          ["TX", 70],
        ].map(([code, risk], i) => ({
          cityId: `qa-${i}`,
          name: `Ciudad QA ${i + 1}`,
          stateAbbr: code,
          count: 10,
          evaluatedCount: 10,
          highRiskPct: risk,
          avgScore: 70,
          mapX: null,
          mapY: null,
        })),
        alerts: [],
        totalPatients: 30,
        avgScore: 70,
        highRiskCount: 11,
      });
    if (p.endsWith("/program/erp/biometria/community"))
      return reply({
        avg_imc: 27,
        avg_grasa: 23,
        avg_glucosa: 90,
        improving_count: 4,
        imc_distribution: [
          { label: "Normal", count: 8 },
          { label: "Sobrepeso", count: 4 },
          { label: "Obesidad I", count: 2 },
        ],
        grasa_distribution: { male: [], female: [] },
        glucosa_distribution: [
          { label: "Normal", count: 8 },
          { label: "Atención", count: 4 },
        ],
        evolution_weekly: [],
        cities: [
          ["CA", 23],
          ["FL", 28],
          ["TX", 32],
        ].map(([code, imc], i) => ({
          city_id: `qa-${i}`,
          name: `Ciudad QA ${i + 1}`,
          state_abbr: code,
          count: 10,
          avg_imc: imc,
          map_x: null,
          map_y: null,
        })),
        alerts: [],
      });
    if (p.includes("graphql")) {
      const body =
        req.postData() ?? new URL(req.url()).searchParams.get("query") ?? "";
      if (/\bmutation\b/.test(body))
        return route.fulfill({ status: 405, body: "{}" });
      if (body.includes("dashboardStats"))
        return reply({
          data: {
            dashboardStats: {
              activeMembers: 26,
              postsThisMonth: 20,
              participationRate: 70,
              inactiveOver7Days: 2,
              inactiveAtRisk: 1,
              kpiTrends: {
                activeMembers: 2,
                postsThisMonth: 3,
                participationRate: 1,
                inactiveOver7Days: 0,
              },
              activitySeries: [
                { dia: "01", posts: 3, comentarios: 2, reacciones: 4 },
                { dia: "02", posts: 4, comentarios: 3, reacciones: 5 },
                { dia: "03", posts: 2, comentarios: 4, reacciones: 6 },
              ],
              postTypes: [{ type: "Texto", count: 12 }],
              peakHours: [{ hora: "08", count: 4 }],
              diagnosisParticipation: [],
            },
          },
        });
      if (body.includes("regionStats"))
        return reply({
          data: {
            regionStats: [
              {
                region: "miami",
                members: 12,
                activeMembers: 8,
                postsPerWeek: 6,
              },
              {
                region: "houston",
                members: 8,
                activeMembers: 4,
                postsPerWeek: 4,
              },
              {
                region: "bogota",
                members: 6,
                activeMembers: 4,
                postsPerWeek: 3,
              },
            ],
          },
        });
    }
    return route.fallback();
  });
  return base;
}
