import { expect, request as playwrightRequest, test } from "@playwright/test";
import { loginAsProfessional } from "./fixtures/auth";
import { loadFixtures, localDateOf } from "./fixtures/e2e-data";

/**
 * Flujo repetible de citas (Misión 3.4):
 * bandeja (/appointments/solicitudes) -> confirmar y agendar (diálogo con
 * AvailabilitySlotPicker real) -> agenda (/appointments/agenda?fecha=) ->
 * verificación (detalle + API: request Converted y cita Confirmed en agenda).
 *
 * Requiere `yarn e2e:seed` antes de la suite: el seed crea la solicitud
 * Pending dedicada (`requests.inboxPending`, motivo E2E) y garantiza
 * horarios L-V 08:00-17:00 para que /availability ofrezca slots.
 * Selectores y endpoints tomados de las evidencias qa-citas-3_1-* y
 * qa-citas-32-* (.playwright-mcp) y de la UI actual (7fa5d40).
 */
const GATEWAY_URL = process.env.E2E_GATEWAY_URL ?? "http://localhost:5080";
const E2E_REASON = "E2E flujo citas bandeja agenda";

interface ConfirmResponse {
  id: string;
  requestId: string | null;
  status: string;
  scheduledStart: string;
}

function toDateInput(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

test.describe("flujo de citas bandeja -> agenda", () => {
  test("confirmar y agendar convierte la solicitud y la cita aparece en agenda", async ({
    page,
  }) => {
    const fixtures = loadFixtures();
    if (!fixtures.requests?.inboxPending || !fixtures.context?.organizationId) {
      throw new Error(
        "Fixtures sin `requests.inboxPending` ni `context`. Corré `yarn e2e:seed` antes de la suite.",
      );
    }
    const requestId = fixtures.requests.inboxPending;
    const patientName = fixtures.patient.name ?? "";

    // 1. Bandeja del profesional con la solicitud E2E pendiente.
    await loginAsProfessional(page);
    await page.goto("/appointments/solicitudes");
    await expect(
      page.getByRole("heading", { name: /Bandeja de solicitudes/ }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /Pendientes/ })
      .first()
      .click();
    const search = page.getByPlaceholder("Buscar paciente, especialidad…");
    await expect(search).toBeVisible();
    await search.fill("E2E flujo citas");
    await expect(page.getByText(E2E_REASON)).toBeVisible();

    const rowConfirm = page
      .locator("li", { hasText: E2E_REASON })
      .getByRole("button", { name: "Confirmar y agendar" })
      .first();
    await expect(rowConfirm).toBeVisible();
    await rowConfirm.click();

    // 2. Diálogo "Confirmar y agendar cita" con slots reales de /availability.
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Confirmar y agendar cita" }),
    ).toBeVisible();
    const dateInput = page.locator("#confirm-date");
    await expect(dateInput).toBeVisible();

    // La fecha preferida del seed puede caer sin horario: se prueban hasta
    // 6 días consecutivos hasta que el picker liste slots (evidencia
    // qa-citas 2026-09-29: 27 sin slots, 30 con slots).
    const slotsRegion = page.getByLabel("Horarios disponibles");
    let slotDate = "";
    let slotPicked = false;
    const startDate = (await dateInput.inputValue()) || toDateInput(new Date());
    const base = new Date(`${startDate}T12:00:00`);
    for (let offset = 0; offset < 6 && !slotPicked; offset += 1) {
      const candidate = new Date(base);
      candidate.setDate(candidate.getDate() + offset);
      const candidateInput = toDateInput(candidate);
      await dateInput.fill(candidateInput);
      // El picker dispara fetchAvailabilitySlots por cambio de fecha.
      const noSlots = page.getByText(
        "No hay horarios disponibles para esta fecha.",
      );
      const firstSlot = slotsRegion.getByRole("button").first();
      const winner = await Promise.race([
        firstSlot
          .waitFor({ state: "visible", timeout: 10_000 })
          .then(() => "slot" as const)
          .catch(() => null),
        noSlots
          .waitFor({ state: "visible", timeout: 10_000 })
          .then(() => "empty" as const)
          .catch(() => null),
      ]);
      if (winner === "slot") {
        await firstSlot.click();
        // El botón queda con aria-pressed=true al seleccionar.
        await expect(firstSlot).toHaveAttribute("aria-pressed", "true");
        slotDate = candidateInput;
        slotPicked = true;
      }
    }
    expect(slotPicked).toBe(true);

    const confirmButton = dialog.getByRole("button", {
      name: "Confirmar y agendar cita",
    });
    await expect(confirmButton).toBeEnabled();

    const confirmResponsePromise = page.waitForResponse(
      (response) =>
        response
          .url()
          .includes(`/api/v1/telemedicine/requests/${requestId}/confirm`) &&
        response.request().method() === "POST",
      { timeout: 15_000 },
    );
    await confirmButton.click();
    const confirmResponse = await confirmResponsePromise;
    // Contrato fases 3.1/3.2 (f44b6a4, en prod): la confirmación crea la cita
    // → 201 Created (CreatedAtAction), no 200.
    expect(confirmResponse.status()).toBe(201);
    const confirmed = (await confirmResponse.json()) as ConfirmResponse;
    expect(confirmed.requestId).toBe(requestId);
    expect(confirmed.status).toBe("Confirmed");
    const appointmentId = confirmed.id;
    expect(appointmentId).not.toBe("");

    // La solicitud sale de Pendientes tras convertirse.
    await expect(page.getByText(E2E_REASON)).toHaveCount(0, {
      timeout: 10_000,
    });

    // 3. Agenda del día del slot: la cita figura como Confirmada.
    const agendaDate = localDateOf(confirmed.scheduledStart) || slotDate;
    await page.goto(`/appointments/agenda?fecha=${agendaDate}`);
    await expect(
      page.getByRole("heading", { name: /Mi agenda|Agenda/ }),
    ).toBeVisible();
    if (patientName) {
      const agendaSearch = page.getByPlaceholder("Buscar paciente");
      await agendaSearch.fill(patientName);
    }
    const agendaRow = page.locator("div", { hasText: patientName }).first();
    await expect(agendaRow).toBeVisible();
    await expect(page.getByText("Confirmada").first()).toBeVisible();

    // 4. Verificación en el detalle de la cita. Navegación SPA desde la
    // agenda: el deep-link directo falla porque el fetch inicial no lleva
    // X-Clinic-Id (hallazgo de producto documentado en e2e/README.md).
    const detailButton = page
      .locator("div.group", { hasText: patientName })
      .first()
      .getByRole("button", { name: "Detalle", exact: true });
    await expect(detailButton).toBeVisible();
    await detailButton.click();
    await expect(page).toHaveURL(/\/appointments\/citas\//);
    await expect(page.getByText("Confirmada").first()).toBeVisible();
    await expect(page.getByText("Sala virtual")).toBeVisible();

    // 5. Verificación API-level con el token del profesional (dueño de la cita).
    const api = await playwrightRequest.newContext({ baseURL: GATEWAY_URL });
    try {
      const login = await api.post("/api/auth/login", {
        data: {
          email: fixtures.professional.email,
          password: fixtures.professional.password,
          rememberMe: false,
          application: "erp",
        },
      });
      expect(login.ok()).toBeTruthy();
      const { accessToken } = (await login.json()) as { accessToken: string };
      const headers = { Authorization: `Bearer ${accessToken}` };

      // La clínica activa del ERP (misma regla del ContextProvider: la primera
      // de /me/context). Los GET de solicitudes/citas exigen permisos scoped
      // resueltos con el header X-Clinic-Id; sin header responden 403.
      const contextResponse = await api.get("/api/v1/me/context", { headers });
      expect(contextResponse.ok()).toBeTruthy();
      const erpContext = (await contextResponse.json()) as {
        activeClinicId: string | null;
        clinics: Array<{ id: string }>;
      };
      const clinicId =
        erpContext.activeClinicId ?? erpContext.clinics[0]?.id ?? "";
      expect(clinicId).not.toBe("");
      const scopedHeaders = { ...headers, "X-Clinic-Id": clinicId };

      const fetchedRequest = await api.get(
        `/api/v1/telemedicine/requests/${requestId}`,
        { headers: scopedHeaders },
      );
      expect(fetchedRequest.ok()).toBeTruthy();
      const requestBody = (await fetchedRequest.json()) as { status: string };
      expect(requestBody.status).toBe("Converted");

      const fetchedAppointment = await api.get(
        `/api/v1/appointments/${appointmentId}`,
        { headers: scopedHeaders },
      );
      expect(fetchedAppointment.ok()).toBeTruthy();
      const appointmentBody = (await fetchedAppointment.json()) as {
        status: string;
        professionalId: string;
        patientId: string;
        requestId: string | null;
      };
      expect(appointmentBody.status).toBe("Confirmed");
      expect(appointmentBody.professionalId).toBe(fixtures.professional.id);
      expect(appointmentBody.patientId).toBe(fixtures.patient.id);
      expect(appointmentBody.requestId).toBe(requestId);

      const dayStart = new Date(`${agendaDate}T00:00:00.000Z`).toISOString();
      const dayEnd = new Date(`${agendaDate}T23:59:59.999Z`).toISOString();
      const agendaParams = new URLSearchParams({
        professionalId: fixtures.professional.id,
        from: dayStart,
        to: dayEnd,
      });
      const agenda = await api.get(
        `/api/v1/appointments/agenda?${agendaParams.toString()}`,
        { headers: scopedHeaders },
      );
      expect(agenda.ok()).toBeTruthy();
      const agendaBody = (await agenda.json()) as Array<{ id: string }>;
      expect(agendaBody.some((item) => item.id === appointmentId)).toBe(true);
    } finally {
      await api.dispose();
    }
  });
});
