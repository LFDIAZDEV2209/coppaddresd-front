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
    // La API puede devolver el nombre con dobles espacios cuando el paciente
    // no tiene segundo nombre ("Evelyn  Rivera"); la búsqueda del filtro es
    // literal (includes), así que normalizamos los espacios en las aserciones
    // y usamos el primer nombre para la búsqueda.
    const namePattern = new RegExp(
      patientName.trim().split(/\s+/).join("\\s+"),
    );
    const nameSearch = patientName.trim().split(/\s+/)[0] ?? patientName;

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

    // La fecha preferida del seed puede caer sin horario: el picker ofrece
    // automáticamente los próximos horarios disponibles (chips) cuando el
    // día seleccionado no tiene cupos.
    const slotsRegion = page.getByLabel("Horarios disponibles", { exact: true });
    const nearestRegion = page.getByLabel("Próximos horarios disponibles", {
      exact: true,
    });
    const firstSlot = slotsRegion.getByRole("button").first();
    const firstNearest = nearestRegion.getByRole("button").first();
    const winner = await Promise.race([
      firstSlot
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "slot" as const)
        .catch(() => null),
      firstNearest
        .waitFor({ state: "visible", timeout: 20_000 })
        .then(() => "nearest" as const)
        .catch(() => null),
    ]);
    expect(winner).not.toBeNull();

    let slotDate = await dateInput.inputValue();
    if (winner === "slot") {
      await firstSlot.click();
      // El botón queda con aria-pressed=true al seleccionar.
      await expect(firstSlot).toHaveAttribute("aria-pressed", "true");
    } else {
      await firstNearest.click();
      // El chip selecciona un día posterior: el picker recarga esa fecha y
      // deja el slot elegido marcado en la grilla principal.
      await expect(
        slotsRegion.getByRole("button", { pressed: true }),
      ).toBeVisible();
      slotDate = await dateInput.inputValue();
    }

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
      await agendaSearch.fill(nameSearch);
    }
    const agendaRow = page.locator("div", { hasText: namePattern }).first();
    await expect(agendaRow).toBeVisible();
    await expect(page.getByText("Confirmada").first()).toBeVisible();

    // 4. Verificación en el detalle de la cita. Navegación SPA desde la
    // agenda: el deep-link directo falla porque el fetch inicial no lleva
    // X-Clinic-Id (hallazgo de producto documentado en e2e/README.md).
    const detailButton = page
      .locator("div.group", { hasText: namePattern })
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
