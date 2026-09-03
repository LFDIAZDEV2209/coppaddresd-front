"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Search,
  ArrowLeft,
  ArrowRight,
  User,
  X,
  UserCheck,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import { useProgramContent } from "../hooks/use-program-content";
import { fetchProgramEnrollments } from "../services/program-enrollments-service";
import { PagedListFooter } from "./paged-list-footer";
import {
  fetchRoutinesForPicker,
  fetchNutritionPlansForPicker,
} from "@/features/wellness/services/assignments-service";
import {
  ContentTable,
  ContentSkeleton,
  ContentErrorState,
} from "./program-content-table";
import type { ProgramEnrollment, EnrollmentStatus } from "../types";
import type {
  ExerciseRoutineListItem,
  NutritionPlanListItem,
} from "@/features/wellness/types";

export function ProgramContentPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const { content, loading, error, selectEnrollment, saveWeek, retry, clear } =
    useProgramContent();

  // Estado del listado inicial de pacientes inscritos
  const [enrollmentsList, setEnrollmentsList] = useState<ProgramEnrollment[]>(
    [],
  );
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>(
    "Active",
  );

  // Estado de paciente seleccionado para ver su programa
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<ProgramEnrollment | null>(null);

  // Catálogo completo de rutinas y planes para los Selects de la semana
  const [availableRoutines, setAvailableRoutines] = useState<
    ExerciseRoutineListItem[]
  >([]);
  const [availablePlans, setAvailablePlans] = useState<NutritionPlanListItem[]>(
    [],
  );
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [enrollPage, setEnrollPage] = useState(1);
  const [enrollPageSize, setEnrollPageSize] = useState(5);

  // Cargar primeros 10 pacientes inscritos al buscar o filtrar
  const loadInitialPatients = useCallback(
    async (search: string, status: "all" | EnrollmentStatus) => {
      setLoadingEnrollments(true);
      try {
        const res = await fetchProgramEnrollments(1, 10, {
          status,
          patientId: "",
          search: search.trim(),
        });
        setEnrollmentsList(res.data);
      } catch {
        setEnrollmentsList([]);
      } finally {
        setLoadingEnrollments(false);
      }
    },
    [],
  );

  // Debounce para el input de búsqueda por nombre / documento
  useEffect(() => {
    const timer = setTimeout(() => {
      setEnrollPage(1);
      loadInitialPatients(searchQuery, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, loadInitialPatients]);

  const enrollTotalPages = Math.max(1, Math.ceil(enrollmentsList.length / enrollPageSize));
  const enrollSafePage = Math.min(enrollPage, enrollTotalPages);
  const pageEnrollments = enrollmentsList.slice((enrollSafePage - 1) * enrollPageSize, enrollSafePage * enrollPageSize);

  // Manejar selección de un paciente de la tabla
  const handleSelectPatient = useCallback(
    async (enrollment: ProgramEnrollment) => {
      setSelectedEnrollment(enrollment);
      setLoadingCatalog(true);
      try {
        await selectEnrollment(enrollment.id);
        const [routinesRes, plansRes] = await Promise.all([
          fetchRoutinesForPicker(1, 100, ""),
          fetchNutritionPlansForPicker(
            1,
            100,
            "",
            undefined,
            undefined,
            enrollment.patientId,
          ),
        ]);
        setAvailableRoutines(routinesRes.data);
        setAvailablePlans(plansRes.data);
      } catch {
        // Ignorar errores silenciosos de catálogo
      } finally {
        setLoadingCatalog(false);
      }
    },
    [selectEnrollment],
  );

  const handleBackToList = useCallback(() => {
    setSelectedEnrollment(null);
    clear();
  }, [clear]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <CalendarDays className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Acceso restringido</p>
          <p className="text-xs text-muted-foreground">
            No tienes permiso para gestionar el contenido del programa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Contenido del programa"
        description="Configura el plan nutricional y la rutina de ejercicio de cada semana para una inscripción de paciente"
        icon={CalendarDays}
      />

      {/* Aviso de migración: la gestión de contenido vive en Perfil 360 */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <p>
          Esta página se conserva por compatibilidad. La gestión de contenido
          ahora se realiza desde{" "}
          <Link
            href="/program/gestion?view=perfil-360"
            className="font-semibold underline underline-offset-2 hover:text-blue-950"
          >
            Perfil 360
          </Link>
          , dentro de la pestaña Contenido semanal de cada paciente.
        </p>
      </div>

      {/* VISTA 1: Buscador e inicio con los primeros 10 pacientes inscritos */}
      {!selectedEnrollment ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Pacientes inscritos en programas
              </h2>
              <p className="text-xs text-muted-foreground">
                Busca por nombre o número de documento para gestionar el
                contenido de su programa.
              </p>
            </div>

            {/* Input de búsqueda por nombre o documento */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-card"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Select
                value={statusFilter}
                onValueChange={(val) =>
                  setStatusFilter(val as "all" | EnrollmentStatus)
                }
              >
                <SelectTrigger className="h-9 w-36 text-xs bg-card">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active" className="text-xs">
                    Activos
                  </SelectItem>
                  <SelectItem value="Paused" className="text-xs">
                    Pausados
                  </SelectItem>
                  <SelectItem value="Completed" className="text-xs">
                    Completados
                  </SelectItem>
                  <SelectItem value="all" className="text-xs">
                    Todos
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla de los primeros 10 pacientes inscritos */}
          {loadingEnrollments ? (
            <div className="flex flex-col gap-2 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : enrollmentsList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center border border-dashed border-border rounded-xl">
              <User className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">
                No se encontraron pacientes inscritos
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Intenta con otro término de búsqueda (nombre o documento)."
                  : "No hay inscripciones activas registradas en este momento."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="text-white font-semibold">Paciente</TableHead>
                    <TableHead className="text-white font-semibold">Programa</TableHead>
                    <TableHead className="text-white font-semibold">Progreso semanal</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-right text-white font-semibold">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageEnrollments.map((enrollment) => {
                    const patientName =
                      enrollment.patientFullName ||
                      `Paciente (${enrollment.patientId.substring(0, 8)})`;
                    const templateName =
                      enrollment.templateName || "Programa de Salud";

                    return (
                      <TableRow
                        key={enrollment.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectPatient(enrollment)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {patientName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-foreground">
                                {patientName}
                              </span>
                              {enrollment.patientDocumentNumber && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Doc: {enrollment.patientDocumentNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {templateName}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20 text-xs"
                          >
                            Semana {enrollment.currentWeekNumber} de{" "}
                            {enrollment.totalWeeks}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              enrollment.status === "Active"
                                ? "default"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {enrollment.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPatient(enrollment);
                            }}
                            className="gap-1 text-xs shadow-2xs"
                          >
                            <span>Gestionar contenido</span>
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <PagedListFooter
              page={enrollSafePage}
              totalPages={enrollTotalPages}
              onPageChange={setEnrollPage}
              pageSize={enrollPageSize}
              onPageSizeChange={(s) => { setEnrollPageSize(s); setEnrollPage(1); }}
            />
          </>
          )}
        </section>
      ) : (
        /* VISTA 2: Matriz de contenido del paciente seleccionado */
        <div className="flex flex-col gap-4">
          {/* Header con botón de retorno e info del paciente */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToList}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="size-4" />
                Volver a la lista de pacientes
              </Button>

              <div className="h-6 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success font-bold text-sm">
                  <UserCheck className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    {selectedEnrollment.patientFullName ||
                      `Paciente (${selectedEnrollment.patientId.substring(0, 8)})`}
                    {selectedEnrollment.patientDocumentNumber && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground font-mono font-normal">
                        Doc: {selectedEnrollment.patientDocumentNumber}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedEnrollment.templateName || "Programa"} · Semana{" "}
                    {selectedEnrollment.currentWeekNumber} de{" "}
                    {selectedEnrollment.totalWeeks}
                  </span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="text-xs">
              Inscripción {selectedEnrollment.id.substring(0, 8)}
            </Badge>
          </div>

          {/* Estado de carga / error / tabla de semanas */}
          {loading ? (
            <ContentSkeleton />
          ) : error ? (
            <ContentErrorState message={error} onRetry={handleRetry} />
          ) : content ? (
            <ContentTable
              content={content}
              canEdit={canEdit}
              onSaveWeek={saveWeek}
              enrollmentId={selectedEnrollment.id}
              availableRoutines={availableRoutines}
              availablePlans={availablePlans}
              loadingCatalog={loadingCatalog}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
