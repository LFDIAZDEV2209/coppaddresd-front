"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Users as UsersIcon,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  fetchOrganizationTree,
  type OrganizationTree,
} from "../services/employees-service";
import {
  createBulkEmployees,
  type BulkCreateResult,
} from "../services/employees-service";
import {
  createBulkPatients,
  type BulkCreatePatientsResult,
} from "@/features/patients/services/patients-service";
import {
  createBulkUsers,
  type BulkCreateUsersResult,
} from "@/features/users/services/users-service";
import {
  downloadPeopleTemplateCsv,
  parsePeopleCsv,
  validatePeopleRows,
  type PeopleCsvRow,
  type PeoplePreview,
} from "../services/people-csv";
import { ApiError } from "@/lib/api/http";

type Stage = "upload" | "preview" | "confirm" | "processing" | "result";

/**
 * Importación masiva unificada de personas (empleados, pacientes, usuarios)
 * en un solo paso. Flujo: plantilla CSV → preview editable con revalidación
 * → confirmación (con selector de organización) → procesamiento (3 llamadas
 * en paralelo con Promise.allSettled) → resultado consolidado.
 *
 * organizationId: org-scoped — se resuelve como en el wizard (fetchOrganizationTree
 * + primera org con clínicas). Se usa solo para el bulk de empleados.
 */
