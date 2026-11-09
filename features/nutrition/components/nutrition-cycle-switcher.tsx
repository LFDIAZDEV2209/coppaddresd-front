"use client";

import { useNutritionDate } from "./nutrition-shared";
import { CalendarDays } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { groupNutritionCycles } from "./nutrition-program-cycles";
import type {
  NutritionCycle,
  NutritionCycleHeader,
  NutritionQueueState,
} from "../types/nutrition";

/** Etiquetas clínicas del mismo vocabulario del ERP; la traducción vive en los diccionarios. */
const stateLabels: Record<NutritionQueueState, string> = {
  en_aprobacion: "Por aprobar",
  borrador_ia: "Borrador IA",
  aprobado: "Aprobado",
  devuelto: "Devuelto",
  por_renovar: "Por renovar",
  sin_plan: "Sin plan",
};

interface Props {
  /** Prescripción activa en la ficha: la que se está viendo o editando. */
  cycle: NutritionCycle | null;
  /** Cabeceras ya descargadas; agrupadas por ciclo, nunca descargan menús. */
  headers: NutritionCycleHeader[];
  /** Id de la copia publicada vigente, para contextualizar sin duplicar controles. */
  publishedId?: string | null;
  locked?: boolean;
  /** Cambia la prescripción activa; el workspace se recarga con ese id. */
  onOpen: (prescriptionId: string) => void;
}

/** Barra de contexto: qué ciclo y versión se está viendo, y hacia dónde saltar. */
export function NutritionCycleSwitcher({
  cycle,
  headers,
  publishedId,
  locked,
  onOpen,
}: Props) {
  const t = useT();
  const date = useNutritionDate();
  const groups = groupNutritionCycles(headers);
  // Con una sola opción el control sobra: la ficha ya muestra ciclo y versión.
  if (
    !cycle ||
    (groups.length < 2 && groups.every((group) => group.versions.length < 2))
  )
    return null;
  const publishedCopy = headers.find((header) => header.id === publishedId);

  return (
    <section
      className="nutrition-cycle-switcher"
      aria-label={t("Selector de ciclo y versión")}
    >
      <span className="nutrition-switcher-icon">
        <CalendarDays className="size-4" aria-hidden="true" />
      </span>
      <label htmlFor="nutrition-cycle-target">{t("Ciclo y versión")}</label>
      <select
        id="nutrition-cycle-target"
        className="nutrition-select nutrition-switcher-select"
        value={cycle.id}
        disabled={locked}
        onChange={(event) => onOpen(event.target.value)}
      >
        {groups.map((group) => (
          <optgroup
            key={group.id}
            label={t("Ciclo {cycle}", { cycle: String(group.number) })}
          >
            {group.versions.map((version) => (
              <option key={version.id} value={version.id}>
                {t("Ciclo {cycle}", { cycle: String(group.number) })} · {t("Versión {version}", { version: String(version.version) })} —{" "}
                {t(stateLabels[version.state])}
                {version.isPublished ? ` · ${t("Publicada")}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {publishedCopy && publishedCopy.id !== cycle.id && (
        <p className="nutrition-switcher-hint">
          {publishedCopy.startDate && publishedCopy.endDate
            ? t(
                "La copia publicada v{publishedVersion} sigue vigente de {start} a {end}.",
                {
                  publishedVersion: String(publishedCopy.version),
                  start: date(publishedCopy.startDate),
                  end: date(publishedCopy.endDate),
                },
              )
            : t("La copia publicada v{publishedVersion} sigue vigente.", {
                publishedVersion: String(publishedCopy.version),
              })}
        </p>
      )}
    </section>
  );
}
