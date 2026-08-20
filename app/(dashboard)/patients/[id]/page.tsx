import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientDetailPage id={id} />;
}