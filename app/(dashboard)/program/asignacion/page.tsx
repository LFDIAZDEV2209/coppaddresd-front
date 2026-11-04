import { ProgramAssignmentQueue } from "@/features/program/components/program-assignment-queue";

// El JWT vive en memoria del navegador: la isla cliente consulta la API autenticada.
export default function ProgramAssignmentsRoute() {
  return <ProgramAssignmentQueue />;
}
