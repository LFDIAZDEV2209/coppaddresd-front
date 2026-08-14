import { PatientFormPage } from "@/features/patients/components/patient-form-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientFormPage patientId={id} />;
}
