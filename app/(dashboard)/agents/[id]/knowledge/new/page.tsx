import { AgentKnowledgeBaseNewPage } from "@/features/agents/components/agent-knowledge-base-new-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentKnowledgeBaseNewPage agentTypeId={id} />;
}
