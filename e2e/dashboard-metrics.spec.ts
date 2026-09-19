import { test, expect, request as playwrightRequest } from "@playwright/test";
import { loadFixtures } from "./fixtures/e2e-data";

const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? "http://localhost:5080";

interface CallsDto {
  roomsOpened: number;
  sessionsStarted: number;
  sessionsEnded: number;
  averageDurationSeconds: number | null;
  reopens: number;
  chatMessagesSent: number;
}

test.describe("contadores de llamadas del dashboard", () => {
  test("start/end de sesión se reflejan en calls (expect.poll ≤ 10 s)", async () => {
    const fixtures = loadFixtures();
    const api = await playwrightRequest.newContext({ baseURL: GATEWAY_URL });

    try {
      const login = await api.post("/api/auth/login", {
        data: {
          email: process.env.E2E_ADMIN_EMAIL ?? "admin@coppaddresd.com",
          password: process.env.E2E_ADMIN_PASSWORD ?? "Test@1234",
          rememberMe: false,
          application: "erp",
        },
      });
      expect(login.ok()).toBeTruthy();
      const { accessToken } = (await login.json()) as { accessToken: string };
      const headers = { Authorization: `Bearer ${accessToken}` };

      // El dashboard cachea los agregados 30-60 s (TTL con jitter) y la clave
      // incluye from/to: cada lectura usa un `to` nuevo para observar la cola
      // asíncrona sin esperar la expiración del caché.
      const since = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
      const readCalls = async (): Promise<CallsDto | undefined> => {
        const params = new URLSearchParams({
          from: since,
          to: new Date().toISOString(),
        });
        const response = await api.get(
          `/api/v1/telemedicine/admin/analytics?${params.toString()}`,
          { headers },
        );
        expect(response.ok()).toBeTruthy();
        return ((await response.json()) as { calls?: CallsDto }).calls;
      };

      // Carga inicial de la pre-agregación (uso documentado del backfill): sin
      // esto, en una BD recién creada el baseline sale del fallback OLTP y la
      // lectura post-evento del rollup, comparando cohortes distintas.
      const backfill = await api.post(
        "/api/v1/telemedicine/admin/analytics/backfill",
        {
          headers,
          data: { from: since, to: new Date().toISOString(), dryRun: false },
        },
      );
      expect(backfill.ok()).toBeTruthy();

      const initial = await readCalls();
      // El bloque `calls` es aditivo y obligatorio desde F5.
      expect(initial).toBeTruthy();
      expect(typeof initial?.sessionsStarted).toBe("number");
      const baseline = initial?.sessionsStarted ?? 0;

      const start = await api.post(
        `/api/v1/appointments/${fixtures.appointments.metrics}/session/start`,
        { headers },
      );
      expect(start.ok()).toBeTruthy();

      const end = await api.post(
        `/api/v1/appointments/${fixtures.appointments.metrics}/session/end`,
        { headers, data: { endReason: "Finalizada por la suite E2E" } },
      );
      expect(end.ok()).toBeTruthy();

      // La cola de métricas es en memoria y asíncrona: se tolera el rezago.
      await expect
        .poll(
          async () => (await readCalls())?.sessionsStarted ?? -1,
          { timeout: 10_000, intervals: [500, 1_000, 2_000] },
        )
        .toBeGreaterThan(baseline);
    } finally {
      await api.dispose();
    }
  });
});
