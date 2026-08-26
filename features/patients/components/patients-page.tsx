"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  UserRoundPlus,
  Eye,
  CalendarPlus,
  ClipboardPenLine,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePatients } from "../hooks/use-patients";
import type { PatientListItem } from "../types";
import { useT } from "@/providers/i18n-provider";

export function PatientsPage() {
  const t = useT();
  const router = useRouter();
  const {
    result,
    filters,
    insurers,
    loading,
    error,
    actionLoading,
    setFilters,
    setPage,
    remove,
    retry,
  } = usePatients();
  const [deleting, setDeleting] = useState<PatientListItem | undefined>();

  const openCreate = () => router.push("/patients/new");
  const openDetail = (patient: PatientListItem) =>
    router.push(`/patients/${patient.id}`);
  const openEdit = (patient: PatientListItem) =>
    router.push(`/patients/${patient.id}/edit`);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t('Pacientes')}
        description={t('Gestiona la información y el seguimiento de tus pacientes')}
        icon={UserRound}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            {t('Nuevo paciente')}
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary
          label={t('Pacientes activos')}
          value={result ? String(result.total) : "—"}
          tone="primary"
        />
        <Summary label={t('Citas esta semana')} value="24" tone="success" />
        <Summary label={t('Pendientes de completar')} value="3" tone="warning" />
      </div>
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label={t('Filtros de pacientes')}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t('Directorio de pacientes')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('Busca por nombre, documento o correo electrónico.')}
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
            {t('Actualizar')}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={filters.search}
              onChange={(event) => setFilters({ search: event.target.value })}
              placeholder={t('Buscar paciente...')}
              aria-label={t('Buscar pacientes')}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.status}
            onChange={(event) =>
              setFilters({
                status: event.target.value as typeof filters.status,
              })
            }
            aria-label={t('Filtrar por estado')}
          >
            <option value="all">{t('Todos los estados')}</option>
            <option>{t('Activo')}</option>
            <option>{t('Pendiente')}</option>
            <option>{t('Inactivo')}</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filters.insurerId}
            onChange={(event) => setFilters({ insurerId: event.target.value })}
            aria-label={t('Filtrar por aseguradora')}
          >
            <option value="all">{t('Todas las aseguradoras')}</option>
            {insurers.map((insurer) => (
              <option key={insurer.id} value={insurer.id}>
                {insurer.name}
              </option>
            ))}
          </select>
        </div>
      </section>
      {loading ? (
        <PatientsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : result?.data.length ? (
        <PatientTable
          patients={result.data}
          onOpen={openDetail}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      ) : (
        <EmptyState onCreate={openCreate} />
      )}
      {result && result.total > 0 && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onPageChange={setPage}
        />
      )}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('¿Eliminar paciente?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Se eliminará el registro de')} {deleting?.firstName}{" "}
              {deleting?.lastName}. {t('Esta acción no se puede deshacer.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={actionLoading}
              onClick={async () => {
                if (deleting) await remove(deleting.id);
                setDeleting(undefined);
              }}
            >
              {t('Eliminar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PatientTable({
  patients,
  onOpen,
  onEdit,
  onDelete,
}: {
  patients: PatientListItem[];
  onOpen: (patient: PatientListItem) => void;
  onEdit: (patient: PatientListItem) => void;
  onDelete: (patient: PatientListItem) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={`${patients.length} ${t('pacientes visibles')}`}
        description={t('Directorio clínico')}
        icon={UserRound}
        variant="primary"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Paciente')}</TableHead>
            <TableHead>{t('Documento')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('Contacto')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('Aseguradora')}</TableHead>
            <TableHead className="hidden xl:table-cell">{t('Clínica')}</TableHead>
            <TableHead>{t('Estado')}</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">{t('Acciones')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onOpen(patient)}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {patient.gender ?? t("Sin género")} ·{" "}
                      {getAge(patient.dateOfBirth)} {t('años')}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">
                  {patient.documentNumber ?? patient.medicalRecordNumber ?? "—"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {patient.documentTypeName ?? "MRN"}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="block text-sm">{formatPhone(patient) ?? "—"}</span>
                <span className="block max-w-44 truncate text-xs text-muted-foreground">
                  {patient.email ?? "—"}
                </span>
              </TableCell>
              <TableCell className="hidden text-sm md:table-cell">
                {patient.insurerName ?? t("Sin aseguradora")}
              </TableCell>
              <TableCell className="hidden text-sm xl:table-cell">
                {patient.clinicName ?? t("Sin asignar")}
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={patient.status}
                  color={statusColor(patient.status)}
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t('Acciones de')} ${patient.firstName} ${patient.lastName}`}
                      />
                    }
                  >
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpen(patient)}>
                      <Eye />
                      {t('Ver detalles')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(patient)}>
                      <Pencil />
                      {t('Editar')}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CalendarPlus />
                      {t('Agendar cita')}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ClipboardPenLine />
                      {t('Crear receta')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(patient)}
                    >
                      <Trash2 />
                      {t('Eliminar')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
}) {
  const colors = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success-foreground",
    warning: "bg-warning-soft text-warning-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}
        >
          <UserRoundPlus className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
function PatientsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
          key={index}
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <UserRound className="size-6" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">{t('No encontramos pacientes')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('Prueba con otros filtros o registra un nuevo paciente.')}
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus data-icon="inline-start" />
        {t('Nuevo paciente')}
      </Button>
    </div>
  );
}
function ErrorState({
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
        {t('No pudimos cargar el directorio')}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        {t('Reintentar')}
      </Button>
    </div>
  );
}
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {t('Página')} {page} {t('de')} {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('Anterior')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('Siguiente')}
        </Button>
      </div>
    </div>
  );
}
function getAge(date: string | null) {
  if (!date) return "—";
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()))
    age -= 1;
  return Math.max(0, age);
}
function formatPhone(patient: PatientListItem): string | null {
  if (!patient.phoneNumber) return null;
  return patient.phoneCountryCode
    ? `+${patient.phoneCountryCode} ${patient.phoneNumber}`
    : patient.phoneNumber;
}
function statusColor(status: PatientListItem["status"]) {
  const colors = {
    Activo: {
      bg: "var(--success-soft)",
      text: "var(--success-foreground)",
      dot: "var(--success-foreground)",
    },
    Pendiente: {
      bg: "var(--warning-soft)",
      text: "var(--warning-foreground)",
      dot: "var(--warning)",
    },
    Inactivo: {
      bg: "var(--destructive-soft)",
      text: "var(--destructive)",
      dot: "var(--destructive)",
    },
  };
  return colors[status];
}