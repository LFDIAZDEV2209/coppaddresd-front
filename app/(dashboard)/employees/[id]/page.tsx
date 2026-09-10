import { ProfessionalDetail } from "@/features/professionals/components/professional-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfessionalDetail id={id} />;
}
