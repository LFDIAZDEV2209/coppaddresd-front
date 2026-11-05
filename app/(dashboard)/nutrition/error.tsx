"use client";

import { NutritionError } from "@/features/nutrition/components/nutrition-feedback";

export default function Error({ retry }: { retry: () => void }) {
  return <div className="p-6"><NutritionError retry={retry} /></div>;
}
