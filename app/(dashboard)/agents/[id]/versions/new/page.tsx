import { AgentVersionNewPage } from "@/features/agents/components/version-new-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentVersionNewPage agentTypeId={id} />;
}
