"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppContext } from "@/providers/context-provider";
import { ProgramViewSwitcher } from "@/features/program/components/program-view-switcher";
import { ProgramAdherenciaPage } from "@/features/program/components/program-adherencia-page";
import { ProgramCofresPage } from "@/features/program/components/program-cofres-page";
import { ProgramXpRulesPage } from "@/features/program/components/program-xp-rules-page";

const ADHERENCIA_VIEWS = [
  { value: "adherencia", label: "Adherencia", permission: "Program.View" },
  { value: "cofres", label: "Cofres", permission: "Program.View" },
  { value: "reglas-xp", label: "Reglas XP", permission: "Program.Edit" },
];

function getVisibleViews(can: (code: string) => boolean) {
  return ADHERENCIA_VIEWS.filter((v) => can(v.permission));
}

function getComponent(view: string) {
  switch (view) {
    case "cofres":
      return <ProgramCofresPage />;
    case "reglas-xp":
      return <ProgramXpRulesPage />;
    case "adherencia":
    default:
      return <ProgramAdherenciaPage />;
  }
}

export default function ProgramAdherenciaRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAppContext();

  const currentView = searchParams.get("view") ?? "adherencia";
  const visibleViews = getVisibleViews(can);
  const activeView =
    visibleViews.find((v) => v.value === currentView)?.value ??
    visibleViews[0]?.value ??
    "adherencia";

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
