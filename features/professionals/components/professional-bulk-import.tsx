"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Stethoscope,
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
  fetchProfessionalTypes,
  type ProfessionalTypeDto,
} from "../services/professional-catalogs-service";
import {
  downloadProfessionalsTemplate,
  parseProfessionalsCsv,
  validateProfessionalRows,
  type BulkProfessionalPreview,
  type BulkProfessionalResult,
  type BulkProfessionalRow,
} from "../services/professionals-mock";
import {
  createBulkEmployees,
  fetchOrganizationTree,
} from "../services/employees-service";
import { ApiError } from "@/lib/api/http";

type Stage = "upload" | "preview" | "confirm" | "processing" | "result";

/**
 * Creación masiva de profesionales conectada al endpoint real.
 * Flujo: plantilla CSV → preview editable con revalidación → confirmación →
 * procesamiento (POST /api/v1/employees/bulk, request único con spinner
 * indeterminado) → resultado con mapeo de results[] por line.
 *
 * organizationId: org-scoped — se resuelve como en el wizard (fetchOrganizationTree
 * + primera org con clínicas). La UI no expone selector de org: si no hay org
 * con clínicas se muestra error global reintentable.
 */
export function ProfessionalBulkImport() {
  const t = useT();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [types, setTypes] = useState<ProfessionalTypeDto[]>([]);
  const [rows, setRows] = useState<BulkProfessionalRow[]>([]);
  const [preview, setPreview] = useState<BulkProfessionalPreview | null>(null);
  const [result, setResult] = useState<BulkProfessionalResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [failedRows, setFailedRows] = useState<
    Array<{ line: number; error: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProfessionalTypes(), fetchOrganizationTree()])
      .then(([fetchedTypes, orgs]) => {
        if (cancelled) return;
        setTypes(fetchedTypes);
        // Misma estrategia que el wizard: primera org con clínicas.
        const withClinics = orgs.find((o) => o.clinics.length > 0) ?? orgs[0] ?? null;
        if (withClinics) setOrganizationId(withClinics.id);
      })
      .catch(() => {
        // Sin catálogo la validación de tipos se relaja (no bloquea).
        // Si falla el árbol org, se mostrará error al intentar importar.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeNames = types.map((type) => type.name);

  /** Revalida TODAS las filas (copias inmutables) y actualiza el resumen. */
  const revalidate = useCallback(
    (next: BulkProfessionalRow[]) => {
      const copies = next.map((row) => ({ ...row, errors: [] }));
      const summary = validateProfessionalRows(copies, typeNames);
      setRows(copies);
      setPreview(summary);
    },
    [typeNames],
  );

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
        const parsed = parseProfessionalsCsv(text);
        if (parsed.length === 0) {
          setFileError(
            t(
              "El archivo no tiene filas. Descargá la plantilla y probá de nuevo.",
            ),
          );
          return;
        }
        const copies = parsed.map((row) => ({ ...row, errors: [] }));
        const summary = validateProfessionalRows(copies, typeNames);
        setRows(copies);
        setPreview(summary);
        setFileName(file.name);
        setStage("preview");
      };
      reader.readAsText(file, "utf-8");
    },
    [typeNames, t],
  );

  const updateRow = (index: number, patch: Partial<BulkProfessionalRow>) => {
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
        firstName: "",
        lastName: "",
        email: "",
        professionalType: "",
        status: "activo",
        errors: [],
      },
    ]);
  };

  const startImport = async () => {
    if (!preview) return;
    if (!organizationId) {
      setBulkError(
        t(
          "No se pudo resolver la organización. Recargá la página e intenta de nuevo.",
        ),
      );
      return;
    }
    setStage("processing");
    setBulkError(null);
    setFailedRows([]);
    // Solo filas válidas (el backend igual valida por fila, pero evitamos
    // enviar errores ya detectados en cliente). Mapeo: professionalType -> professionalTypeName.
    const validRows = rows.filter((row) => row.errors.length === 0);
    const payload = validRows.map((row) => ({
      firstName: row.firstName.trim(),
      lastName: row.lastName.trim(),
      email: row.email.trim(),
      professionalTypeName: row.professionalType ? row.professionalType : null,
      status: (row.status || "activo").trim().toLowerCase(),
    }));

    try {
      const response = await createBulkEmployees({
        organizationId,
        rows: payload,
      });

      // Mapea results[] por line a las filas UI para mostrar errores de fila.
      // El backend usa line 1-based sobre el array enviado (validRows).
      // Inyectamos el error en la fila correspondiente para que el preview
      // pueda reflejarlo si el usuario vuelve atrás.
      if (response.results && response.results.length > 0) {
        const failures = response.results
          .filter((r) => !r.success)
          .map((r) => ({ line: r.line, error: r.error ?? t("Error desconocido") }));
        setFailedRows(failures);

        // Actualiza las filas UI con errores del servidor (para trazabilidad).
        if (failures.length > 0) {
          const lineToError = new Map(failures.map((f) => [f.line, f.error]));
          const updated = validRows.map((row, idx) => {
            const line = idx + 1;
            const err = lineToError.get(line);
            if (err) return { ...row, errors: [...row.errors, err] };
            return row;
          });
          // Mantener también las filas inválidas originales para contexto.
          const invalidRows = rows.filter((row) => row.errors.length > 0);
          const merged = [...invalidRows, ...updated];
          // No llamamos revalidate aquí para no pisar los errores del servidor.
          // Solo actualizamos rows para que el resultado pueda listarlos.
          // El orden original por line se conserva al mostrar failedRows.
          setRows(merged);
        }
      }

      setResult({ created: response.created, skipped: response.failed });
      setStage("result");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t("No se pudo completar la importación. Verifica tu conexión e intenta de nuevo.");
      setBulkError(message);
      setStage("confirm");
    }
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Crear profesionales masivamente")}
        description={t(
          "Importá un archivo CSV con la plantilla: revisá la validación y creá todo el equipo de una vez.",
        )}
        icon={Stethoscope}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              stage === "upload" ? router.push("/employees") : reset()
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
                  "CSV con separador ';' · columnas: nombre, apellido, email, tipo, estado",
                )}
              </span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">
              <FileSpreadsheet className="size-4" />
              {fileName ? fileName : t("plantilla-profesionales.csv")}
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
            <Button variant="outline" onClick={downloadProfessionalsTemplate}>
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
              label={`${preview.valid} ${t("profesionales válidos")}`}
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
            <table className="w-full min-w-[920px] text-left text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                <tr className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="w-10 px-2 py-2">#</th>
                  <th className="w-52 px-2 py-2">{t("Nombre")}</th>
                  <th className="min-w-[280px] px-2 py-2">{t("Email")}</th>
                  <th className="w-56 px-2 py-2">{t("Tipo")}</th>
                  <th className="w-36 px-2 py-2">{t("Estado")}</th>
                  <th className="w-2/5 min-w-[220px] px-2 py-2">
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
                        <EditableCell
                          value={row.firstName}
                          placeholder={t("Nombre")}
                          invalid={row.errors.some((e) => e.includes("Nombre"))}
                          onChange={(value) =>
                            updateRow(index, { firstName: value })
                          }
                        />
                        <EditableCell
                          value={row.lastName}
                          placeholder={t("Apellido")}
                          invalid={row.errors.some((e) =>
                            e.includes("Apellido"),
                          )}
                          onChange={(value) =>
                            updateRow(index, { lastName: value })
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
                        <NativeSelect
                          value={row.professionalType}
                          invalid={row.errors.some((e) => e.includes("Tipo"))}
                          onChange={(value) =>
                            updateRow(index, { professionalType: value })
                          }
                          options={[
                            { value: "", label: t("— sin tipo —") },
                            ...typeNames.map((name) => ({
                              value: name,
                              label: name,
                            })),
                          ]}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <NativeSelect
                          value={row.status || "activo"}
                          invalid={row.errors.some((e) => e.includes("Estado"))}
                          onChange={(value) =>
                            updateRow(index, { status: value })
                          }
                          options={[
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
            <Stethoscope className="size-6" />
          </span>
          <h2 className="text-lg font-bold text-foreground">
            {t("¿Crear {count} profesionales?", {
              count: String(preview.valid),
            })}
          </h2>
          <p className="max-w-md text-[13px] text-muted-foreground">
            {t(
              "Se creará el perfil de cada profesional válido y se enviará la invitación de primer acceso. Las filas con errores se omitirán y podrás corregirlas después.",
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => void startImport()}
              className="bg-brand-gradient shadow-md shadow-brand-navy/25 hover:opacity-95"
            >
              <Stethoscope data-icon="inline-start" />
              {t("Crear {count} profesionales", {
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

      {/* ETAPA: procesando — request único, estado indeterminado */}
      {stage === "processing" && (
        <div className="animate-scale-in flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-14">
          <LoaderCircle className="size-10 animate-spin text-primary" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[15px] font-semibold text-foreground">
              {t("Creando profesionales...")}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {t("Enviando lote al servidor...")}
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
              label={`${result.created} ${t("creados")}`}
            />
            {result.skipped > 0 && (
              <SummaryChip
                tone="warning"
                icon={AlertTriangle}
                label={`${result.skipped} ${t("con errores")}`}
              />
            )}
          </div>
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
            <Button onClick={() => router.push("/employees")}>
              <Stethoscope data-icon="inline-start" />
              {t("Ir a profesionales")}
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
