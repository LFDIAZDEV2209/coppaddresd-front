import type { Page } from "@playwright/test";
import type {
  ClinicalBoardItem,
  ClinicalBoardResult,
  ClinicalBoardSummary,
  Insurer,
  PatientDashboard,
} from "../../features/patients/types";

export const patientWorkspaceUserId = "00000000-0000-4000-8000-000000000100";
export const patientWorkspacePermissions = [
  "Patients.View",
  "Patients.Create",
  "Patients.Update",
  "Patients.Delete",
  "Professionals.View",
  "Nutrition.Manage",
  "Nutrition.Approve",
];

export const patientWorkspaceInsurers: Insurer[] = [
  { id: "insurer-qa-1", name: "Seguro Horizonte" },
  { id: "insurer-qa-2", name: "Salud Integral" },
];

const names = [
  ["María Fernanda Alejandra", "Rodríguez de los Santos Montenegro"],
  ["Andrés", "Gómez"],
  ["Lucía", "Martínez"],
  ["Diego", "Ramírez"],
  ["Camila", "Torres"],
  ["Julián", "Castro"],
  ["Isabela", "Díaz"],
  ["Samuel", "Herrera"],
  ["Valentina", "Rojas"],
  ["Nicolás", "Morales"],
  ["Gabriela", "Vargas"],
  ["Mateo", "Reyes"],
  ["Sofía", "Medina"],
  ["Sebastián", "Ortiz"],
] as const;
const risks = ["critical", "high", "moderate", "low", null] as const;
const followUps = ["vencido", "al-dia", "sin-asignacion"] as const;

