import { AssignmentNewPage } from "@/features/wellness/components/assignment-new-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ routineId?: string | string[] }> }) {
  const { routineId } = await searchParams;
  return <AssignmentNewPage key={typeof routineId === "string" ? routineId : "new"} routineId={typeof routineId === "string" ? routineId : undefined} />;
}
