"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { AgentTypeVersion } from "../types";
import { formatDate } from "../services/agents-service";
import { useT } from "@/providers/i18n-provider";

interface VersionsTabProps {
  agentTypeId: string;
  versions: AgentTypeVersion[];
  activeVersionId: string | null;
  creating: boolean;
  activatingId: string | null;
  onActivate: (versionId: string) => Promise<void>;
}

export function VersionsTab({
  agentTypeId,
  versions,
  activeVersionId,
  creating,
  activatingId,
  onActivate,
}: VersionsTabProps) {
  const t = useT();
  const router = useRouter();
  const [viewing, setViewing] = useState<AgentTypeVersion | null>(null);
  /** Feedback tras crear en /agents/[id]/versions/new (query ?creado=1). */
  const [createdNotice, setCreatedNotice] = useState(false);

  useEffect(() => {
    if (!window.location.search.includes("creado=1")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feedback post-creación (flag de URL), intencional
    setCreatedNotice(true);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Layers className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t('Versiones de configuración')}</h3>
            <p className="text-[12px] text-muted-foreground">
              {t('Cada versión es inmutable: la activa se ejecuta en el runtime de IA.')}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => router.push(`/agents/${agentTypeId}/versions/new`)}>
          <Plus data-icon="inline-start" />
          {t('Nueva versión')}
        </Button>
      </div>

      {versions.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <Layers className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t('Sin versiones')}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('Crea la primera versión de configuración.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Versión')}</TableHead>
                <TableHead>{t('Estado')}</TableHead>
                <TableHead>{t('Notas')}</TableHead>
                <TableHead>{t('Creada')}</TableHead>
                <TableHead className="w-24 text-right">{t('Acciones')}</TableHead>
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
                        {t('Activa')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t('Inactiva')}</Badge>
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
                        aria-label={t('Ver configuración de v{version}', { version: String(version.versionNumber) })}
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
                          aria-label={t('Activar v{version}', { version: String(version.versionNumber) })}
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
                      {t('Creando versión...')}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {createdNotice && (
        <div
          className="flex items-start gap-2 rounded-xl border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-foreground"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{t('Versión creada correctamente.')}</span>
          <button
            type="button"
            onClick={() => setCreatedNotice(false)}
            className="text-xs font-medium underline-offset-2 hover:underline"
          >
            {t('Cerrar')}
          </button>
        </div>
      )}

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[92vh] min-w-[640px] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
            <DialogTitle className="text-base font-semibold">
              {t('Configuración de v{version}', { version: String(viewing?.versionNumber ?? '') })}
            </DialogTitle>
            <DialogDescription>
              {viewing?.notes ?? t('Sin notas')} · {t('Creada')} {viewing ? formatDate(viewing.createdAt) : ""}
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
