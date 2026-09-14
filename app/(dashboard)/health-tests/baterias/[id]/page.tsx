import { BatteryDetailPage } from "@/features/health-tests/components/batteries/battery-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BatteryDetailPage batteryId={id} />;
}
