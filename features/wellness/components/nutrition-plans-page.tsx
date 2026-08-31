"use client";

import { useState, useEffect } from "react";
import {
  Apple,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Pencil,
  Copy,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
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
import { useNutritionPlans } from "../hooks/use-nutrition-plans";
import {
  PLAN_STATUS_LABELS,
  TEMPLATE_OPTIONS,
} from "../services/nutrition-plans-service";
import { NutritionPlanFormDialog } from "./nutrition-plan-form";
import { NutritionPlanDetailDialog } from "./nutrition-plan-detail";
import type { NutritionPlanListItem } from "../types";

export function NutritionPlansPage() {
  const t = useT();
  const { can } = useAppContext();
  const {
    result,
    loading,
    actionLoading,
    filters,
    error,
    setFilters,
    setPage,
    setPageSize,
    getPlan,
    save,
    remove,
    retry,
  } = useNutritionPlans();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionPlanListItem | undefined>();
  const [details, setDetails] = useState<NutritionPlanListItem | undefined>();
  const [deleting, setDeleting] = useState<NutritionPlanListItem | undefined>();
  const [cloning, setCloning] = useState<NutritionPlanListItem | undefined>();
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  // Auto-ocultar la confirmación tras unos segundos
  useEffect(() => {
    if (!createdMessage) return;
    const timer = setTimeout(() => setCreatedMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [createdMessage]);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = async (plan: NutritionPlanListItem) => {
    const fullPlan = await getPlan(plan.id);
    if (fullPlan) {
      setEditing(fullPlan);
      setFormOpen(true);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Planes de alimentación")}
        description={t("Gestiona los planes nutricionales para tus pacientes")}
        icon={Apple}
        actions={
          can("Wellness.Manage") ? (
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              {t("Nuevo plan")}
            </Button>
          ) : undefined
        }
      />

      {/* Confirmación de creación asignada */}
      {createdMessage && (
        <p
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {createdMessage}
        </p>
      )}

      {/* Filtros */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label={t("Filtros de planes")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t("Planes de alimentación")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("Filtra por tipo, estado o busca por nombre.")}
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
            placeholder={t("Buscar por nombre...")}
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="h-9 w-full sm:max-w-xs"
          />
          <Select
            value={filters.isTemplate}
            onValueChange={(v) =>
              setFilters({ isTemplate: v as typeof filters.isTemplate })
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder={t("Tipo")} />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) =>
              setFilters({ status: v as typeof filters.status })
            }
          >
            <SelectTrigger className="h-9 w-full sm:w-[160px]">
              <SelectValue placeholder={t("Estado")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos")}</SelectItem>
              <SelectItem value="Draft">{t("Borrador")}</SelectItem>
              <SelectItem value="Active">{t("Activo")}</SelectItem>
              <SelectItem value="Completed">{t("Completado")}</SelectItem>
              <SelectItem value="Archived">{t("Archivado")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <PlansSkeleton />
      ) : error ? (
        <PlansErrorState message={error} onRetry={retry} />
      ) : result && result.data.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("{count} planes disponibles", { count: String(result.total) })}
            description={t("Vista de tabla")}
            icon={Apple}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Nombre")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Paciente")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Tipo")}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t("Duración")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    {t("Calorías/día")}
                  </TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("Creado")}</TableHead>
                  <TableHead className="text-right">{t("Acciones")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex max-w-[280px] flex-col">
                        <span
                          className="truncate font-medium"
                          title={plan.name}
                        >
                          {plan.name}
                        </span>
                        {plan.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {plan.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {plan.patientName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {plan.isTemplate ? "Template" : t("Personalizado")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {t("{days} días", { days: String(plan.durationDays) })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {plan.dailyCalorieTarget
                        ? `${plan.dailyCalorieTarget} kcal`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(plan.status)}>
                        {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(plan.createdAt).toLocaleDateString("es-CO")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={t("Ver detalles")}
                          onClick={() => setDetails(plan)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {can("Wellness.Manage") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title={t("Editar")}
                            onClick={() => openEdit(plan)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {plan.isTemplate && can("Wellness.Manage") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title={t("Clonar a paciente")}
                            onClick={() => setCloning(plan)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        )}
                        {can("Wellness.Manage") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            title={t("Eliminar")}
                            onClick={() => setDeleting(plan)}
                          >
                            <Trash2 className="size-4" />
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
        <PlansEmptyState onCreate={openCreate} />
      )}

      {/* Paginación */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("Página {page} de {total}", { page: String(result.page), total: String(result.totalPages) })}
          </span>
          <div className="flex items-center gap-3">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={result.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t("Planes por página")}
            >
              <option value={10}>{t("10 por página")}</option>
              <option value={20}>{t("20 por página")}</option>
              <option value={50}>{t("50 por página")}</option>
            </select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === 1}
                onClick={() => setPage(result.page - 1)}
              >
                {t("Anterior")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page === result.totalPages}
                onClick={() => setPage(result.page + 1)}
              >
                {t("Siguiente")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <NutritionPlanFormDialog
        key={`${editing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        plan={editing}
        saving={actionLoading}
        onOpenChange={setFormOpen}
        onSubmit={save}
        onCreated={(patientName) =>
          setCreatedMessage(t("Plan creado y asignado a {patientName}", { patientName }))
        }
      />

      <NutritionPlanDetailDialog
        key={details?.id ?? "closed"}
        planId={details?.id ?? null}
        onClose={() => setDetails(undefined)}
        getPlan={getPlan}
      />

      {/* Confirmar clonación */}
      <ClonePlanDialog
        plan={cloning}
        onClose={() => setCloning(undefined)}
        onConfirm={async (patientId) => {
          if (!cloning) return;
          const { cloneNutritionPlan } =
            await import("../services/nutrition-plans-service");
          await cloneNutritionPlan(cloning.id, patientId);
          setCloning(undefined);
          retry();
        }}
      />

      {/* Confirmar eliminación */}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("¿Eliminar plan?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará el plan "{name}" y todos sus días. Esta acción no se puede deshacer.', { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
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

function PlansSkeleton() {
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
          <Skeleton className="hidden h-4 w-20 lg:block" />
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

function PlansErrorState({
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
        {t("No pudimos cargar los planes")}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t("Reintentar")}
      </Button>
    </div>
  );
}

function PlansEmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();
  const { can } = useAppContext();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Apple className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("No hay planes de alimentación")}</p>
        <p className="text-xs text-muted-foreground">
          {t("Crea tu primer plan nutricional para asignarlo a tus pacientes.")}
        </p>
      </div>
      {can("Wellness.Manage") && (
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          {t("Nuevo plan")}
        </Button>
      )}
    </div>
  );
}

function ClonePlanDialog({
  plan,
  onClose,
  onConfirm,
}: {
  plan: NutritionPlanListItem | undefined;
  onClose: () => void;
  onConfirm: (patientId: string) => Promise<void>;
}) {
  const t = useT();
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    }>
  >([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const searchPatients = async (query: string) => {
    if (query.trim().length < 2) {
      setPatients([]);
      return;
    }
    setLoadingPatients(true);
    try {
      const { fetchPatientsForPicker } =
        await import("../services/nutrition-plans-service");
      const result = await fetchPatientsForPicker(1, 10, query);
      setPatients(result.data);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  if (!plan) return null;

  return (
    <AlertDialog
      open={Boolean(plan)}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Clonar plan a paciente")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('Se creará una copia del plan "{name}" asignada al paciente seleccionado. El plan original no se modifica.', { name: plan.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Input
            placeholder={t("Buscar paciente por nombre...")}
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              searchPatients(e.target.value);
            }}
          />
          {loadingPatients && (
            <p className="text-xs text-muted-foreground">{t("Buscando...")}</p>
          )}
          {patients.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border border-border">
              {patients.map((p) => (
                <button
                  key={p.id}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                    selectedPatient === p.id ? "bg-muted font-medium" : ""
                  }`}
                  onClick={() => setSelectedPatient(p.id)}
                >
                  <span>
                    {p.firstName} {p.lastName}
                  </span>
                  {p.email && (
                    <span className="text-xs text-muted-foreground">
                      {p.email}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {patientSearch.length >= 2 &&
            !loadingPatients &&
            patients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("No se encontraron pacientes.")}
              </p>
            )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!selectedPatient}
            onClick={async () => {
              if (selectedPatient) await onConfirm(selectedPatient);
            }}
          >
            {t("Clonar plan")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
