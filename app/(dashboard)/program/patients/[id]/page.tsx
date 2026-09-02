import { ProgramPatientOverviewPage } from "@/features/program/components/program-patient-overview-page";

export default async function ProgramPatientOverviewRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProgramPatientOverviewPage patientId={id} />;
}
