"use client";

import { useState } from "react";
import {
  Trophy,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Send,
  Archive,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramTemplates } from "../hooks/use-program-templates";
import {
  TEMPLATE_STATUS_LABELS,
  STATUS_OPTIONS,
} from "../services/program-templates-service";
import { ProgramTemplateFormDialog } from "./program-template-form";
import { ProgramTemplateDetailDialog } from "./program-template-detail";
import type { ProgramTemplateListItem } from "../types";

export function ProgramTemplatesPage() {
  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    getTemplate,
    save,
    publish,
    archive,
    saveWeekdayTasks,
    retry,
  } = useProgramTemplates();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramTemplateListItem | undefined>();
  const [details, setDetails] = useState<ProgramTemplateListItem | undefined>();
  const [publishing, setPublishing] = useState<ProgramTemplateListItem | undefined>();
  const [archiving, setArchiving] = useState<ProgramTemplateListItem | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = async (tpl: ProgramTemplateListItem) => {
    const full = await getTemplate(tpl.id);
    if (full) {
      setEditing(full);
      setFormOpen(true);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-success-soft text-success-foreground";
      case "Draft":
        return "bg-warning-soft text-warning";
      case "Archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Plantillas de programa"
        description="Gestiona las plantillas del programa de gamificación"
        icon={Trophy}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Nueva plantilla
          </Button>
        }
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Filtros de plantillas"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Plantillas de programa</h2>
            <p className="text-xs text-muted-foreground">
              Filtra por estado o busca por nombre/código.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por nombre o código..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 w-full sm:max-w-xs"
          />
          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters({ status: v as typeof filters.status })
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <TemplatesSkeleton />
      ) : error ? (
        <TemplatesErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${result.total} ${result.total === 1 ? "plantilla" : "plantillas"} disponibles`}
            description="Vista de tabla"
            icon={Trophy}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Código
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Duración
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Versión
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div className="flex max-w-[280px] flex-col">
                        <span
                          className="truncate font-medium"
                          title={tpl.name}
                        >
                          {tpl.name}
                        </span>
                        {tpl.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {tpl.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-mono">
                      {tpl.code}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      <span className="font-medium text-foreground">
                        {tpl.totalWeeks} {tpl.totalWeeks === 1 ? "semana" : "semanas"}
                      </span>
                      <span className="block text-muted-foreground">
                        ({tpl.totalWeeks * 7} días)
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      v{tpl.version}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(tpl.status)}>
                        {TEMPLATE_STATUS_LABELS[tpl.status] ?? tpl.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(tpl.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Ver detalles"
                          onClick={() => setDetails(tpl)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Editar"
                          onClick={() => openEdit(tpl)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {tpl.status === "Draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-success"
                            title="Publicar"
                            onClick={() => setPublishing(tpl)}
                          >
                            <Send className="size-4" />
                          </Button>
                        )}
                        {tpl.status === "Active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            title="Archivar"
                            onClick={() => setArchiving(tpl)}
                          >
                            <Archive className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <TemplatesEmptyState onCreate={openCreate} />
      )}

      {/* Paginación */}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          <span>
            Página {result.page} de {result.totalPages}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Plantillas por página"
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ProgramTemplateFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        template={editing}
        saving={actionLoading}
        onOpenChange={setFormOpen}
        onSubmit={save}
      />

      <ProgramTemplateDetailDialog
        key={details?.id ?? "closed"}
        templateId={details?.id ?? null}
        onClose={() => setDetails(undefined)}
        getTemplate={getTemplate}
        saveWeekdayTasks={saveWeekdayTasks}
      />

      {/* Confirmar publicación */}
      <AlertDialog
        open={Boolean(publishing)}
        onOpenChange={(open) => !open && setPublishing(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-success-soft text-success">
            <Send />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Publicar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se publicará la plantilla &quot;{publishing?.name}&quot; y se
              incrementará su versión. Los pacientes podrán inscribirse con esta
              plantilla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-success hover:bg-success/90"
              disabled={actionLoading}
              onClick={async () => {
                if (publishing) await publish(publishing.id);
                setPublishing(undefined);
              }}
            >
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar archivado */}
      <AlertDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-muted text-muted-foreground">
            <Archive />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Se archivará la plantilla &quot;{archiving?.name}&quot;. No se
              podrá usar para nuevas inscripciones, pero las inscripciones
              existentes continuarán activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={async () => {
                if (archiving) await archive(archiving.id);
                setArchiving(undefined);
              }}
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function TemplatesSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-5 w-20 md:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="size-8 rounded" />
            <Skeleton className="size-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las plantillas
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function TemplatesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Trophy className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">No hay plantillas de programa</p>
        <p className="text-xs text-muted-foreground">
          Crea tu primera plantilla para definir el programa de gamificación.
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus data-icon="inline-start" />
        Nueva plantilla
      </Button>
    </div>
  );
}
