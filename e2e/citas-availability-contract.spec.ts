import { expect, test } from "@playwright/test";

/**
 * Esqueleto QA para validar 1.1/1.1a y el contrato publicado de availability.
 * Se mantiene opt-in hasta que exec-backend publique el endpoint y fixtures.
 */
const enabled = process.env.E2E_AVAILABILITY_READY === "1";
const gatewayUrl = process.env.E2E_GATEWAY_URL ?? "http://localhost:5080";
const accessToken = process.env.E2E_ACCESS_TOKEN;
const date = process.env.E2E_AVAILABILITY_DATE;
const professionalId = process.env.E2E_AVAILABILITY_PROFESSIONAL_ID;
const specialtyId = process.env.E2E_AVAILABILITY_SPECIALTY_ID;
const organizationId = process.env.E2E_AVAILABILITY_ORGANIZATION_ID;
const noScheduleProfessionalId = process.env.E2E_AVAILABILITY_NO_SCHEDULE_PROFESSIONAL_ID;

type AvailabilitySlot = {
  start: string;
  end: string;
  durationMinutes: number;
  isAvailable: boolean;
  conflictReason?: string;
};

type AvailabilityResponse = {
  professionalId?: string | null;
  specialtyId?: string | null;
  date: string;
  timezoneOffset: string;
  slots: AvailabilitySlot[];
};

function availabilityPath(params: Record<string, string>): string {
  return `${gatewayUrl}/api/v1/appointments/availability?${new URLSearchParams(params)}`;
}

function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

test.describe("contrato de disponibilidad de citas", () => {
  test.beforeEach(async () => {
    test.skip(!enabled, "Pendiente de publicación de /availability y fixtures 1.1/1.1a");
    test.skip(!accessToken, "Falta E2E_ACCESS_TOKEN de un usuario autenticado");
    test.skip(!date, "Falta E2E_AVAILABILITY_DATE");
  });

  test("1.1 — horarios reales de un profesional y slots con forma contractual", async ({ request }) => {
    test.skip(!professionalId, "Falta E2E_AVAILABILITY_PROFESSIONAL_ID");
    const response = await request.get(
      availabilityPath({ professionalId: professionalId!, date: date! }),
      { headers: authHeaders() },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as AvailabilityResponse;
    expect(body.professionalId).toBe(professionalId);
    expect(body.date).toBe(date);
    expect(body.timezoneOffset).toMatch(/^[+-]\d{2}:\d{2}$/);
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots.some((slot) => !slot.isAvailable)).toBe(false);
    for (const slot of body.slots) {
      expect(slot.start).toContain(date);
      expect(slot.end).toContain(date);
      expect(slot.durationMinutes).toBeGreaterThan(0);
      expect(typeof slot.isAvailable).toBe("boolean");
    }
  });

  test("1.1a — agrega disponibilidad por especialidad sin asignar profesional", async ({ request }) => {
    test.skip(!specialtyId, "Falta E2E_AVAILABILITY_SPECIALTY_ID");
    test.skip(!organizationId, "Falta E2E_AVAILABILITY_ORGANIZATION_ID requerido por el contrato 1.1a");
    const response = await request.get(
      availabilityPath({ specialtyId: specialtyId!, organizationId: organizationId!, date: date! }),
      { headers: authHeaders() },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as AvailabilityResponse;
    expect(body.date).toBe(date);
    expect(Array.isArray(body.slots)).toBe(true);
    expect(body.slots.some((slot) => !slot.isAvailable)).toBe(false);
    expect(body.professionalId ?? null).toBeNull();
  });

  test("1.1 — profesional sin turno retorna slots vacíos", async ({ request }) => {
    test.skip(!noScheduleProfessionalId, "Falta E2E_AVAILABILITY_NO_SCHEDULE_PROFESSIONAL_ID");
    const response = await request.get(
      availabilityPath({ professionalId: noScheduleProfessionalId!, date: date! }),
      { headers: authHeaders() },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as AvailabilityResponse;
    expect(body.slots).toEqual([]);
  });
});
