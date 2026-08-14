"use client";

import { useState } from "react";
import {
  Bot,
  ArrowLeft,
  Layers,
  BookOpen,
  Activity,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Eye,
  Play,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useAgentDetail } from "../hooks/use-agent-detail";
import { useAgentKnowledge } from "../hooks/use-agent-knowledge";
import { useAgentMonitoring } from "../hooks/use-agent-monitoring";
import { getAgentIcon, formatDate } from "../services/agents-service";
import { uploadInstructionsDocument } from "../services/upload-agent-document";
import { VersionsTab } from "./versions-tab";
import { KnowledgeTab } from "./knowledge-tab";
import { MonitoringTab } from "./monitoring-tab";
import { VersionFormDialog } from "./version-form-dialog";

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  Activo: "default",
  Inactivo: "destructive",
  Borrador: "secondary",
};

export function AgentDetailPage({ agentTypeId }: { agentTypeId: string }) {
  const router = useRouter();
  const detail = useAgentDetail(agentTypeId);
  const knowledge = useAgentKnowledge(agentTypeId, { includeGlobal: true });
  const monitoring = useAgentMonitoring(agentTypeId, 20);

  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  if (detail.loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (detail.error || !detail.agent) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert">
          {detail.error ?? "Agente no encontrado."}
        </p>
        <Button variant="outline" className="w-fit" onClick={() => router.push("/agents")}>
          <ArrowLeft data-icon="inline-start" />
          Volver a agentes
        </Button>
      </div>
    );
  }

  const { agent } = detail;
  const { icon: Icon, color, bg } = getAgentIcon(agent.iconKey);

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/agents")}
      >
        <ArrowLeft data-icon="inline-start" />
        Volver a agentes
      </Button>

      <PageHeader
        title={agent.name}
        description={agent.description ?? agent.specialty ?? "Tipo de agente"}
        icon={Bot}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[agent.status] ?? "secondary"}>
              {agent.status}
            </Badge>
            {agent.activeVersionNumber !== null && (
              <Badge variant="outline" className="gap-1 bg-white/10 text-white">
                <Layers className="size-3" />
                v{agent.activeVersionNumber}
              </Badge>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => router.push(`/agents/${agent.id}/playground`)}
            >
              <Play className="size-[15px]" />
              Probar agente
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => setVersionDialogOpen(true)}
            >
              <Plus className="size-[15px]" />
              Nueva versión
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:w-72">
          <div
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bg }}
          >
            <Icon className="size-8" style={{ color }} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Especialidad
            </span>
            <span className="text-sm font-medium">{agent.specialty ?? "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Versión activa
            </span>
            <span className="text-sm font-medium">
              {agent.activeVersionNumber !== null ? `v${agent.activeVersionNumber}` : "Sin versión"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Creado
            </span>
            <span className="text-sm text-muted-foreground">{formatDate(agent.createdAt)}</span>
          </div>
        </div>

        <Tabs defaultValue="versions" className="flex-1">
          <TabsList>
            <TabsTrigger value="versions">
              <Layers data-icon="inline-start" className="size-4" />
              Versiones
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <BookOpen data-icon="inline-start" className="size-4" />
              Conocimiento
            </TabsTrigger>
            <TabsTrigger value="monitoring">
              <Activity data-icon="inline-start" className="size-4" />
              Monitoreo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions">
            <VersionsTab
              versions={detail.versions}
              activeVersionId={agent.activeVersionId}
              creating={detail.creatingVersion}
              activatingId={detail.activatingVersionId}
              knowledgeBases={knowledge.bases}
              onActivate={detail.handleActivateVersion}
              onCreate={detail.handleCreateVersion}
              onUploadInstructions={(file) =>
                uploadInstructionsDocument(file, {
                  agentId: agent.id,
                  agentName: agent.name,
                  findAgentBase: () =>
                    knowledge.bases.find(
                      (base) => base.scope !== "Global" && base.agentTypeId === agent.id,
                    ) ?? null,
                  createAgentBase: knowledge.handleCreateBase,
                  registerDocument: knowledge.handleRegisterDocument,
                })
              }
            />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeTab
              knowledge={knowledge}
              agentTypeId={agent.id}
            />
          </TabsContent>

          <TabsContent value="monitoring">
            <MonitoringTab monitoring={monitoring} />
          </TabsContent>
        </Tabs>
      </div>

      <VersionFormDialog
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
        saving={detail.creatingVersion}
        knowledgeBases={knowledge.bases}
        onCreate={async (config, notes) => {
          await detail.handleCreateVersion(config, notes);
          setVersionDialogOpen(false);
        }}
        onUploadInstructions={(file) =>
          uploadInstructionsDocument(file, {
            agentId: agent.id,
            agentName: agent.name,
            findAgentBase: () =>
              knowledge.bases.find(
                (base) => base.scope !== "Global" && base.agentTypeId === agent.id,
              ) ?? null,
            createAgentBase: knowledge.handleCreateBase,
            registerDocument: knowledge.handleRegisterDocument,
          })
        }
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "Activo" ? "default" : status === "Inactivo" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

export function VersionRowActions({
  versionId,
  isActive,
  onActivate,
  onView,
  activating,
}: {
  versionId: string;
  isActive: boolean;
  onActivate: (versionId: string) => void;
  onView: () => void;
  activating: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" onClick={onView} aria-label="Ver configuración">
        <Eye className="size-4" />
      </Button>
      {!isActive && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onActivate(versionId)}
          disabled={activating}
          aria-label="Activar versión"
        >
          {activating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
        </Button>
      )}
    </div>
  );
}
