import { AgentDetailPage } from "@/features/agents/components/agent-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentDetailPage agentTypeId={id} />;
}
