"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileUp,
  LayoutDashboard,
  MapPin,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { useClinicalBoardSummary } from "../hooks/use-clinical-board-summary";
import { usePatientDashboard } from "../hooks/use-patient-dashboard";
import { ClinicalBoardView } from "./clinical-board-view";
import { PatientGeoView } from "./patient-geo-view";
import { PatientSummaryView } from "./patient-summary-view";
import type { ClinicalBoardFilters } from "../types";

const PATIENT_TABS = [
  { value: "resumen", label: "Vista general", icon: LayoutDashboard },
  { value: "mapa", label: "Mapa geográfico", icon: MapPin },
  { value: "estado-clinico", label: "Estado clínico", icon: ClipboardList },
] as const;

type PatientTab = (typeof PATIENT_TABS)[number]["value"];

const TAB_VALUES = new Set<string>(PATIENT_TABS.map((tab) => tab.value));

/**
 * Tab inicial desde la URL (`?tab=`). El antiguo Directorio se fusionó en
 * Estado clínico, así que los enlaces compartidos se redirigen ahí.
 */
function readInitialTab(): PatientTab {
  if (typeof window === "undefined") return "resumen";
  const value = new URLSearchParams(window.location.search).get("tab");
  if (value === "directorio") return "estado-clinico";
  return value && TAB_VALUES.has(value) ? (value as PatientTab) : "resumen";
}

/** Estado seleccionado en el mapa (`?state=CA`), compartido con las demás secciones. */
function readInitialState(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("state");
  return value ? value.trim().toUpperCase() : null;
}

/**
 * Dashboard general de pacientes: tres secciones enlazables por `?tab=`
 * (deep-link y compartición), con el filtro de estado del mapa compartido por
 * URL entre Vista general, Mapa y Estado clínico (que integra el directorio).
 */
export function PatientsPage() {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();
  const [tab, setTabState] = useState<PatientTab>(readInitialTab);
  const [stateCode, setStateCodeState] = useState<string | null>(
    readInitialState,
  );
  const [clinicalIntent, setClinicalIntent] =
    useState<Partial<ClinicalBoardFilters> | null>(null);
  const dashboard = usePatientDashboard(stateCode);
  const clinicalSummary = useClinicalBoardSummary(stateCode);

  const canCreate = can("Patients.Create");
  const fullScope = can("Patients.View");
  const canView = fullScope || can("Patients.ViewOwn");

  const updateUrl = (nextTab: PatientTab, nextState: string | null) => {
    const params = new URLSearchParams();
    if (nextTab !== "resumen") params.set("tab", nextTab);
    if (nextState) params.set("state", nextState);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/patients?${query}` : "/patients",
    );
  };

  const setTab = (value: PatientTab) => {
    setTabState(value);
    if (value !== "estado-clinico") setClinicalIntent(null);
    updateUrl(value, stateCode);
  };

  const setStateCode = (value: string | null) => {
    setStateCodeState(value);
    updateUrl(tab, value);
  };

  /** Navega desde las tarjetas de Vista general al tablero clínico con filtros. */
  const openClinical = (filters: Partial<ClinicalBoardFilters>) => {
    setClinicalIntent(filters);
    setTabState("estado-clinico");
    updateUrl("estado-clinico", stateCode);
  };

  if (!canView) {
    return (
      <div className="p-6">
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
          {t("No tienes permiso para ver el módulo de pacientes.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={fullScope ? t("Pacientes") : t("Mis pacientes")}
        description={t(
          "Gestión completa · seguimiento clínico · mapa geográfico EE. UU.",
        )}
        icon={UserRound}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/people/importar?from=/patients")}
              >
                <FileUp data-icon="inline-start" />
                {t("Importar CSV")}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/people/new?context=patient")}
              >
                <Plus data-icon="inline-start" />
                {t("Nuevo paciente")}
              </Button>
            </div>
          ) : undefined
        }
      />

      {stateCode && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <MapPin aria-hidden className="size-3.5" />
            {t("Filtrado por estado")}: {stateCode}
            <button
              type="button"
              onClick={() => setStateCode(null)}
              aria-label={t("Quitar filtro de estado")}
              className="rounded-full p-0.5 hover:bg-primary/10"
            >
              <X className="size-3" />
            </button>
          </span>
        </div>
      )}

      <nav
        role="tablist"
        aria-label={t("Secciones de pacientes")}
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border"
      >
        {PATIENT_TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(item.value)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--sidebar)] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {t(item.label)}
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        aria-label={t(
          PATIENT_TABS.find((item) => item.value === tab)?.label ?? "",
        )}
      >
        {tab === "resumen" && (
          <PatientSummaryView
            data={dashboard.data}
            loading={dashboard.loading}
            error={dashboard.error}
            months={dashboard.months}
            onMonthsChange={dashboard.setMonths}
            onRetry={dashboard.retry}
            clinicalSummary={clinicalSummary}
            onOpenClinical={openClinical}
          />
        )}
        {tab === "mapa" && (
          <PatientGeoView
            states={dashboard.data?.states ?? []}
            selected={stateCode}
            onSelect={setStateCode}
            loading={dashboard.loading && !dashboard.data}
          />
        )}
        {tab === "estado-clinico" && (
          <ClinicalBoardView
            stateCode={stateCode}
            initialFilters={clinicalIntent ?? undefined}
            onClearState={() => setStateCode(null)}
          />
        )}
      </div>
    </div>
  );
}
