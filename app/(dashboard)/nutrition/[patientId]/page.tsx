import { NutritionPatientDetail } from "@/features/nutrition/components/nutrition-patient-detail";

export default async function NutritionPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <NutritionPatientDetail patientId={patientId} />;
}
