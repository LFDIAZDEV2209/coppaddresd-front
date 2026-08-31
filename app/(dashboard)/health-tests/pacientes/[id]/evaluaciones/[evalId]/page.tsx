import type { Metadata } from "next";
import { EvaluationDetailPage } from "@/features/health-tests/components/evaluations/evaluation-detail-page";

export const metadata: Metadata = {
  title: "Detalle de evaluación | Tests de salud",
};

export default async function EvaluationDetailRoute({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = await params;
  return <EvaluationDetailPage patientId={id} evaluationId={evalId} />;
}
