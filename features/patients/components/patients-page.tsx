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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          {t("No tienes permiso para ver el módulo de pacientes.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title={fullScope ? t("Pacientes") : t("Mis pacientes")}
        description={t(
          "Gestión completa · seguimiento clínico · mapa geográfico EE. UU.",
        )}
        icon={UserRound}
        layout="workspace"
        actions={
          canCreate ? (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="comfortable"
                onClick={() => router.push("/people/importar?from=/patients")}
              >
                <FileUp data-icon="inline-start" />
                {t("Importar CSV")}
              </Button>
              <Button
                variant="default"
                size="comfortable"
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-foreground">
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

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as PatientTab)}
        className="min-w-0 gap-5"
      >
        <TabsList
          variant="line"
          aria-label={t("Secciones de pacientes")}
          className="h-auto w-full justify-start border-b border-border px-0 py-1"
        >
          {PATIENT_TABS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="min-h-14 min-w-0 flex-1 flex-col px-1 text-xs sm:min-h-11 sm:flex-none sm:flex-row sm:px-4 sm:text-sm data-active:text-primary-soft-foreground after:bg-primary-soft-foreground"
              >
                <Icon aria-hidden className="size-4" />
                <span className="whitespace-normal text-center">
                  {t(item.label)}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="resumen">
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
        </TabsContent>
        <TabsContent value="mapa">
          <PatientGeoView
            states={dashboard.data?.states ?? []}
            selected={stateCode}
            onSelect={setStateCode}
            loading={dashboard.loading && !dashboard.data}
          />
        </TabsContent>
        <TabsContent value="estado-clinico">
          <ClinicalBoardView
            stateCode={stateCode}
            initialFilters={clinicalIntent ?? undefined}
            onClearState={() => setStateCode(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
