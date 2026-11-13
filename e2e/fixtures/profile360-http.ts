import type { Page, Route } from "@playwright/test";
import type { PatientOverviewDto } from "../../features/program/types/erp";
import type { ProgramEnrollment } from "../../features/program/types";
import { mockPatientsHttp, patientWorkspaceRows } from "./patients-http";

export const profilePatientId = patientWorkspaceRows[0].patientId;
export const foreignProfilePatientId = "00000000-0000-4000-8000-000000000999";
export const profileEnrollmentId = "00000000-0000-4000-8000-000000000301";

const enrollment: ProgramEnrollment = {
  id: profileEnrollmentId,
  patientId: profilePatientId,
  templateId: "00000000-0000-4000-8000-000000000401",
  timezone: "America/Bogota",
  status: "Active",
  startedAt: "2026-11-09T05:00:00Z",
  startLocalDate: "2026-11-09",
  currentWeekNumber: 1,
  totalWeeks: 12,
  xpBalance: 0,
  streakCurrent: 0,
  streakLongest: 0,
  freezesRemaining: 0,
  completedAt: null,
  pausedAt: null,
  withdrawnAt: null,
  createdAt: "2026-11-09T05:00:00Z",
};

export const profileOverview: PatientOverviewDto = {
  patient_name: "Paciente Perfil QA",
  enrollment: {
    enrollment_id: profileEnrollmentId,
    template_id: enrollment.templateId,
    template_name: "Programa QA",
    status: "Active",
    timezone: enrollment.timezone,
    started_at: enrollment.startedAt,
    current_week: 1,
    total_weeks: 12,
  },
  streak: null,
  xp: null,
  tareas_hoy: [],
  adherencia_semana: [],
  evolucion_12_semanas: [],
  scores: null,
  mediciones_clinicas: null,
  weaknesses: [],
  interventions: [],
  pending_adaptations: 0,
  clinical_reviews: [],
  daily_checkins: [],
};

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** Simulación explícita de la UI: no acredita el guard del backend. */
export async function mockProfileProgramHttp(page: Page) {
  const reads: string[] = [];
  const writes: string[] = [];
  await page.route("**/api/v1/program/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      writes.push(path);
      return reply(route, { detail: "Esta prueba no permite escrituras" }, 405);
    }
    reads.push(path);
    if (path.includes(foreignProfilePatientId)) {
      return reply(route, { detail: "Recurso no encontrado" }, 404);
    }
    if (path === `/api/v1/program/erp/patients/${profilePatientId}/overview`)
      return reply(route, profileOverview);
    if (path === `/api/v1/program/enrollments/${profileEnrollmentId}`)
      return reply(route, enrollment);
    if (path === `/api/v1/program/enrollments/${profileEnrollmentId}/content`)
      return reply(route, {
        enrollmentId: profileEnrollmentId,
        patientId: profilePatientId,
        templateId: enrollment.templateId,
        totalWeeks: 12,
        startLocalDate: enrollment.startLocalDate,
        weeks: [
          {
            weekNumber: 1,
            weekStartDateLocal: "2026-11-09",
            weekEndDateLocal: "2026-11-15",
            nutritionPlan: {
              id: "plan-legacy-qa",
              name: "Plan que no debe aparecer en la tabla",
            },
            exerciseRoutine: { id: "rutina-qa", name: "Caminata QA" },
          },
        ],
      });
    if (path.endsWith("/week/1")) return reply(route, { days: [] });
    if (path === "/api/v1/program/templates")
      return reply(route, {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    return reply(
      route,
      { detail: "Sin datos sintéticos para esta sección" },
      404,
    );
  });
  return { reads, writes };
}

export async function mockProfile360Http(
  page: Page,
  options: { english?: boolean; permissions?: string[] } = {},
) {
  const patients = await mockPatientsHttp(page, {
    ...options,
    permissions: options.permissions ?? [
      "Patients.View",
      "Program.Profile360View",
      "Program.View",
      "Wellness.View",
    ],
  });
  const program = await mockProfileProgramHttp(page);
  return { patients, program };
}
