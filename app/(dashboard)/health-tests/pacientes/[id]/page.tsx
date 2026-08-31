import { PatientProfilePage } from "@/features/health-tests/components/patients/patient-profile-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientProfilePage patientId={id} />;
}
