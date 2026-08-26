"use client";

import { useState } from "react";
import { Bot, Plus, Search, Pencil, Trash2, Layers, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useAgents } from "../hooks/use-agents";
import { AgentFormDialog } from "./agent-form-dialog";
import { getAgentIcon, formatDate } from "../services/agents-service";
import type { AgentType } from "../types";

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  Activo: "default",
  Inactivo: "destructive",
  Borrador: "secondary",
};

export function AgentsPageContent() {
  const t = useT();
  const router = useRouter();
  const {
    agents,
    total,
    loading,
    error,
    page,
    pageSize,
    search,
    setSearch,
    setPage,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useAgents();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgentType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AgentType | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (agent: AgentType) => {
    setEditing(agent);
    setFormOpen(true);
  };

  const submit = async (input: Parameters<typeof handleCreate>[0]) => {
    setSaving(true);
    try {
      if (editing) await handleUpdate(editing.id, input);
      else await handleCreate(input);
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await handleDelete(deleting.id);
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('Agentes AI')}
        description={t('Gestión de tipos de agente, versiones, conocimiento y monitoreo')}
        icon={Bot}
        actions={
          <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong" onClick={openCreate}>
            <Plus className="size-[15px]" />
            {t('Nuevo agente')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[280px]">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Buscar agentes...')}
            className="h-9 pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="text-[12px] text-muted-foreground">
          {t('{count} tipo(s)', { count: String(total) })}
        </span>
      </div>

      {error && (
        <p
          className="rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-xl" />
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Bot className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('No hay agentes')}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('Crea el primer tipo de agente para comenzar.')}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            {t('Nuevo agente')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onOpen={() => router.push(`/agents/${agent.id}`)}
                onEdit={() => openEdit(agent)}
                onDelete={() => setDeleting(agent)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text={t('Anterior')}
                    isActive={false}
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i + 1 === page}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text={t('Siguiente')}
                    isActive={false}
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <AgentFormDialog
        open={formOpen}
        agent={editing ?? undefined}
        saving={saving}
        onOpenChange={setFormOpen}
        onSubmit={submit}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Eliminar tipo de agente')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('¿Seguro que querés eliminar "{name}"? Esta acción no se puede deshacer.', { name: deleting?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>{t('Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deletingBusy}
            >
              {deletingBusy ? t('Eliminando...') : t('Eliminar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgentCard({
  agent,
  onOpen,
  onEdit,
  onDelete,
}: {
  agent: AgentType;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const { icon: Icon, color, bg } = getAgentIcon(agent.iconKey);

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg hover:shadow-black/5">
      <button
        onClick={onOpen}
        className="flex items-center gap-3 text-left"
        aria-label={t('Abrir detalle de {name}', { name: agent.name })}
      >
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: bg }}
        >
          <Icon className="size-5" style={{ color }} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-px overflow-hidden">
          <span className="truncate text-[13px] font-semibold text-foreground">
            {agent.name}
          </span>
          <span className="truncate text-[11.5px] text-muted-foreground">
            {agent.description ?? t('Sin descripción')}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[agent.status] ?? "secondary"}>{agent.status}</Badge>
        {agent.activeVersionNumber !== null && (
          <Badge variant="outline" className="gap-1">
            <Layers className="size-3" />
            v{agent.activeVersionNumber}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={onOpen}
          className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          {t('Ver detalle')}
          <ChevronRight className="size-3.5" />
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={t('Editar {name}', { name: agent.name })}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label={t('Eliminar {name}', { name: agent.name })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <p className="text-[10.5px] text-muted-foreground">
        {t('Creado')} {formatDate(agent.createdAt)}
      </p>
    </div>
  );
}
