"use client";

import { AssignmentError } from "@/features/program/components/assignment-shared";

export default function Error({ reset }: { reset: () => void }) {
  return <div className="p-6"><AssignmentError retry={reset} /></div>;
}
