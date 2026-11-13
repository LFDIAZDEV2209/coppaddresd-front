"use client";

import { useState } from "react";
import { CalendarDays, Layers, ArrowUpRight, History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import type { NutritionCycleHeader } from "../types/nutrition";
import { NutritionStateChip, NutritionValidity, useNutritionDate, useNutritionNumber } from "./nutrition-shared";

interface Props {
  headers: NutritionCycleHeader[];
  selectedId?: string;
  today: string | null;
  locked: boolean;
  onOpen: (id: string, history?: boolean) => void;
  onCreate?: () => void;
}

/** Un grupo por identidad persistida. Las versiones nunca crean otro ciclo. */
export function groupNutritionCycles(headers: NutritionCycleHeader[]) {
  const groups = new Map<string, NutritionCycleHeader[]>();
  for (const header of [...headers].reverse()) {
    const versions = groups.get(header.cycleId) ?? [];
    versions.push(header);
    groups.set(header.cycleId, versions);
  }
  return [...groups.entries()].map(([id, versions], index) => ({ id, number: index + 1, versions: versions.sort((a, b) => b.version - a.version) }));
}

/** Fechas civiles: cálculo UTC solo para diferencias de días, nunca zona del navegador. */
function dayInCycle(start: string, today: string) {
  return Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export function NutritionProgramCycles({ headers, selectedId, today, locked, onOpen, onCreate }: Props) {
  const t = useT();
  const format = useNutritionNumber();
  const date = useNutritionDate();
  const groups = groupNutritionCycles(headers);
  const [selection, setSelection] = useState<string | null>(null);
  const active = groups.some((group) => group.id === selection) ? selection : groups.find((group) => group.versions.some((row) => row.id === selectedId))?.id ?? groups[0]?.id;
  const temporalLabel = (row: NutritionCycleHeader) => {
    if (!row.startDate || !row.endDate) return t("Sin vigencia definida");
    if (!row.isPublished) return t("Sin publicación");
    if (!today) return t("Vigencia por confirmar");
    return t(row.endDate < today ? "Período finalizado" : row.startDate > today ? "Publicado / programado" : "En curso");
  };

  return <section className="nutrition-section nutrition-program">
    <SectionHeader title={t("Calendario del programa")} icon={CalendarDays} variant="tertiary" />
    {!groups.length ? <div className="nutrition-empty-plan mt-4"><p>{t("Aún no hay ciclos para mostrar.")}</p>{onCreate && <Button variant="outline" disabled={locked} onClick={onCreate}>{t("Crear primera propuesta")}</Button>}</div> : <>
      <ol className="nutrition-program-calendar" aria-label={t("Ciclos del programa")}>
        {groups.map((group) => {
          const latest = group.versions[0];
          const period = group.versions.find((row) => row.isPublished) ?? latest;
          const day = today && period.isPublished && period.startDate && period.endDate && today >= period.startDate && today <= period.endDate ? dayInCycle(period.startDate, today) : null;
          return <li key={group.id}><button type="button" disabled={locked} aria-pressed={active === group.id} onClick={() => setSelection(group.id)} className="nutrition-program-period">
            <span className="nutrition-program-period-title"><strong className="nutrition-measure">C{group.number}</strong><span>{period.startDate && period.endDate ? `${date(period.startDate)} – ${date(period.endDate)}` : t("Sin vigencia definida")}</span><span className="text-xs">{period.startDate && period.endDate ? temporalLabel(period) : <NutritionStateChip state={latest.state} />}</span></span>
            <span className="nutrition-program-track" data-published={period.isPublished} aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <span key={index} />)}{day !== null && day >= 1 && day <= 30 && <i style={{ left: `${((day - 0.5) / 30) * 100}%` }} />}</span>
            {day !== null && <span className="nutrition-program-today">{t("Hoy · día {day} de 30", { day: String(day) })}</span>}
          </button></li>;
        })}
      </ol>
      {!today && <p className="mt-2 text-xs text-muted-foreground">{t("Zona del paciente pendiente: hoy no se representa.")}</p>}
      <div className="mt-5"><SectionHeader title={t("Plan por ciclo")} icon={Layers} variant="tertiary" /></div>
      <div className="nutrition-cycles-table-container">
        <table className="nutrition-cycles-table" role="table">
          <caption className="sr-only">{t("Planes y versiones por ciclo")}</caption>
          <thead>
            <tr>{["Ciclo", "Fechas y estado", "Plan y metas", "Acciones"].map((label) => <th scope="col" key={label}>{t(label)}</th>)}</tr>
          </thead>
          <tbody>{groups.map((group) => {
            const row = group.versions[0];
            return <tr key={group.id} data-selected={active === group.id}>
              <th scope="row">
                <div className="nutrition-cycle-identity">
                  <span className="nutrition-cycle-index nutrition-measure">C{group.number}</span>
                  <span className="nutrition-row-secondary">{t("Versión {version}", { version: String(row.version) })}</span>
                </div>
              </th>
              <td>
                <span className="nutrition-cycle-cell-label">{t("Fechas y estado")}</span>
                <div className="nutrition-cycle-dates"><CalendarDays aria-hidden="true" /><NutritionValidity start={row.startDate} end={row.endDate} /></div>
                <div className="nutrition-cycle-status"><NutritionStateChip state={row.state} /><span className="nutrition-row-secondary">{temporalLabel(row)}</span></div>
                {group.versions.some((entry) => entry.isPublished && entry.id !== row.id) && <p className="nutrition-row-secondary mt-2">{t("Conserva una versión publicada")}</p>}
              </td>
              <td>
                <span className="nutrition-cycle-cell-label">{t("Plan y metas")}</span>
                <strong className="nutrition-cycle-energy nutrition-measure">{format(row.targets.kcal, 0)} <span>kcal</span></strong>
                <dl className="nutrition-cycle-macros">{([["Carbohidratos", row.targets.carbsG], ["Proteínas", row.targets.proteinG], ["Grasas", row.targets.fatG]] as const).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd className="nutrition-measure">{format(value)} <span>g</span></dd></div>)}</dl>
              </td>
              <td>
                <div className="nutrition-cycle-row-actions">
                  <Button variant="outline" size="sm" disabled={locked} onClick={() => onOpen(row.id)} aria-label={t("Ver plan C{cycle}", { cycle: String(group.number) })}>{t("Ver")}<ArrowUpRight aria-hidden="true" className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" disabled={locked} onClick={() => onOpen(row.id, true)} aria-label={t("Ver historial C{cycle}", { cycle: String(group.number) })} title={t("Ver historial")}><History aria-hidden="true" className="size-4" /></Button>
                </div>
                {group.versions.length > 1 && <details className="nutrition-cycle-versions"><summary>{t("Versiones anteriores")}<ChevronDown aria-hidden="true" className="size-3.5" /></summary>{group.versions.slice(1).map((version) => <Button key={version.id} variant="ghost" size="sm" disabled={locked} onClick={() => onOpen(version.id)}>{t("Versión {version}", { version: String(version.version) })}{version.isPublished && <span>{t("Publicada")}</span>}</Button>)}</details>}
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
