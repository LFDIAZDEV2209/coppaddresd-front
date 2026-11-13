import { redirect } from "next/navigation";
import { ProgramTemplatesPage } from "@/features/program/components/program-templates-page";

export default async function ProgramGestionRoute({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; patient?: string }>;
}) {
  const { view, patient } = await searchParams;

  if (view === "perfil-360") {
    redirect(patient ? `/patients/${encodeURIComponent(patient)}/360` : "/patients");
  }
  if (view === "contenido") {
    redirect("/program/gestion?view=plantillas");
  }

  return <ProgramTemplatesPage />;
}
