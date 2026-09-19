import { readFileSync } from "node:fs";
import path from "node:path";

/** Fixtures deterministas generadas por `e2e/seed/seed-e2e.py`. */
export interface E2EFixtures {
  generatedAt: string;
  professional: { id: string; email: string; password: string };
  patient: { id: string; name: string | null };
  settings: { reopenGraceMinutes: number };
  appointments: {
    /** Confirmada (hoy, ventana abierta) con sala activa: journey de llamada. */
    roomOpen: string;
    /** Confirmada a futuro con la sala todavía cerrada: gating sin Twilio. */
    roomClosed: string;
    /** Confirmada (hoy, ventana abierta) para el journey de métricas vía API. */
    metrics: string;
    /** Completada hace pocos minutos: dentro de la gracia configurada. */
    reopenRecent: string;
    /** Completada hace más de la gracia: sin botón de reapertura. */
    reopenOld: string;
  };
}

const FIXTURES_PATH =
  process.env.E2E_FIXTURES_PATH ??
  path.join(process.cwd(), "e2e", ".fixtures.json");

export function loadFixtures(): E2EFixtures {
  try {
    return JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as E2EFixtures;
  } catch {
    throw new Error(
      `No se encontraron los fixtures E2E en ${FIXTURES_PATH}. ` +
        "Corré `yarn e2e:seed` (o scripts/e2e-local.sh) antes de la suite.",
    );
  }
}

/** Fecha local (YYYY-MM-DD) de un ISO UTC, para el parámetro `?fecha=`. */
export function localDateOf(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
