import { NutritionPatientDetail } from "@/features/nutrition/components/nutrition-patient-detail";

export default async function NutritionPatientPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ prescriptionId?: string | string[] }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  return <NutritionPatientDetail patientId={patientId} prescriptionId={typeof query.prescriptionId === "string" ? query.prescriptionId : undefined} />;
}
