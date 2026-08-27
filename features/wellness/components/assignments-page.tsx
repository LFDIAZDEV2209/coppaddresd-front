"use client";

import { useState, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Dumbbell,
  Apple,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { useT } from "@/providers/i18n-provider";
import { useUnifiedAssignments } from "../hooks/use-unified-assignments";
import {
  ASSIGNMENT_STATUS_COLORS,
  FREQUENCY_LABELS,
} from "../services/assignments-service";
import { AssignmentFormDialog } from "./assignment-form";
import { AssignmentDetailDialog } from "./assignment-detail-dialog";
import type { UnifiedAssignment } from "../types";

export function AssignmentsPage() {
  const t = useT();
  const { items, loading, actionLoading, error, remove, retry } =
    useUnifiedAssignments();

  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<UnifiedAssignment | undefined>();
  const [deleting, setDeleting] = useState<UnifiedAssignment | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "routine" | "nutrition">(
    "all",
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (item.patientName ?? "").toLowerCase();
        const plan = (item.itemName ?? "").toLowerCase();
        if (!name.includes(q) && !plan.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter, typeFilter]);

  const statusColor = (status: string) =>
    ASSIGNMENT_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Asignaciones")}
        description={t("Rutinas de ejercicio y planes de alimentación asignados a pacientes")}
        icon={ClipboardList}
        actions={
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus data-icon="inline-start" />
            {t("Nueva asignación")}
          </Button>
        }
      />

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label={t("Filtros de asignaciones")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("Asignaciones")}</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length === 1
                ? t("1 asignación encontrada")
                : t("{count} asignaciones encontradas", { count: String(filtered.length) })}
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
            {t("Actualizar")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder={t("Buscar por paciente o nombre...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:max-w-xs"
          />
          <Select
            value={typeFilter}
            onValueChange={(v: string | null) =>
              setTypeFilter((v as typeof typeFilter) ?? "all")
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder={t("Tipo")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos")}</SelectItem>
              <SelectItem value="routine">{t("Rutinas")}</SelectItem>
              <SelectItem value="nutrition">{t("Planes")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder={t("Estado")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos")}</SelectItem>
              <SelectItem value="Active">{t("Activa")}</SelectItem>
              <SelectItem value="Paused">{t("Pausada")}</SelectItem>
              <SelectItem value="Completed">{t("Completada")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <AssignmentsSkeleton />
      ) : error ? (
        <AssignmentsErrorState message={error} onRetry={retry} />
      ) : filtered.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Tipo")}</TableHead>
                  <TableHead>{t("Paciente")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Nombre")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("Frecuencia")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">{t("Inicio")}</TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                  <TableHead className="text-right">{t("Acciones")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          item.type === "routine"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {item.type === "routine" ? (
                          <span className="flex items-center gap-1">
                            <Dumbbell className="size-3" />
                            {t("Rutina")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Apple className="size-3" />
                            {t("Plan")}
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {item.patientName ?? t("Sin nombre")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[280px]">
                      <span className="block truncate" title={item.itemName ?? undefined}>
                        {item.itemName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {item.frequency
                        ? (FREQUENCY_LABELS[item.frequency] ?? item.frequency)
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(item.startDate).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(item.status)}>
                        {item.status === "Active"
                          ? t("Activa")
                          : item.status === "Paused"
                            ? t("Pausada")
                            : t("Completada")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={t("Ver detalles")}
                          onClick={() => setDetails(item)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          title={t("Eliminar")}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <AssignmentsEmptyState onCreate={() => setFormOpen(true)} />
      )}

      {/* Dialogs */}
      <AssignmentFormDialog
        key={formOpen ? "new" : "form-closed"}
        open={formOpen}
        saving={actionLoading}
        onOpenChange={setFormOpen}
        onCreated={retry}
      />

      {/* Detalle */}
      <AssignmentDetailDialog
        key={details?.id ?? "detail-closed"}
        assignment={details ?? null}
        onClose={() => setDetails(undefined)}
      />

      {/* Eliminar */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar asignación?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará la asignación de "{itemName}" a "{patientName}". Esta acción no se puede deshacer.', { itemName: deleting?.itemName ?? "", patientName: deleting?.patientName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id, deleting.type);
                setDeleting(undefined);
              }}
            >
              {t("Eliminar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-componentes ---

function AssignmentsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="hidden h-4 w-32 md:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
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

function AssignmentsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        {t("No pudimos cargar las asignaciones")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}

function AssignmentsEmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <ClipboardList className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("No hay asignaciones")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Asigna una rutina de ejercicio o un plan de alimentación a un paciente.")}
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus data-icon="inline-start" />
        {t("Nueva asignación")}
      </Button>
    </div>
  );
}
