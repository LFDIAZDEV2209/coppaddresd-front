import { AgendaRouter } from "@/features/appointments/components/agenda-router";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  return <AgendaRouter initialDate={fecha ?? null} />;
}
