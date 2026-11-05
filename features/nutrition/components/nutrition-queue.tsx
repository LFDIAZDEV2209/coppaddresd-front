"use client";

import { Search, Sparkles, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n, useT } from "@/providers/i18n-provider";
import { useNutritionQueue } from "../hooks/use-nutrition-queue";
import { nutritionUsesMocks } from "../services/nutrition-service";
import type { NutritionFilter, NutritionPatientSummary, NutritionQueueState } from "../types/nutrition";
import { NutritionError, NutritionSkeleton } from "./nutrition-feedback";
import "../nutrition.css";

const filters: { value: NutritionFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "en_aprobacion", label: "Por aprobar" },
  { value: "borrador_ia", label: "Borradores IA" },
  { value: "devuelto", label: "Devueltos" },
  { value: "aprobado", label: "Aprobados" },
  { value: "por_renovar", label: "Por renovar" },
  { value: "sin_plan", label: "Sin plan" },
];

const stateLabels: Record<NutritionQueueState, string> = {
  en_aprobacion: "Por aprobar", borrador_ia: "Borrador IA", devuelto: "Devuelto",
  aprobado: "Aprobado", por_renovar: "Por renovar", sin_plan: "Sin plan",
};

function PatientRow({ patient }: { patient: NutritionPatientSummary }) {
  const t = useT();
  const { lang } = useI18n();
  const { plan } = patient;
  const state = plan?.queueState ?? "sin_plan";
  return <li className="nutrition-patient">
    <div className="min-w-0">
      <h3 className="break-words text-base font-semibold">{patient.patientName}</h3>
      <p className="mt-1 break-words text-sm text-muted-foreground">{patient.patientDocument ?? t("Sin documento")}</p>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="nutrition-chip" data-status={state}>{state === "borrador_ia" && <Sparkles aria-hidden="true" className="size-3.5" />}{t(stateLabels[state])}</span>
      {plan?.provisional && <span className="text-xs font-medium text-muted-foreground">{t("Provisional")}</span>}
    </div>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-2">
      <div><dt className="text-xs text-muted-foreground">{t("Versión")}</dt><dd className="nutrition-measure mt-1 text-sm">{plan ? t("v{version}", { version: String(plan.version) }) : t("Sin plan")}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{t("Meta diaria")}</dt><dd className="nutrition-measure mt-1 text-sm">{plan?.dailyKcal != null ? t("{kcal} kcal", { kcal: new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO").format(plan.dailyKcal) }) : t("Sin definir")}</dd></div>
    </dl>
    <div className="flex flex-wrap items-center gap-2">
      {plan && plan.criticalAlertCount > 0 ? <span className="nutrition-chip" data-status="critical"><ShieldAlert aria-hidden="true" className="size-3.5" />{t("{count} alertas críticas", { count: String(plan.criticalAlertCount) })}</span> : <span className="text-xs text-muted-foreground">{plan ? t("Sin alertas críticas") : t("Plan aún no creado")}</span>}
      {plan?.aiAssisted && state !== "borrador_ia" && <span className="nutrition-chip" data-status="borrador_ia"><Sparkles aria-hidden="true" className="size-3.5" />{t("Asistido por IA")}</span>}
    </div>
  </li>;
}

export function NutritionQueue() {
  const t = useT();
  const { data, loading, error, retry, search, setSearch, query, setState, setPage } = useNutritionQueue();
  return <div className="nutrition-module mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-7 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="nutrition-display text-3xl font-semibold sm:text-4xl">{t("Nutrición")}</h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{t("Una bandeja para acompañar el plan nutricional de cada paciente.")}</p></div>
      <Button variant="outline" disabled={loading} onClick={retry}>{t("Actualizar")}</Button>
    </header>
    {nutritionUsesMocks && <p className="rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">{t("Vista de demostración · Pacientes y metas ficticios. No se realizan cambios clínicos.")}</p>}
    <section className="min-w-0 rounded-xl border border-border bg-card" aria-labelledby="nutrition-queue-title">
      <div className="space-y-5 border-b border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><h2 id="nutrition-queue-title" className="nutrition-display text-xl font-semibold">{t("Planes de pacientes")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Filtra por estado y encuentra a tu paciente.")}</p></div>
          <div className="w-full sm:w-80"><label htmlFor="nutrition-search" className="mb-2 block text-sm font-medium">{t("Buscar paciente")}</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="nutrition-search" type="search" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Nombre o documento")} className="h-10 pl-9" /></div></div>
        </div>
        <ToggleGroup aria-label={t("Filtrar planes por estado")} value={[query.state]} onValueChange={(values) => { const selected = filters.find((filter) => filter.value === values[0]); if (selected) setState(selected.value); }} className="nutrition-filters max-w-full flex-wrap justify-start" variant="outline">
          {filters.map((filter) => <ToggleGroupItem key={filter.value} value={filter.value} className="nutrition-filter min-h-10 gap-2 rounded-full px-3" data-status={filter.value}>
            {filter.value === "borrador_ia" && <Sparkles aria-hidden="true" className="size-3.5" />}{t(filter.label)}
            {data && <span className="nutrition-measure text-xs">{data.counts[filter.value]}</span>}
          </ToggleGroupItem>)}
        </ToggleGroup>
      </div>
      <div aria-busy={loading}>
        {loading ? <NutritionSkeleton /> : error ? <div className="p-5"><NutritionError retry={retry} /></div> : data?.items.length ? <>
          <ul role="list" aria-label={t("Planes de pacientes")} className="divide-y divide-border">{data.items.map((patient) => <PatientRow key={patient.patientId} patient={patient} />)}</ul>
          <nav aria-label={t("Paginación de nutrición")} className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4 sm:px-6">
            <p role="status" className="text-sm text-muted-foreground">{t("Página {page} de {pages} · {total} pacientes", { page: String(data.page), pages: String(Math.max(1, data.totalPages)), total: String(data.total) })}</p>
            <div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>{t("Anterior")}</Button><Button variant="outline" disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>{t("Siguiente")}</Button></div>
          </nav>
        </> : <div role="status" className="flex flex-col items-center gap-3 px-5 py-16 text-center"><ClipboardCheck aria-hidden="true" className="size-9 text-info" /><h3 className="text-lg font-semibold">{t("No encontramos pacientes en esta vista")}</h3><p className="max-w-md text-sm text-muted-foreground">{t("Prueba con otro nombre, documento o estado.")}</p>{(query.search || query.state !== "all") && <Button variant="outline" onClick={() => { setSearch(""); setState("all"); }}>{t("Limpiar filtros")}</Button>}</div>}
      </div>
    </section>
  </div>;
}