/** Datos ficticios y deterministas; no se importan desde código de aplicación. */
export const patientWorkspaceRows: ClinicalBoardItem[] = names.map(
  ([firstName, lastName], index) => {
    const riskLevel = risks[index % risks.length];
    const activeAlertCount = index % 3 === 0 ? 2 : index % 3 === 1 ? 1 : 0;
    return {
      patientId: `00000000-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
      medicalRecordNumber:
        index === 0
          ? "QA-HISTORIA-CLINICA-IDENTIFICADOR-EXCEPCIONALMENTE-LARGO-000001"
          : `QA-MRN-${index + 101}`,
      firstName,
      lastName,
      documentNumber:
        index === 0
          ? "QA-DOCUMENTO-123456789012345678901234567890"
          : `QA-DOC-${index + 101}`,
      primaryDiagnosisCode: index % 4 === 0 ? null : "QA-Z00",
      primaryDiagnosisDescription:
        index % 4 === 0 ? null : "Seguimiento clínico de prueba",
      stateCode: index % 2 === 0 ? "CA" : "FL",
      stateName: index % 2 === 0 ? "California" : "Florida",
      insurerName:
        index % 3 === 2 ? null : patientWorkspaceInsurers[index % 3].name,
      professionalNames: index % 3 === 2 ? [] : ["Profesional de prueba"],
      status:
        index % 5 === 4 ? "Inactivo" : index % 5 === 3 ? "Pendiente" : "Activo",
      riskLevel,
      lastEvaluationAt: riskLevel ? "2026-11-02T14:00:00Z" : null,
      lastEvaluationInstrument: riskLevel ? "Evaluación sintética" : null,
      activeAlertCount,
      maxAlertSeverity: activeAlertCount > 0 ? (riskLevel ?? "moderate") : null,
      nextEvaluationDueAt:
        followUps[index % 3] === "sin-asignacion"
          ? null
          : "2026-11-20T14:00:00Z",
      followUpState: followUps[index % 3],
    };
  },
);

export interface PatientWorkspaceRequest {
  method: string;
  path: string;
  query: Record<string, string>;
}

export interface PatientWorkspaceWrite extends PatientWorkspaceRequest {
  body: unknown;
}

export interface PatientWorkspaceOptions {
  permissions?: string[];
  english?: boolean;
  /** Debe coincidir con el origen del servidor usado por Playwright. */
  baseUrl?: string;
  /** Falla hasta recoverBoard(); permite comprobar reintentos HTTP y recuperación visible. */
  boardUnavailable?: boolean;
  /** Retrasa solo la primera carga de la tabla, no la consulta del resumen. */
  initialBoardDelayMs?: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function summarize(rows: ClinicalBoardItem[]): ClinicalBoardSummary {
  return {
    total: rows.length,
    withoutEvaluation: rows.filter((row) => row.riskLevel === null).length,
    riskHigh: rows.filter(
      (row) => row.riskLevel === "high" || row.riskLevel === "critical",
    ).length,
    riskModerate: rows.filter((row) => row.riskLevel === "moderate").length,
    riskLow: rows.filter((row) => row.riskLevel === "low").length,
    withActiveAlerts: rows.filter((row) => row.activeAlertCount > 0).length,
    followUpOnTrack: rows.filter((row) => row.followUpState === "al-dia")
      .length,
    followUpOverdue: rows.filter((row) => row.followUpState === "vencido")
      .length,
    followUpUnassigned: rows.filter(
      (row) => row.followUpState === "sin-asignacion",
    ).length,
  };
}

function dashboardOf(
  rows: ClinicalBoardItem[],
  allRows: ClinicalBoardItem[],
  months: number,
): PatientDashboard {
  return {
    kpis: {
      total: rows.length,
      active: rows.filter((row) => row.status === "Activo").length,
      newThisMonth: rows.length,
      withoutProfessional: rows.filter(
        (row) => row.professionalNames.length === 0,
      ).length,
    },
    genderDistribution: [
      { value: "Femenino", count: Math.ceil(rows.length / 2) },
      { value: "Masculino", count: Math.floor(rows.length / 2) },
    ],
    ageDistribution: [{ value: "35–44", count: rows.length }],
    maritalStatusDistribution: [{ value: "Sin registrar", count: rows.length }],
    insurerDistribution: [
      ...patientWorkspaceInsurers.map((insurer) => ({
        id: insurer.id,
        name: insurer.name,
        count: rows.filter((row) => row.insurerName === insurer.name).length,
      })),
      {
        id: null,
        name: null,
        count: rows.filter((row) => row.insurerName === null).length,
      },
    ],
    topDiagnoses: [
      {
        code: "QA-Z00",
        description: "Seguimiento clínico de prueba",
        count: rows.filter((row) => row.primaryDiagnosisCode !== null).length,
      },
    ],
    newPatientsByMonth: Array.from({ length: months }, (_, index) => {
      const date = new Date(Date.UTC(2026, 11 - months + index, 1));
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        count: index === months - 1 ? rows.length : 0,
      };
    }),
    states: ["CA", "FL"].map((code) => {
      const count = allRows.filter((row) => row.stateCode === code).length;
      return {
        code,
        name: code === "CA" ? "California" : "Florida",
        count,
        percentage: allRows.length ? (count / allRows.length) * 100 : 0,
      };
    }),
    topProfessionals: [
      {
        id: "qa-professional",
        name: "Profesional de prueba",
        count: rows.filter((row) => row.professionalNames.length > 0).length,
      },
    ],
    emergencyContactPct: rows.length ? 100 : 0,
  };
}

/**
 * Contratos HTTP sintéticos: ninguna petición /api atraviesa hacia un backend.
 * `writes` incluye mutaciones de negocio, no refresh ni preferencias de sesión.
 * Cada respuesta respeta búsqueda/alcance/paginación; no sustituye QA de BD real.
 */
export async function mockPatientsHttp(
  page: Page,
  options: PatientWorkspaceOptions = {},
) {
  const permissions = options.permissions ?? patientWorkspacePermissions;
  const rows = structuredClone(patientWorkspaceRows);
  const gets: PatientWorkspaceRequest[] = [];
  const writes: PatientWorkspaceWrite[] = [];
  const unknowns: PatientWorkspaceRequest[] = [];
  const preferences = {
    lang: options.english ? "en" : "es",
    accentColor: null,
  };
  let firstBoard = true;
  let boardUnavailable = options.boardUnavailable ?? false;

  if (options.english) {
    await page
      .context()
      .addCookies([
        {
          name: "copp_lang",
          value: "en",
          url:
            options.baseUrl ??
            process.env.E2E_BASE_URL ??
            "http://localhost:3000",
        },
      ]);
  }

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;
    const recorded = {
      method,
      path,
      query: Object.fromEntries(url.searchParams),
    };
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (method === "GET") gets.push(recorded);

    if (path === "/api/auth/refresh" && method === "POST")
      return reply({
        accessToken: "synthetic-patient-workspace-token",
        expiresIn: 3600,
      });
    if (path === "/api/auth/me" && method === "GET")
      return reply({
        id: patientWorkspaceUserId,
        email: "workspace-qa@example.invalid",
        firstName: "Ana",
        lastName: "Pruebas",
        roles: ["QA"],
        permissions,
      });
    if (path === "/api/auth/me/preferences" && method === "GET")
      return reply(preferences);
    if (path === "/api/auth/me/preferences" && method === "PUT") {
      Object.assign(preferences, request.postDataJSON());
      return reply(preferences);
    }
    if (path === "/api/v1/me/context" && method === "GET")
      return reply({
        userId: patientWorkspaceUserId,
        employeeId: null,
        professionalId: null,
        organization: null,
        isProfessional: false,
        professionalTypeName: null,
        onboardingCompleted: true,
        employeeStatus: "Active",
        clinics: [],
        activeClinicId: null,
      });

    if (method !== "GET") {
      let body: unknown;
      try {
        body = request.postDataJSON();
      } catch {
        body = request.postData();
      }
      writes.push({ ...recorded, body });
      unknowns.push(recorded);
      return reply(
        { detail: "La prueba visual no permite escrituras de negocio" },
        405,
      );
    }

    if (path === "/api/v1/insurers") return reply(patientWorkspaceInsurers);
    if (path === "/api/v1/nutrition/inbox")
      return reply({ items: [], total: 0, page: 1, pageSize: 1 });
    if (
      path.startsWith("/api/v1/patients/") &&
      !permissions.some((permission) =>
        ["Patients.View", "Patients.ViewOwn"].includes(permission),
      )
    )
      return reply({ detail: "Sin permiso de pacientes" }, 403);

    const state = url.searchParams.get("state");
    const scoped = rows.filter((row) => !state || row.stateCode === state);
    if (path === "/api/v1/patients/dashboard")
      return reply(
        dashboardOf(
          scoped,
          rows,
          url.searchParams.get("months") === "6" ? 6 : 12,
        ),
      );
    if (path === "/api/v1/patients/clinical-board") {
      const pageNumber = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const pageSize = Math.max(
        1,
        Number(url.searchParams.get("pageSize")) || 10,
      );
      if (pageSize > 1 && firstBoard) {
        firstBoard = false;
        if (options.initialBoardDelayMs)
          await new Promise((resolve) =>
            setTimeout(resolve, options.initialBoardDelayMs),
          );
      }
      if (boardUnavailable)
        return reply(
          { detail: "Tablero temporalmente no disponible (prueba)" },
          503,
        );
      const search = normalize(url.searchParams.get("search")?.trim() ?? "");
      const status = url.searchParams.get("status");
      const insurer = patientWorkspaceInsurers.find(
        (entry) => entry.id === url.searchParams.get("insurerId"),
      );
      const summaryScope = scoped.filter(
        (row) =>
          (!search ||
            normalize(
              `${row.firstName} ${row.lastName} ${row.medicalRecordNumber ?? ""} ${row.documentNumber ?? ""}`,
            ).includes(search)) &&
          (!status || row.status === status) &&
          (!insurer || row.insurerName === insurer.name),
      );
      const risk = url.searchParams.get("risk");
      const followUp = url.searchParams.get("followUp");
      const filtered = summaryScope.filter(
        (row) =>
          (!risk ||
            row.riskLevel === risk ||
            (risk === "high" && row.riskLevel === "critical")) &&
          (url.searchParams.get("hasAlerts") !== "true" ||
            row.activeAlertCount > 0) &&
          (!followUp || row.followUpState === followUp),
      );
      const result: ClinicalBoardResult = {
        data: filtered.slice(
          (pageNumber - 1) * pageSize,
          pageNumber * pageSize,
        ),
        total: filtered.length,
        page: pageNumber,
        pageSize,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
        summary: summarize(summaryScope),
      };
      return reply(result);
    }
    unknowns.push(recorded);
    return reply({ detail: "Endpoint no incluido en la prueba visual" }, 404);
  });

  return {
    rows,
    gets,
    writes,
    unknowns,
    recoverBoard: () => {
      boardUnavailable = false;
    },
  };
}