export function PeopleBulkImport() {
  const t = useT();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [rows, setRows] = useState<PeopleCsvRow[]>([]);
  const [preview, setPreview] = useState<PeoplePreview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [orgTree, setOrgTree] = useState<OrganizationTree[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [failedRows, setFailedRows] = useState<
    Array<{ line: number; error: string }>
  >([]);
  const [result, setResult] = useState<{
    employees?: BulkCreateResult;
    patients?: BulkCreatePatientsResult;
    users?: BulkCreateUsersResult;
    employeeFailed?: boolean;
    patientFailed?: boolean;
    userFailed?: boolean;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationTree()
      .then((orgs) => {
        if (cancelled) return;
        setOrgTree(orgs);
        const withClinics = orgs.find((o) => o.clinics.length > 0) ?? orgs[0] ?? null;
        if (withClinics) setOrganizationId(withClinics.id);
      })
      .catch(() => {
        // Si falla el árbol org, se mostrará error al intentar importar.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Revalida TODAS las filas (copias inmutables) y actualiza el resumen. */
  const revalidate = useCallback((next: PeopleCsvRow[]) => {
    const copies = next.map((row) => ({ ...row, errors: [] }));
    const summary = validatePeopleRows(copies);
    setRows(copies);
    setPreview(summary);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setFileError(null);
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setFileError(
          t(
            "Formato no soportado todavía. Guardá tu planilla como CSV (separador ';') y volvé a intentarlo.",
          ),
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const parsed = parsePeopleCsv(text);
        if (parsed.length === 0) {
          setFileError(
            t(
              "El archivo no tiene filas. Descargá la plantilla y probá de nuevo.",
            ),
          );
          return;
        }
        const copies = parsed.map((row) => ({ ...row, errors: [] }));
        const summary = validatePeopleRows(copies);
        setRows(copies);
        setPreview(summary);
        setFileName(file.name);
        setStage("preview");
      };
      reader.readAsText(file, "utf-8");
    },
    [t],
  );

  const updateRow = (index: number, patch: Partial<PeopleCsvRow>) => {
    revalidate(
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (index: number) => {
    revalidate(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const nextLine = rows.reduce((max, row) => Math.max(max, row.line), 0) + 1;
    revalidate([
      ...rows,
      {
        line: nextLine,
        tipo: "",
        nombre: "",
        apellido: "",
        email: "",
        documento: "",
        profesion: "",
        clinicasRaw: "",
        parsedClinics: [],
        estado: "",
        errors: [],
      },
    ]);
  };

  /**
   * Envía las filas válidas separadas por tipo en 3 llamadas paralelas.
   * Cada batch usa line 1-based sobre SU array enviado; mapeamos de vuelta
   * a la línea original del CSV para mostrar errores correctos.
   */
  const startImport = async () => {
    if (!preview) return;
    if (!organizationId) {
      setBulkError(
        t(
          "No se pudo resolver la organización. Recargá la página e intentá de nuevo.",
        ),
      );
      return;
    }
    setStage("processing");
    setBulkError(null);
    setFailedRows([]);

    const validRows = rows.filter((row) => row.errors.length === 0);

    if (validRows.length === 0) {
      setBulkError(
        t("No hay filas válidas para importar. Corregí las filas con errores o agregá nuevas filas."),
      );
      setStage("preview");
      return;
    }

    // Separar filas por tipo
    const employees = validRows.filter(
      (r) => r.tipo === "profesional" || r.tipo === "empleado",
    );
    const patients = validRows.filter((r) => r.tipo === "paciente");
    const users = validRows.filter((r) => r.tipo === "usuario");

    // Mapas de sentIndex→línea original (1-based) para remapear resultados
    const employeeLineMap = employees.map((r) => r.line);
    const patientLineMap = patients.map((r) => r.line);
    const userLineMap = users.map((r) => r.line);

    // Construir payloads por tipo
    const employeePayload = employees.map((row) => ({
      firstName: row.nombre.trim(),
      lastName: row.apellido.trim(),
      email: row.email.trim(),
      professionalTypeName: row.profesion || null,
      status: (row.estado || "invitado").trim().toLowerCase(),
      clinicas: row.parsedClinics.length > 0
        ? row.parsedClinics.map((c) => ({ code: c.code, roleName: c.roleName ?? "" }))
        : undefined,
    }));

    const patientPayload = patients.map((row) => ({
      firstName: row.nombre.trim(),
      lastName: row.apellido.trim(),
      documentNumber: row.documento.trim() || null,
      email: row.email.trim() || null,
      status: (row.estado || "activo").trim().toLowerCase(),
      clinicCode: row.parsedClinics.length > 0 ? row.parsedClinics[0]?.code ?? null : null,
    }));

    const userPayload = users.map((row) => ({
      firstName: row.nombre.trim(),
      lastName: row.apellido.trim(),
      email: row.email.trim(),
      roleName: row.parsedClinics.length > 0 ? row.parsedClinics[0]?.roleName ?? null : null,
      clinicCode: row.parsedClinics.length > 0 ? row.parsedClinics[0]?.code ?? null : null,
      status: (row.estado || "invitado").trim().toLowerCase(),
    }));

    // Ejecutar las 3 llamadas en paralelo
    const settled = await Promise.allSettled([
      employeePayload.length > 0
        ? createBulkEmployees({ organizationId, rows: employeePayload })
        : Promise.resolve(null),
      patientPayload.length > 0
        ? createBulkPatients({ rows: patientPayload })
        : Promise.resolve(null),
      userPayload.length > 0
        ? createBulkUsers(userPayload)
        : Promise.resolve(null),
    ]);

    // Procesar resultados
    const empResult = settled[0]?.status === "fulfilled" ? settled[0].value : null;
    const patResult = settled[1]?.status === "fulfilled" ? settled[1].value : null;
    const usrResult = settled[2]?.status === "fulfilled" ? settled[2].value : null;

    const empFailed = settled[0]?.status === "rejected";
    const patFailed = settled[1]?.status === "rejected";
    const usrFailed = settled[2]?.status === "rejected";

    // Mapear errores de cada lote a líneas originales
    const allFailedRows: Array<{ line: number; error: string }> = [];

    if (empResult?.results) {
      for (const r of empResult.results) {
        if (!r.success && r.error) {
          const originalLine = employeeLineMap[r.line - 1] ?? r.line;
          allFailedRows.push({ line: originalLine, error: r.error });
        }
      }
    }
    if (patResult?.results) {
      for (const r of patResult.results) {
        if (!r.success && r.error) {
          const originalLine = patientLineMap[r.line - 1] ?? r.line;
          allFailedRows.push({ line: originalLine, error: r.error });
        }
      }
    }
    if (usrResult?.results) {
      for (const r of usrResult.results) {
        if (!r.success && r.error) {
          const originalLine = userLineMap[r.line - 1] ?? r.line;
          allFailedRows.push({ line: originalLine, error: r.error });
        }
      }
    }

    // Banners reintentables para fallos de lote global (red, etc.)
    if (empFailed || patFailed || usrFailed) {
      const failedGroups: string[] = [];
      if (empFailed) failedGroups.push(t("profesionales/empleados"));
      if (patFailed) failedGroups.push(t("pacientes"));
      if (usrFailed) failedGroups.push(t("usuarios"));
      setBulkError(
        t("No se pudo completar la importación. Verifica tu conexión e intenta de nuevo.") +
          ` (${failedGroups.join(", ")})`,
      );
    }

    setFailedRows(allFailedRows);
    setResult({
      employees: empResult ?? undefined,
      patients: patResult ?? undefined,
      users: usrResult ?? undefined,
      employeeFailed: empFailed,
      patientFailed: patFailed,
      userFailed: usrFailed,
    });
    setStage("result");
  };

  const reset = () => {
    setStage("upload");
    setRows([]);
    setPreview(null);
    setResult(null);
    setBulkError(null);
    setFailedRows([]);
    setFileError(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Calcular totales del resultado
  const totalCreated =
    (result?.employees?.created ?? 0) +
    (result?.patients?.created ?? 0) +
    (result?.users?.created ?? 0);
  const totalFailed =
    (result?.employees?.failed ?? 0) +
    (result?.patients?.failed ?? 0) +
    (result?.users?.failed ?? 0);

  // Extraer credenciales de usuarios creados (temporaryPassword)
  const userCredentials = (result?.users?.results ?? []).filter(
    (r) => r.success && r.temporaryPassword,
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Importar personas")}
        description={t(
          "Importá un archivo CSV con profesionales, empleados, pacientes y/o usuarios en un solo paso.",
        )}
        icon={UsersIcon}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              stage === "upload" ? router.push("/people") : reset()
            }
          >
            <ArrowLeft data-icon="inline-start" />
            {t("Volver")}
          </Button>
        }
      />

      {/* Indicador de etapa */}
      <ol className="flex flex-wrap items-center gap-2 text-[11.5px]">
        {(
          [
            ["upload", "1. Cargar archivo"],
            ["preview", "2. Revisar y corregir"],
            ["confirm", "3. Confirmar"],
            ["result", "4. Resultado"],
          ] as const
        ).map(([key, label], index, all) => {
          const currentOrder = ["upload", "preview", "confirm", "result"];
          const stageOrder = stage === "processing" ? "result" : stage;
          const currentIndex = currentOrder.indexOf(stageOrder);
          const defIndex = currentOrder.indexOf(key);
          const done = defIndex < currentIndex;
          const active = defIndex === currentIndex;
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
                  active
                    ? "bg-brand-gradient text-white shadow-sm"
                    : done
                      ? "bg-success/10 text-success-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {t(label)}
              </span>
              {index < all.length - 1 && (
                <span className="h-px w-6 bg-border sm:w-10" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Banner de error global reintentable */}
      {bulkError && stage !== "processing" && stage !== "result" && (
        <div
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{bulkError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void startImport()}
            className="shrink-0"
          >
            <RotateCcw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      )}

      {/* ETAPA: carga de archivo */}
      {stage === "upload" && (
        <div className="animate-slide-up flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-8">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/[0.05]"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl transition-transform",
                dragOver
                  ? "scale-110 bg-brand-gradient text-white"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Upload className="size-6" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-foreground">
                {t("Arrastrá tu archivo o hacé clic para elegirlo")}
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                {t(
                  "CSV con separador ';' · columnas: tipo, nombre, apellido, email, documento, profesión, clínicas, estado",
                )}
              </span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">
              <FileSpreadsheet className="size-4" />
              {fileName ? fileName : t("plantilla-personas.csv")}
            </span>
          </label>

          {fileError && (
            <p
              className="flex items-start gap-2 rounded-lg bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {fileError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-4">
            <Button variant="outline" onClick={downloadPeopleTemplateCsv}>
              <Download data-icon="inline-start" />
              {t("Descargar plantilla")}
            </Button>
            <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <Info className="size-3.5 shrink-0" />
              {t(
                "Excel: guardá tu hoja como 'CSV (delimitado por punto y coma)'.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* ETAPA: preview EDITABLE */}
      {stage === "preview" && preview && (
        <div className="animate-slide-up flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SummaryChip
              tone="success"
              icon={CheckCircle2}
              label={`${preview.valid} ${t("personas válidas")}`}
            />
            {preview.invalid > 0 && (
              <SummaryChip
                tone="warning"
                icon={AlertTriangle}
                label={`${preview.invalid - preview.duplicates} ${t("con errores")}`}
              />
            )}
            {preview.duplicates > 0 && (
              <SummaryChip
                tone="destructive"
                icon={XCircle}
                label={`${preview.duplicates} ${t("emails duplicados")}`}
              />
            )}
            <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-medium text-primary">
              <Pencil className="size-3.5" />
              {t("Editá en línea: los cambios se revalidan al instante.")}
            </span>
          </div>

          <div className="max-h-[440px] overflow-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[1100px] text-left text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                <tr className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="w-10 px-2 py-2">#</th>
                  <th className="w-28 px-2 py-2">{t("Tipo")}</th>
                  <th className="w-44 px-2 py-2">{t("Nombre")}</th>
                  <th className="w-44 px-2 py-2">{t("Apellido")}</th>
                  <th className="min-w-[220px] px-2 py-2">{t("Email")}</th>
                  <th className="w-36 px-2 py-2">{t("Documento")}</th>
                  <th className="w-40 px-2 py-2">{t("Profesión")}</th>
                  <th className="w-56 px-2 py-2">{t("Clínicas")}</th>
                  <th className="w-28 px-2 py-2">{t("Estado")}</th>
                  <th className="w-2/5 min-w-[200px] px-2 py-2">
                    {t("Validación")}
                  </th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const invalid = row.errors.length > 0;
                  const duplicate = row.errors.some((e) =>
                    e.includes("duplicado"),
                  );
                  return (
                    <tr
                      key={`${row.line}-${index}`}
                      className={cn(
                        "animate-slide-up border-t border-border/50 transition-colors",
                        invalid
                          ? "bg-destructive-soft/25"
                          : "hover:bg-muted/30",
                        duplicate && "bg-destructive-soft/40",
                      )}
                      style={{
                        animationDelay: `${Math.min(index * 40, 240)}ms`,
                      }}
                    >
                      <td
                        className={cn(
                          "px-2 py-1.5 text-center text-[11px] text-muted-foreground",
                          invalid && "border-l-2 border-l-destructive",
                        )}
                      >
                        {row.line}
                      </td>
                      <td className="px-2 py-1.5">
                        <NativeSelect
                          value={row.tipo}
                          invalid={row.errors.some((e) => e.includes("Tipo"))}
                          onChange={(value) =>
                            updateRow(index, { tipo: value })
                          }
                          options={[
                            { value: "", label: t("— sin tipo —") },
                            { value: "profesional", label: t("Profesional") },
                            { value: "empleado", label: t("Empleado") },
                            { value: "paciente", label: t("Paciente") },
                            { value: "usuario", label: t("Usuario") },
                          ]}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.nombre}
                          placeholder={t("Nombre")}
                          invalid={row.errors.some((e) => e.includes("Nombre"))}
                          onChange={(value) =>
                            updateRow(index, { nombre: value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.apellido}
                          placeholder={t("Apellido")}
                          invalid={row.errors.some((e) =>
                            e.includes("Apellido"),
                          )}
                          onChange={(value) =>
                            updateRow(index, { apellido: value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.email}
                          placeholder={t("email@dominio.com")}
                          invalid={row.errors.some(
                            (e) =>
                              e.includes("Email") && !e.includes("duplicado"),
                          )}
                          onChange={(value) =>
                            updateRow(index, { email: value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.documento}
                          placeholder={t("Documento (opcional)")}
                          invalid={false}
                          onChange={(value) =>
                            updateRow(index, { documento: value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.profesion}
                          placeholder={t("Profesión")}
                          invalid={row.errors.some((e) =>
                            e.includes("Profesión"),
                          )}
                          onChange={(value) =>
                            updateRow(index, { profesion: value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <EditableCell
                          value={row.clinicasRaw}
                          placeholder={t("central:Professional")}
                          invalid={row.errors.some(
                            (e) =>
                              e.includes("clínica") ||
                              e.includes("Clínicas"),
                          )}
                          onChange={(value) => {
                            // Re-parsear clínicas al editar
                            const rawPairs = value
                              .split(",")
                              .map((frag) => {
                                const trimmed = frag.trim();
                                if (!trimmed) return null;
                                const match = trimmed.match(
                                  /^([^:]+?)(?:\s*:\s*(.+))?$/,
                                );
                                if (match) {
                                  const code = match[1]?.trim() ?? "";
                                  const roleName = match[2]?.trim() || undefined;
                                  if (code) return { code, roleName } as const;
                                }
                                return null;
                              })
                              .filter(
                                (p): p is { readonly code: string; readonly roleName: string | undefined } =>
                                  p !== null,
                              );
                            const pairs: Array<{ code: string; roleName?: string }> = rawPairs;
                            updateRow(index, {
                              clinicasRaw: value,
                              parsedClinics: pairs,
                            });
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <NativeSelect
                          value={row.estado}
                          invalid={row.errors.some((e) =>
                            e.includes("Estado"),
                          )}
                          onChange={(value) =>
                            updateRow(index, { estado: value })
                          }
                          options={[
                            { value: "", label: t("— default —") },
                            { value: "activo", label: t("Activo") },
                            { value: "invitado", label: t("Invitado") },
                            { value: "inactivo", label: t("Inactivo") },
                          ]}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {invalid ? (
                          <span className="flex flex-wrap gap-1.5">
                            {row.errors.map((error) => (
                              <span
                                key={error}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                                  duplicate
                                    ? "border-destructive/30 bg-destructive-soft text-destructive"
                                    : "border-warning/40 bg-warning-soft text-warning-foreground",
                                )}
                              >
                                {duplicate ? (
                                  <XCircle className="size-3" />
                                ) : (
                                  <AlertTriangle className="size-3" />
                                )}
                                {error}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                            <CheckCircle2 className="size-3" />
                            {t("OK")}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("Eliminar fila")}
                          title={t("Eliminar fila")}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus data-icon="inline-start" />
                {t("Agregar fila")}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw data-icon="inline-start" />
                {t("Cambiar archivo")}
              </Button>
            </div>
            <Button
              onClick={() => setStage("confirm")}
              disabled={preview.valid === 0}
            >
              {t("Continuar")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA: confirmación */}
      {stage === "confirm" && preview && (
        <div className="animate-scale-in flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UsersIcon className="size-6" />
          </span>
          <h2 className="text-lg font-bold text-foreground">
            {t("¿Importar {count} personas?", {
              count: String(preview.valid),
            })}
          </h2>
          <p className="max-w-md text-[13px] text-muted-foreground">
            {t(
              "Se procesará cada persona según su tipo. Las filas con errores se omitirán y podrás corregirlas después.",
            )}
          </p>

          {/* Selector de organización */}
          {orgTree.length > 0 && (
            <div className="flex w-full max-w-xs flex-col items-start gap-1.5 text-left">
              <label className="text-[12px] font-semibold text-muted-foreground">
                {t("Organización")}
              </label>
              <NativeSelect
                value={organizationId ?? ""}
                onChange={(value) => setOrganizationId(value || null)}
                options={orgTree.map((o) => ({
                  value: o.id,
                  label: o.name,
                }))}
                className="w-full"
              />
            </div>
          )}

          {/* Notas informativas */}
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            {t("Se enviará una invitación por correo a cada profesional y empleado creado.")}
          </p>
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            {t("Los usuarios creados recibirán una contraseña temporal que se mostrará en el resultado.")}
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => void startImport()}
              className="bg-brand-gradient shadow-md shadow-brand-navy/25 hover:opacity-95"
            >
              <UsersIcon data-icon="inline-start" />
              {t("Importar {count} personas", {
                count: String(preview.valid),
              })}
            </Button>
            <Button variant="outline" onClick={() => setStage("preview")}>
              <ArrowLeft data-icon="inline-start" />
              {t("Volver al preview")}
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA: procesando */}
      {stage === "processing" && (
        <div className="animate-scale-in flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-14">
          <LoaderCircle className="size-10 animate-spin text-primary" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[15px] font-semibold text-foreground">
              {t("Importando personas...")}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t("Enviando lotes al servidor...")}
            </p>
          </div>
          <div className="h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse rounded-full bg-brand-gradient opacity-80" />
          </div>
        </div>
      )}

      {/* ETAPA: resultado */}
      {stage === "result" && result && (
        <div className="animate-scale-in flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h2 className="text-lg font-bold text-foreground">
            {t("Importación finalizada")}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SummaryChip
              tone="success"
              icon={CheckCircle2}
              label={`${totalCreated} ${t("creados")}`}
            />
            {totalFailed > 0 && (
              <SummaryChip
                tone="warning"
                icon={AlertTriangle}
                label={`${totalFailed} ${t("con errores")}`}
              />
            )}
          </div>

          {/* Aviso explícito cuando todas las filas fallaron */}
          {totalCreated === 0 && totalFailed > 0 && (
            <div
              className="flex w-full max-w-xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">
                {t("Ninguna fila fue creada. Revisa los errores por fila.")}
              </span>
            </div>
          )}

          {/* Banners reintentables para fallos de lote global */}
          {bulkError && (
            <div
              className="flex w-full max-w-xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2.5 text-[12.5px] text-destructive"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{bulkError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void startImport()}
                className="shrink-0"
              >
                <RotateCcw data-icon="inline-start" />
                {t("Reintentar")}
              </Button>
            </div>
          )}

          {/* Tabla de credenciales de usuarios creados */}
          {userCredentials.length > 0 && (
            <div className="mt-2 w-full max-w-xl rounded-xl border border-primary/30 bg-primary/5 p-3 text-left">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                <Info className="size-3.5" />
                {t("Credenciales de usuario creadas")}
              </p>
              <p className="mb-2 text-[11.5px] text-muted-foreground">
                {t(
                  "Estas contraseñas se muestran solo una vez. Copialas y compartilas de forma segura.",
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
                <table className="w-full text-left text-[11.5px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/50 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                      <th className="px-2.5 py-1.5">{t("Email")}</th>
                      <th className="px-2.5 py-1.5">
                        {t("Contraseña temporal")}
                      </th>
                      <th className="w-10 px-2.5 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {userCredentials.map((r) => (
                      <tr
                        key={r.email}
                        className="border-t border-border/40"
                      >
                        <td className="px-2.5 py-1.5 font-medium text-foreground">
                          {r.email}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono text-foreground">
                          {r.temporaryPassword}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(
                                `${r.email}\t${r.temporaryPassword}`,
                              );
                            }}
                            className="text-primary hover:text-primary/80"
                            title={t("Copiar")}
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const text = userCredentials
                    .map((r) => `${r.email}\t${r.temporaryPassword}`)
                    .join("\n");
                  void navigator.clipboard.writeText(text);
                }}
              >
                <Copy data-icon="inline-start" />
                {t("Copiar todas las credenciales")}
              </Button>
            </div>
          )}

          {/* Detalle de filas con error del backend */}
          {failedRows.length > 0 && (
            <div className="mt-2 w-full max-w-xl rounded-xl border border-warning/30 bg-warning-soft/40 p-3 text-left">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-warning-foreground">
                <AlertTriangle className="size-3.5" />
                {t("Detalles de filas con error")}
              </p>
              <ul className="flex flex-col gap-1.5">
                {failedRows.map((f) => (
                  <li
                    key={f.line}
                    className="flex items-start gap-2 rounded-md bg-card px-2.5 py-1.5 text-[12px] text-foreground"
                  >
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {t("Línea {line}", { line: String(f.line) })}
                    </span>
                    <span className="flex-1">{f.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => router.push("/people")}>
              <UsersIcon data-icon="inline-start" />
              {t("Ir a personas")}
            </Button>
            <Button variant="outline" onClick={reset}>
              <FileUp data-icon="inline-start" />
              {t("Importar otro archivo")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Celda de texto editable: borde invisible, anillo al foco, rojo si inválida. */
function EditableCell({
  value,
  placeholder,
  invalid,
  onChange,
}: {
  value: string;
  placeholder: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid}
      spellCheck={false}
      className={cn(
        "h-9 w-full rounded-lg border-border bg-white px-3 text-[13px] font-medium shadow-xs transition-all hover:border-primary/50 focus-visible:bg-white aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:bg-destructive-soft/20 aria-[invalid=true]:text-destructive",
      )}
    />
  );
}

/** Chip resumen animado (pops al aparecer). */
function SummaryChip({
  tone,
  icon: Icon,
  label,
}: {
  tone: "success" | "warning" | "destructive";
  icon: typeof CheckCircle2;
  label: string;
}) {
  return (
    <span
      className={cn(
        "animate-scale-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        tone === "success" && "bg-success text-white",
        tone === "warning" && "bg-warning-soft text-warning-foreground",
        tone === "destructive" && "bg-destructive-soft text-destructive",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
