import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { NutritionCyclesPreview } from "@/features/nutrition/exploration/nutrition-cycles-preview";

/** Laboratorio local: 404 fuera de Development y fuera del host loopback. */
export default async function NutritionCyclesPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const host = (await headers()).get("host")?.split(":")[0];
  if (host !== "localhost" && host !== "127.0.0.1") notFound();
  return <NutritionCyclesPreview />;
}
