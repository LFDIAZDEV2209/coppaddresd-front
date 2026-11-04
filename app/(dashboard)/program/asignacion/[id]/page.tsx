import { ProgramAssignmentDetail } from "@/features/program/components/program-assignment-detail";

export default async function ProgramAssignmentRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProgramAssignmentDetail key={id} id={id} />;
}
