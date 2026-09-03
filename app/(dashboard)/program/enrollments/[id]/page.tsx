import { EnrollmentDetailPage } from "@/features/program/components/enrollment-detail/enrollment-detail-page";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Ruta del panel del paciente (TASK-02). En Next.js 16 los `params` de una
 * página dinámica son una Promise: se resuelven antes de renderizar. No se
 * necesita un layout propio porque aplica el layout de `(dashboard)`.
 */
export default async function ProgramEnrollmentDetailRoute({ params }: Props) {
  const { id } = await params;
  return <EnrollmentDetailPage enrollmentId={id} />;
}