"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Check,
  ArrowRight,
  ClipboardCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import { useT } from "@/providers/i18n-provider";
import { useNutritionQueue } from "../hooks/use-nutrition-queue";
import { NutritionPatientDetail } from "./nutrition-patient-detail";
import { NutritionStateChip } from "./nutrition-shared";
import type { NutritionFilter } from "../types/nutrition";
import { NutritionError, NutritionSkeleton } from "./nutrition-feedback";
import "../nutrition.css";

const filters: { value: NutritionFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "en_aprobacion", label: "Por publicar" },
  { value: "borrador_ia", label: "Borradores IA" },
  { value: "devuelto", label: "Devueltos" },
  { value: "aprobado", label: "Publicados" },
  { value: "por_renovar", label: "Por renovar" },
  { value: "sin_plan", label: "Sin plan" },
];

export function NutritionQueue({
  initialPatientId,
  initialPrescriptionId,
}: { initialPatientId?: string; initialPrescriptionId?: string } = {}) {
  const t = useT();
  const {
    data,
    loading,
    error,
    retry,
    search,
    setSearch,
    query,
    setState,
    setPage,
  } = useNutritionQueue();
  const [selection, setSelection] = useState<{
    patientId: string;
    prescriptionId?: string;
  } | null>(
    initialPatientId
      ? { patientId: initialPatientId, prescriptionId: initialPrescriptionId }
      : null,
  );
  const [locked, setLocked] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // La fila del paciente activo se mantiene visible, incluso tras refrescar la bandeja.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [selection?.patientId, data]);

  useEffect(() => {
    const restore = () => {
      if (locked) {
        const path = selection
          ? `/nutrition/${encodeURIComponent(selection.patientId)}${selection.prescriptionId ? `?prescriptionId=${encodeURIComponent(selection.prescriptionId)}` : ""}`
          : "/nutrition";
        window.history.replaceState(null, "", path);
        return;
      }
      const match = window.location.pathname.match(/^\/nutrition\/([^/]+)$/);
      setSelection(
        match
          ? {
              patientId: decodeURIComponent(match[1]),
              prescriptionId:
                new URLSearchParams(window.location.search).get(
                  "prescriptionId",
                ) ?? undefined,
            }
          : null,
      );
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [locked, selection]);

  function select(patientId?: string, prescriptionId?: string) {
    if (locked) return;
    setSelection(patientId ? { patientId, prescriptionId } : null);
    window.history.pushState(
      null,
      "",
      patientId
        ? `/nutrition/${encodeURIComponent(patientId)}${prescriptionId ? `?prescriptionId=${encodeURIComponent(prescriptionId)}` : ""}`
        : "/nutrition",
    );
  }

  return (
    <div
      className="nutrition-module nutrition-rework min-w-0"
      data-has-patient={!!selection}
    >
      <PageHeader
        title={t("Nutricionista")}
        description={t(
          "Resultados, programación y planes en un mismo espacio.",
        )}
        icon={Stethoscope}
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={retry}
            aria-label={t("Actualizar bandeja")}
            className="min-h-11 min-w-11"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("Actualizar")}</span>
          </Button>
        }
      />
      <div className="nutrition-workbench">
        <aside
          className="nutrition-patient-rail"
          aria-label={t("Bandeja de pacientes")}
        >
          <SectionHeader
            title={t("Pacientes")}
            icon={Users}
            variant="secondary"
            description={
              data
                ? t("{count} pacientes", { count: String(data.total) })
                : t("Bandeja de nutrición")
            }
          />
          <div className="nutrition-rail-tools">
            <label htmlFor="nutrition-search" className="sr-only">
              {t("Buscar paciente")}
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="nutrition-search"
                type="search"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("Buscar paciente")}
                className="pl-9"
              />
            </div>
            <label htmlFor="nutrition-state" className="nutrition-state-label">{t("Estado del plan")}</label>
            <select
              id="nutrition-state"
              className="nutrition-select nutrition-rail-state"
              value={query.state}
              onChange={(event) => {
                const filter = filters.find((item) => item.value === event.target.value);
                if (filter) setState(filter.value);
              }}
            >
              {filters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {t(filter.label)} ({data?.counts[filter.value] ?? "—"})
                </option>
              ))}
            </select>
          </div>
          <div className="nutrition-patient-list" aria-busy={loading}>
            {loading ? (
              <NutritionSkeleton />
            ) : error ? (
              <NutritionError retry={retry} issue={error} />
            ) : data?.items.length ? (
              <ul aria-label={t("Planes de pacientes")} ref={listRef}>
                {data.items.map((patient) => (
                  <li
                    key={patient.patientId}
                    className="nutrition-patient-option"
                    data-selected={selection?.patientId === patient.patientId}
                  >
                    <Link
                      aria-label={patient.patientName}
                      href={`/nutrition/${encodeURIComponent(patient.patientId)}${patient.plan ? `?prescriptionId=${encodeURIComponent(patient.plan.id)}` : ""}`}
                      aria-current={
                        selection?.patientId === patient.patientId
                          ? "true"
                          : undefined
                      }
                      aria-disabled={locked}
                      onClick={(event) => {
                        if (event.ctrlKey || event.metaKey || event.shiftKey)
                          return;
                        event.preventDefault();
                        select(patient.patientId, patient.plan?.id);
                      }}
                    >
                      <span className="nutrition-patient-name">
                        {patient.patientName}
                        {selection?.patientId === patient.patientId && (
                          <Check
                            className="size-4 shrink-0"
                            aria-label={t("Paciente seleccionado")}
                          />
                        )}
                      </span>
                      <span className="nutrition-patient-meta">
                        <NutritionStateChip
                          state={patient.plan?.queueState ?? "sin_plan"}
                        />
                        {!!patient.plan && (
                          <span className="nutrition-measure nutrition-patient-version">
                            {t("v{version}", {
                              version: String(patient.plan.version),
                            })}
                          </span>
                        )}
                        {patient.plan?.dailyKcal != null && (
                          <span className="nutrition-measure nutrition-patient-kcal">
                            {`${patient.plan.dailyKcal.toLocaleString()} kcal`}
                          </span>
                        )}
                        {!!patient.plan?.criticalAlertCount && (
                          <span className="nutrition-critical-count">
                            <ShieldAlert
                              className="size-3"
                              aria-hidden="true"
                            />
                            {patient.plan.criticalAlertCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="nutrition-rail-empty">
                <Search className="size-6" aria-hidden="true" />
                <p>{t("No encontramos pacientes en esta vista")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setState("all");
                  }}
                >
                  {t("Limpiar filtros")}
                </Button>
              </div>
            )}
          </div>
          <nav
            className="nutrition-rail-pagination"
            aria-label={t("Paginación de nutrición")}
          >
            <p role="status">
              {data
                ? t("Página {page} de {pages} · {total} pacientes", {
                    page: String(data.page),
                    pages: String(Math.max(1, data.totalPages)),
                    total: String(data.total),
                  })
                : "—"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading || !data || query.page <= 1}
                onClick={() => setPage(query.page - 1)}
              >
                {t("Anterior")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || !data || query.page >= data.totalPages}
                onClick={() => setPage(query.page + 1)}
              >
                {t("Siguiente")}
              </Button>
            </div>
          </nav>
        </aside>
        <section
          className="nutrition-detail-panel"
          aria-label={t("Ficha nutricional")}
        >
          {selection ? (
            <NutritionPatientDetail
              patientId={selection.patientId}
              prescriptionId={selection.prescriptionId}
              onBack={() => select()}
              onNavigationLock={setLocked}
              onPlanChanged={retry}
              onOpenPrescription={(id, history, keepTab) => {
                select(selection.patientId, id);
                const url = new URL(window.location.href);
                url.searchParams.set(
                  "tab",
                  history ? "resultados" : (keepTab ?? "plan"),
                );
                if (history) url.searchParams.set("history", "1");
                else url.searchParams.delete("history");
                window.history.replaceState(null, "", url);
              }}
              onPrescriptionActive={(id) => {
                // La prescripción activa cambia al crear versión o regenerar:
                // se alinea la selección con el estado local y con la URL, y la
                // ficha se recarga con los datos confirmados por el servidor.
                if (!id) return;
                setSelection((previous) =>
                  previous && previous.patientId === selection.patientId
                    ? { ...previous, prescriptionId: id }
                    : previous,
                );
                const url = new URL(window.location.href);
                if (url.searchParams.get("prescriptionId") !== id) {
                  url.searchParams.set("prescriptionId", id);
                  window.history.replaceState(null, "", url);
                }
              }}
            />
          ) : (
            <div className="nutrition-workbench-empty">
              <SectionHeader
                title={t("Tu bandeja de trabajo")}
                description={t("Selecciona un paciente para revisar su plan.")}
                icon={ClipboardCheck}
              />
              <div className="nutrition-overview-stats">
                <StatCard
                  label={t("Pacientes")}
                  value={data?.counts.all ?? "—"}
                  icon={Users}
                  variant="primary"
                />
                <StatCard
                  label={t("Por publicar")}
                  value={data?.counts.en_aprobacion ?? "—"}
                  icon={ClipboardCheck}
                  variant="warning"
                />
                <StatCard
                  label={t("Sin plan")}
                  value={data?.counts.sin_plan ?? "—"}
                  icon={Activity}
                  variant="info"
                />
              </div>
              <div className="nutrition-selection-guide">
                <Stethoscope
                  className="size-10 text-primary"
                  aria-hidden="true"
                />
                <h2>{t("Una revisión, tres pasos")}</h2>
                <p>
                  {t(
                    "Consulta los resultados, revisa la programación y ajusta el plan de 30 días.",
                  )}
                </p>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="size-4" aria-hidden="true" />
                  {t("Elige un paciente de la bandeja")}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
