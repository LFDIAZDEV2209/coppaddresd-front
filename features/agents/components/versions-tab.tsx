"use client";

import { useState } from "react";
import { Layers, CheckCircle2, LoaderCircle, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgentTypeVersion, KnowledgeBase } from "../types";
import { formatDate } from "../services/agents-service";
import { VersionFormDialog } from "./version-form-dialog";

interface VersionsTabProps {
  versions: AgentTypeVersion[];
  activeVersionId: string | null;
  creating: boolean;
  activatingId: string | null;
  knowledgeBases: KnowledgeBase[];
  onActivate: (versionId: string) => Promise<void>;
  onCreate: (config: string, notes?: string | null) => Promise<void>;
  onUploadInstructions: (
    file: File,
  ) => Promise<{ knowledgeBaseId: string; storageKey: string; fileName: string }>;
}

export function VersionsTab({
  versions,
  activeVersionId,
  creating,
  activatingId,
  knowledgeBases,
  onActivate,
  onCreate,
  onUploadInstructions,
}: VersionsTabProps) {
  const [viewing, setViewing] = useState<AgentTypeVersion | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Layers className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Versiones de configuración</h3>
            <p className="text-[12px] text-muted-foreground">
              Cada versión es inmutable: la activa se ejecuta en el runtime de IA.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus data-icon="inline-start" />
          Nueva versión
        </Button>
      </div>

      {versions.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin versiones</p>
          <p className="text-[12.5px] text-muted-foreground">
            Crea la primera versión de configuración.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>
                    <span className="font-mono text-[13px] font-semibold">
                      v{version.versionNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    {version.id === activeVersionId ? (
                      <Badge className="gap-1">
                        <CheckCircle2 className="size-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-[12.5px] text-muted-foreground">
                    {version.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">
                    {formatDate(version.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setViewing(version)}
                        aria-label={`Ver configuración de v${version.versionNumber}`}
                      >
                        <Eye className="size-4" />
                      </Button>
                      {version.id !== activeVersionId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => onActivate(version.id)}
                          disabled={activatingId === version.id}
                          aria-label={`Activar v${version.versionNumber}`}
                        >
                          {activatingId === version.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {creating && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Creando versión...
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <VersionFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        saving={creating}
        knowledgeBases={knowledgeBases}
        onCreate={async (config, notes) => {
          await onCreate(config, notes);
          setShowCreate(false);
        }}
        onUploadInstructions={onUploadInstructions}
      />

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[92vh] min-w-[640px] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
            <DialogTitle className="text-base font-semibold">
              Configuración de v{viewing?.versionNumber}
            </DialogTitle>
            <DialogDescription>
              {viewing?.notes ?? "Sin notas"} · Creada {viewing ? formatDate(viewing.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <pre className="max-h-96 overflow-auto rounded-xl bg-muted p-4 font-mono text-[12.5px] leading-relaxed">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(viewing?.config ?? "{}"), null, 2);
                } catch {
                  return viewing?.config ?? "";
                }
              })()}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function VersionsTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
