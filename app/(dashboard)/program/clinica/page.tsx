"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppContext } from "@/providers/context-provider";
import { ProgramViewSwitcher } from "@/features/program/components/program-view-switcher";
import { ProgramWeaknessesPage } from "@/features/program/components/program-weaknesses-page";
import { ProgramAdaptationsPage } from "@/features/program/components/program-adaptations-page";
import { ProgramInterventionsPage } from "@/features/program/components/program-interventions-page";

const CLINICA_VIEWS = [
  { value: "debilidades", label: "Debilidades", permission: "Program.Adapt" },
  { value: "adaptaciones", label: "Adaptaciones", permission: "Program.Adapt" },
  { value: "intervenciones", label: "Intervenciones", permission: "Program.Adapt" },
];

function getVisibleViews(can: (code: string) => boolean) {
  return CLINICA_VIEWS.filter((v) => can(v.permission));
}

function getComponent(view: string) {
  switch (view) {
    case "adaptaciones":
      return <ProgramAdaptationsPage />;
    case "intervenciones":
      return <ProgramInterventionsPage />;
    case "debilidades":
    default:
      return <ProgramWeaknessesPage />;
  }
}

export default function ProgramClinicaRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAppContext();

  const currentView = searchParams.get("view") ?? "debilidades";
  const visibleViews = getVisibleViews(can);
  const activeView =
    visibleViews.find((v) => v.value === currentView)?.value ??
    visibleViews[0]?.value ??
    "debilidades";

  const handleChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <ProgramViewSwitcher
          value={activeView}
          options={visibleViews}
          onChange={handleChange}
        />
      </div>
      {getComponent(activeView)}
    </div>
  );
}
