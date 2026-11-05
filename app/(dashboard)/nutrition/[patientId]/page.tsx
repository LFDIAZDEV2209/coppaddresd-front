import { NutritionQueue } from "@/features/nutrition/components/nutrition-queue";

export default async function NutritionPatientPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ prescriptionId?: string | string[] }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  return <NutritionQueue initialPatientId={patientId} initialPrescriptionId={typeof query.prescriptionId === "string" ? query.prescriptionId : undefined} />;
}
