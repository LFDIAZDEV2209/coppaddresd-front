"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppContext } from "@/providers/context-provider";
import { ProgramViewSwitcher } from "@/features/program/components/program-view-switcher";
import { ProgramDashboardPage } from "@/features/program/components/program-dashboard-page";
import { ProgramTodayPage } from "@/features/program/components/program-today-page";
import { ProgramActivityLogPage } from "@/features/program/components/program-activity-log-page";

const DASHBOARD_VIEWS = [
  { value: "resumen", label: "Resumen", permission: "Program.View" },
  { value: "hoy", label: "Hoy", permission: "Program.View" },
  { value: "bitacora", label: "Bitácora", permission: "Program.View" },
];

function getVisibleViews(can: (code: string) => boolean) {
  return DASHBOARD_VIEWS.filter((v) => can(v.permission));
}

function getComponent(view: string) {
  switch (view) {
    case "hoy":
      return <ProgramTodayPage />;
    case "bitacora":
      return <ProgramActivityLogPage />;
    case "resumen":
    default:
      return <ProgramDashboardPage />;
  }
}

export default function ProgramDashboardRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAppContext();

  const currentView = searchParams.get("view") ?? "resumen";
  const visibleViews = getVisibleViews(can);
  const activeView =
    visibleViews.find((v) => v.value === currentView)?.value ??
    visibleViews[0]?.value ??
    "resumen";

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
