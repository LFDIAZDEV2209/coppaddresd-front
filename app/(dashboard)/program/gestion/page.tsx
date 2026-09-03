"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAppContext } from "@/providers/context-provider";
import { ProgramViewSwitcher } from "@/features/program/components/program-view-switcher";
import { ProgramTemplatesPage } from "@/features/program/components/program-templates-page";
import { ProgramContentPage } from "@/features/program/components/program-content-page";
import { ProgramPerfil360Page } from "@/features/program/components/program-perfil360-page";

const GESTION_VIEWS = [
  { value: "plantillas", label: "Plantillas", permission: "Program.View" },
  { value: "contenido", label: "Contenido", permission: "Program.Edit" },
  { value: "perfil-360", label: "Perfil 360", permission: "Program.View" },
];

function getVisibleViews(can: (code: string) => boolean) {
  return GESTION_VIEWS.filter((v) => can(v.permission));
}

function getComponent(view: string, patient?: string | null) {
  switch (view) {
    case "contenido":
      return <ProgramContentPage />;
    case "perfil-360":
      return <ProgramPerfil360Page initialPatientId={patient} />;
    case "plantillas":
    default:
      return <ProgramTemplatesPage />;
  }
}

export default function ProgramGestionRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useAppContext();

  const currentView = searchParams.get("view") ?? "plantillas";
  const patientParam = searchParams.get("patient");
  const visibleViews = getVisibleViews(can);
  const activeView =
    visibleViews.find((v) => v.value === currentView)?.value ??
    visibleViews[0]?.value ??
    "plantillas";

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
      {getComponent(activeView, patientParam)}
    </div>
  );
}
