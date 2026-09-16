import { AgendaWorkspace } from "@/features/appointments/components/agenda-workspace";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  return <AgendaWorkspace initialDate={fecha ?? null} />;
}
