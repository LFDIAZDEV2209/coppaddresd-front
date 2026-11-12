"use client";

import {PageHeader} from "@/components/layout/page-header";
import {Stethoscope} from "lucide-react";
import { useState } from "react";
import { NutritionProgramCycles } from "../components/nutrition-program-cycles";
import { NutritionCycleDecisions } from "./nutrition-cycle-decisions";
import type { NutritionCycleHeader } from "../types/nutrition";
import { useT } from "@/providers/i18n-provider";
import "../nutrition.css";

// Fixtures exploratorios explícitos, importados únicamente por ruta Development.
const headers: NutritionCycleHeader[] = [
  { id: "preview-c3", cycleId: "preview-cycle-3", version: 1, state: "en_aprobacion", isPublished: false, startDate: null, endDate: null, targets: { kcal: 1750, carbsG: 190, proteinG: 105, fatG: 62 } },
  { id: "preview-c2", cycleId: "preview-cycle-2", version: 1, state: "aprobado", isPublished: true, startDate: "2026-10-21", endDate: "2026-11-19", targets: { kcal: 1800, carbsG: 200, proteinG: 110, fatG: 62 } },
  { id: "preview-c1-v2", cycleId: "preview-cycle-1", version: 2, state: "aprobado", isPublished: true, startDate: "2026-09-21", endDate: "2026-10-20", targets: { kcal: 1850, carbsG: 210, proteinG: 105, fatG: 65 } },
  { id: "preview-c1-v1", cycleId: "preview-cycle-1", version: 1, state: "devuelto", isPublished: false, startDate: null, endDate: null, targets: { kcal: 1900, carbsG: 215, proteinG: 110, fatG: 65 } },
];

export function NutritionCyclesPreview() {
  const t = useT();
  const [status, setStatus] = useState("");
  return <div className="nutrition-module nutrition-rework space-y-4">
    <PageHeader title={t("Exploración local de ciclos")} description={t("Datos sintéticos · hoy fijo: 6 de noviembre de 2026 · sin conexión clínica")} icon={Stethoscope}/>
    <NutritionProgramCycles headers={headers} today="2026-11-06" selectedId="preview-c2" locked={false} onOpen={() => setStatus("Vista previa local. No se guardaron cambios.")} />
    {status && <p role="status">{t(status)}</p>}
    <NutritionCycleDecisions />
  </div>;
}
