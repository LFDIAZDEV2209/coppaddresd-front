"use client";

import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileUp,
  Files,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/feedback/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
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
import type {
  CuvValidation,
  FacturaRips,
  RipsArchivoTipo,
} from "../types";
import {
  createFactura,
  expectedFileNames,
  listFacturas,
  validarCuv,
} from "../services/facturacion-service";
import { formatCOP } from "../lib/format";

const ESTADO_STYLES: Record<FacturaRips["estado"], string> = {
  cargada: "bg-primary-soft text-primary",
  "en-validacion": "bg-warning-soft text-warning-foreground",
  validada: "bg-success-soft text-success",
  rechazada: "bg-destructive-soft text-destructive",
};

function EstadoBadge({ estado }: { estado: FacturaRips["estado"] }) {
  const t = useT();
  const labels: Record<FacturaRips["estado"], string> = {
    cargada: t("Cargada"),
    "en-validacion": t("En validación"),
    validada: t("Validada"),
    rechazada: t("Rechazada"),
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        ESTADO_STYLES[estado],
      )}
    >
      {estado === "validada" && <CheckCircle2 className="size-3" />}
      {estado === "en-validacion" && <Loader2 className="size-3 animate-spin" />}
      {estado === "rechazada" && <X className="size-3" />}
      {labels[estado]}
    </span>
  );
}

const TIPOS_RIPS: { tipo: RipsArchivoTipo; descripcion: string }[] = [
  { tipo: "AF", descripcion: "Transacciones (AF)" },
  { tipo: "US", descripcion: "Usuarios (US)" },
  { tipo: "AP", descripcion: "Ambulatorio / procedimientos (AP)" },
  { tipo: "AH", descripcion: "Hospitalización (AH)" },
  { tipo: "AN", descripcion: "Recién nacidos (AN)" },
  { tipo: "AC", descripcion: "Consulta (AC)" },
  { tipo: "AU", descripcion: "Urgencias (AU)" },
  { tipo: "AM", descripcion: "Medicamentos (AM)" },
  { tipo: "AT", descripcion: "Otros servicios (AT)" },
  { tipo: "FA", descripcion: "Factura (FA)" },
];

const REG_ZERO: Record<RipsArchivoTipo, number> = {
  AF: 0,
  US: 0,
  AP: 0,
  AH: 0,
  AN: 0,
  AC: 0,
  AU: 0,
  AM: 0,
  AT: 0,
  FA: 0,
};

/**
 * Facturación RIPS — acceso de la red al cargue de facturas y RIPS.
 * Dashboard de facturaciones + nuevo cargue con autocompleto por CUV.
 */
export function FacturacionPage() {
  const t = useT();
  const [mode, setMode] = useState<"list" | "nueva">("list");
  const [items, setItems] = useState<FacturaRips[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listFacturas().then((rows) => {
      if (!alive) return;
      setItems(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const valor = items.reduce((a, f) => a + f.valorTotal, 0);
    const registros = items.reduce(
      (a, f) => a + Object.values(f.registros).reduce((x, y) => x + y, 0),
      0,
    );
    const pendientes = items.filter(
      (f) => f.estado === "cargada" || f.estado === "en-validacion",
    ).length;
    return { count: items.length, valor, registros, pendientes };
  }, [items]);

  if (mode === "nueva") {
    return (
      <NuevoCargue
        onSaved={(created) => {
          setItems((prev) => [created, ...prev]);
          setMode("list");
        }}
        onCancel={() => setMode("list")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("RIPS y facturación — Acceso a redes")}
        description={t(
          "Cargue y seguimiento de facturas y RIPS de la red prestadora",
        )}
        icon={FileCheck2}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={() => setMode("nueva")}
          >
            <Plus data-icon="inline-start" />
            {t("Nuevo cargue")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Facturas radicadas")}
          value={String(stats.count)}
          icon={FileCheck2}
          variant="primary"
          centered
        />
        <StatCard
          label={t("Valor facturado")}
          value={formatCOP(stats.valor)}
          icon={Files}
          variant="success"
          centered
        />
        <StatCard
          label={t("Registros RIPS")}
          value={String(stats.registros)}
          icon={Sparkles}
          variant="info"
          centered
        />
        <StatCard
          label={t("Pendientes de validación")}
          value={String(stats.pendientes)}
          icon={AlertTriangle}
          variant="warning"
          centered
        />
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Facturaciones y RIPS")}
          description={t(
            "Historial de cargues de la red con su estado de validación",
          )}
          icon={Files}
          variant="primary"
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2 size-3.5 text-muted-foreground" />
              <Input
                className="h-8 w-56 pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Buscar CUV, factura o prestador...")}
                aria-label={t("Buscar facturas")}
              />
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("Cargando facturaciones...")}
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {t("Aún no hay facturas cargadas.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[980px] [&_td]:py-2.5 [&_td]:text-[12.5px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("CUV")}</TableHead>
                  <TableHead>{t("Factura")}</TableHead>
                  <TableHead>{t("Prestador")}</TableHead>
                  <TableHead>{t("Fecha radicado")}</TableHead>
                  <TableHead className="text-right">{t("Registros")}</TableHead>
                  <TableHead className="text-right">{t("Total factura")}</TableHead>
                  <TableHead>{t("Archivos")}</TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => {
                  const expanded = expandedId === f.id;
                  const registros = Object.values(f.registros).reduce(
                    (a, b) => a + b,
                    0,
                  );
                  return (
                    <Fragment key={f.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpandedId(expanded ? null : f.id)}
                      >
                        <TableCell className="font-mono text-[11.5px] font-semibold">
                          {f.cuv}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {f.facturaNumero}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {f.prestadorRazonSocial}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            NIT {f.prestadorNit}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.fechaRadicacion}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {registros}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCOP(f.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {f.archivos.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={f.estado} />
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={8} className="p-0">
                            <FacturaDetail row={f} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function FacturaDetail({ row }: { row: FacturaRips }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 border-l-2 border-primary/30 bg-muted/20 p-5">
      <div className="grid gap-3 text-[12.5px] sm:grid-cols-4">
        <InfoBox label={t("Usuario")} value={row.usuarioNombre} />
        <InfoBox label={t("Cobertura")} value={row.cobertura} />
        <InfoBox label={t("Valor neto")} value={formatCOP(row.valorNeto)} />
        <InfoBox
          label={t("Registros por tipo")}
          value={
            Object.entries(row.registros)
              .filter(([, n]) => n > 0)
              .map(([tipo, n]) => `${tipo}: ${n}`)
              .join(" · ") || "—"
          }
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="[&_td]:py-2 [&_td]:text-[12px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t("Tipo")}</TableHead>
              <TableHead>{t("Archivo")}</TableHead>
              <TableHead className="text-right">{t("Registros")}</TableHead>
              <TableHead className="text-right">{t("Tamaño")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.archivos.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                    {a.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11.5px]">
                  {a.nombre}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.registros}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {a.tamaño}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-[12px] font-medium">{value}</p>
    </div>
  );
}

/* ------------------------------ Nuevo cargue ------------------------------ */

function NuevoCargue({
  onSaved,
  onCancel,
}: {
  onSaved: (created: FacturaRips) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [cuv, setCuv] = useState("");
  const [validando, setValidando] = useState(false);
  const [cuvError, setCuvError] = useState<string | null>(null);
  const [validated, setValidated] = useState<CuvValidation | null>(null);

  // Datos autocompletados con la respuesta de la validación del CUV —
  // editables por si se desea corregir algo.
  const [facturaNumero, setFacturaNumero] = useState("");
  const [prestadorNombre, setPrestadorNombre] = useState("");
  const [prestadorNit, setPrestadorNit] = useState("");
  const [fechaExpedicion, setFechaExpedicion] = useState("");
  const [usuarioNombre, setUsuarioNombre] = useState("");
  const [usuarioTipo, setUsuarioTipo] =
    useState<CuvValidation["usuarioTipo"]>("cotizante");
  const [numeroContrato, setNumeroContrato] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [cobertura, setCobertura] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorCopago, setValorCopago] = useState("");
  const [valorCuota, setValorCuota] = useState("");
  const [valorNeto, setValorNeto] = useState("");

  const [registros, setRegistros] = useState<Record<RipsArchivoTipo, number>>({
    ...REG_ZERO,
  });

  const [modoArchivos, setModoArchivos] = useState<"rapida" | "manual">("rapida");
  const [archivosRapidos, setArchivosRapidos] = useState<
    { tipo: RipsArchivoTipo; nombre: string; registros: number; nombreArchivo: string }[]
  >([]);
  const [archivosManuales, setArchivosManuales] = useState<
    { tipo: RipsArchivoTipo; nombre: string; registros: number; nombreArchivo: string }[]
  >([]);
  const [manualTipo, setManualTipo] = useState<RipsArchivoTipo>("AP");
  const [manualRegistros, setManualRegistros] = useState("");
  const [saving, setSaving] = useState(false);

  const aplicarCuv = (v: CuvValidation) => {
    setValidated(v);
    setFacturaNumero(v.facturaNumero);
    setPrestadorNombre(v.prestadorRazonSocial);
    setPrestadorNit(v.prestadorNit);
    setFechaExpedicion(v.fechaExpedicion);
    setUsuarioNombre(v.usuarioNombre);
    setUsuarioTipo(v.usuarioTipo);
    setNumeroContrato(v.numeroContrato);
    setModalidad(v.modalidadContrato);
    setCobertura(v.cobertura);
    setValorTotal(String(v.valorTotal));
    setValorCopago(String(v.valorCopago));
    setValorCuota(String(v.valorCuotaModeradora));
    setValorNeto(String(v.valorNeto));
    setRegistros({ ...REG_ZERO, AP: 6, AU: 2, AM: 4 });
  };

  const validar = async () => {
    setValidando(true);
    setCuvError(null);
    const v = await validarCuv(cuv);
    if (v) {
      aplicarCuv(v);
    } else {
      setCuvError(
        t(
          "CUV inválido. Ingresa el código completo del usuario validado (mín. 6 caracteres).",
        ),
      );
    }
    setValidando(false);
  };

  const estructura = useMemo(
    () =>
      validated
        ? expectedFileNames(
            validated.facturaNumero,
            validated.prestadorNit,
            registros,
          )
        : [],
    [validated, registros],
  );

  const totalValor = Number(valorTotal) || 0;
  const totalNeto = Number(valorNeto) || 0;
  const archivos = modoArchivos === "rapida" ? archivosRapidos : archivosManuales;

  const guardar = async () => {
    if (!validated) return;
    setSaving(true);
    const created = await createFactura({
      cuv: cuv.trim(),
      facturaNumero: facturaNumero.trim(),
      prestadorRazonSocial: prestadorNombre.trim(),
      prestadorNit: prestadorNit.trim(),
      fechaRadicacion: new Date().toISOString().slice(0, 10),
      valorTotal: totalValor,
      valorCopago: Number(valorCopago) || 0,
      valorCuotaModeradora: Number(valorCuota) || 0,
      valorNeto: totalNeto,
      usuarioTipo,
      usuarioDocumento: validated.usuarioDocumento,
      usuarioNombre: usuarioNombre.trim(),
      numeroContrato: numeroContrato.trim(),
      modalidadContrato: modalidad,
      cobertura: cobertura.trim(),
      periodoAtencion: validated.periodoAtencion,
      registros,
      archivos: archivos.map((a) => ({
        tipo: a.tipo,
        nombre: a.nombreArchivo || a.nombre,
        registros: a.registros,
        tamaño: "—",
      })),
    });
    onSaved(created);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("Nuevo cargue de facturación")}
        description={t("Valida el CUV, corrige lo necesario y adjunta los archivos RIPS")}
        icon={UploadCloud}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={onCancel}
          >
            <X data-icon="inline-start" />
            {t("Cancelar")}
          </Button>
        }
      />

      {/* Paso 1 — CUV + autocompleto */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Validación del CUV")}
          description={t(
            "Los datos de la factura del prestador se autocompletan con la respuesta de la validación",
          )}
          icon={Zap}
          variant="primary"
        />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="font-mono sm:max-w-xs"
              value={cuv}
              onChange={(e) => setCuv(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void validar()}
              placeholder={t("Ingresa el CUV")}
              aria-label={t("CUV")}
            />
            <Button
              size="sm"
              onClick={() => void validar()}
              disabled={!cuv.trim() || validando}
            >
              {validando ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {t("Validar CUV")}
            </Button>
          </div>

          {cuvError && (
            <p className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive-soft/40 px-3 py-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {cuvError}
            </p>
          )}

          {validated && (
            <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
              <Field
                label={t("Número de factura")}
                value={facturaNumero}
                onChange={setFacturaNumero}
              />
              <Field
                label={t("Prestador")}
                value={prestadorNombre}
                onChange={setPrestadorNombre}
              />
              <Field
                label={t("NIT del prestador")}
                value={prestadorNit}
                onChange={setPrestadorNit}
              />
              <Field
                label={t("Fecha de expedición")}
                value={fechaExpedicion}
                onChange={setFechaExpedicion}
                type="date"
              />
              <Field
                label={t("Usuario")}
                value={usuarioNombre}
                onChange={setUsuarioNombre}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("Tipo de usuario")}
                </label>
                <Select
                  value={usuarioTipo}
                  onValueChange={(v) =>
                    setUsuarioTipo(
                      (v ?? "cotizante") as CuvValidation["usuarioTipo"],
                    )
                  }
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cotizante">{t("Cotizante")}</SelectItem>
                    <SelectItem value="beneficiario">{t("Beneficiario")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field
                label={t("Número de contrato")}
                value={numeroContrato}
                onChange={setNumeroContrato}
              />
              <Field
                label={t("Modalidad de contrato")}
                value={modalidad}
                onChange={setModalidad}
              />
              <Field
                label={t("Cobertura")}
                value={cobertura}
                onChange={setCobertura}
              />
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:col-span-2 sm:grid-cols-4">
                <Field
                  label={t("Valor total")}
                  value={valorTotal}
                  onChange={setValorTotal}
                  type="number"
                />
                <Field
                  label={t("Copago")}
                  value={valorCopago}
                  onChange={setValorCopago}
                  type="number"
                />
                <Field
                  label={t("Cuota moderadora")}
                  value={valorCuota}
                  onChange={setValorCuota}
                  type="number"
                />
                <Field
                  label={t("Valor neto")}
                  value={valorNeto}
                  onChange={setValorNeto}
                  type="number"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Paso 2 — Registros reportados */}
      {validated && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Registros reportados en la factura")}
            description={t("Números de registros por tipo de RIPS")}
            icon={Files}
            variant="primary"
          />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-5">
            {TIPOS_RIPS.map(({ tipo }) => (
              <div key={tipo} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  {tipo}
                </label>
                <Input
                  type="number"
                  min={0}
                  className="h-8 text-xs tabular-nums"
                  value={registros[tipo]}
                  onChange={(e) =>
                    setRegistros((prev) => ({
                      ...prev,
                      [tipo]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  aria-label={t("Registros {tipo}", { tipo })}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Paso 3 — Archivos */}
      {validated && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Archivos")}
            description={t(
              "Carga rápida con la estructura requerida o carga manual archivo por archivo",
            )}
            icon={UploadCloud}
            variant="primary"
          />
          <div className="flex flex-col gap-4 p-5">
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              <Button
                variant={modoArchivos === "rapida" ? "default" : "outline"}
                size="sm"
                onClick={() => setModoArchivos("rapida")}
              >
                <Zap data-icon="inline-start" />
                {t("Carga rápida")}
              </Button>
              <Button
                variant={modoArchivos === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setModoArchivos("manual")}
              >
                <Plus data-icon="inline-start" />
                {t("Carga manual")}
              </Button>
            </div>

            {modoArchivos === "rapida" ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Estructura requerida para el cargue — nombra los archivos exactamente así:",
                  )}
                </p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <Table className="[&_td]:py-2 [&_td]:text-[12px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Tipo")}</TableHead>
                        <TableHead>{t("Archivo esperado")}</TableHead>
                        <TableHead className="text-right">
                          {t("Registros")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estructura.map((e) => (
                        <TableRow key={e.tipo}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold"
                            >
                              {e.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11.5px]">
                            {e.nombre}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {e.registros}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary-soft/40 px-4 py-8 text-center transition-colors hover:bg-primary-soft/70"
                  htmlFor="upload-rapida"
                >
                  <UploadCloud className="size-7 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {t("Cargar lote de archivos")}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {t(
                      "Selecciona los archivos con la estructura mostrada y se registran automáticamente",
                    )}
                  </span>
                  <input
                    id="upload-rapida"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) return;
                      const porTipo = new Map(
                        estructura.map((x) => [x.tipo, x.nombre] as const),
                      );
                      const nuevos = files.map((f) => {
                        const prefijo =
                          f.name.split("-")[0]?.toUpperCase() ?? "";
                        const match = estructura.find((x) =>
                          f.name.toUpperCase().startsWith(x.tipo + "-"),
                        );
                        const resuelto: RipsArchivoTipo =
                          match?.tipo ??
                          (estructura.some((x) => x.tipo === prefijo)
                            ? (prefijo as RipsArchivoTipo)
                            : "AF");
                        return {
                          tipo: resuelto,
                          nombre: f.name,
                          nombreArchivo: porTipo.get(resuelto) ?? f.name,
                          registros:
                            estructura.find((x) => x.tipo === resuelto)
                              ?.registros ?? 0,
                        };
                      });
                      setArchivosRapidos(nuevos);
                    }}
                  />
                </label>
                {archivosRapidos.length > 0 && (
                  <p className="flex items-center gap-2 text-xs text-success">
                    <CheckCircle2 className="size-4" />
                    {t("{count} archivos listos para el cargue", {
                      count: String(archivosRapidos.length),
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid gap-2 sm:grid-cols-[240px_110px_auto_auto]">
                  <Select
                    value={manualTipo}
                    onValueChange={(v) =>
                      setManualTipo((v ?? "AP") as RipsArchivoTipo)
                    }
                  >
                    <SelectTrigger
                      className="h-9 text-xs"
                      aria-label={t("Tipo de archivo")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_RIPS.map(({ tipo, descripcion }) => (
                        <SelectItem key={tipo} value={tipo}>
                          {descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    className="h-9 text-xs"
                    value={manualRegistros}
                    onChange={(e) => setManualRegistros(e.target.value)}
                    placeholder={t("Registros del archivo")}
                    aria-label={t("Registros del archivo")}
                  />
                  <label
                    className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary-soft/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft/70"
                    htmlFor="upload-manual"
                  >
                    <FileUp className="size-4" />
                    {t("Seleccionar archivo")}
                    <input
                      id="upload-manual"
                      type="file"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setArchivosManuales((prev) => [
                          ...prev,
                          {
                            tipo: manualTipo,
                            nombre: f.name,
                            nombreArchivo: f.name,
                            registros: Number(manualRegistros) || 0,
                          },
                        ]);
                        setManualRegistros("");
                      }}
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setArchivosManuales((prev) => [
                        ...prev,
                        {
                          tipo: manualTipo,
                          nombre: `${manualTipo}-manual.txt`,
                          nombreArchivo: `${manualTipo}-manual.txt`,
                          registros: Number(manualRegistros) || 0,
                        },
                      ]);
                      setManualRegistros("");
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    {t("Agregar sin archivo")}
                  </Button>
                </div>
                {archivosManuales.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <Table className="[&_td]:py-2 [&_td]:text-[12px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("Tipo")}</TableHead>
                          <TableHead>{t("Archivo")}</TableHead>
                          <TableHead className="text-right">
                            {t("Registros")}
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivosManuales.map((a, i) => (
                          <TableRow key={`${a.tipo}-${i}`}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] font-bold"
                              >
                                {a.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11.5px]">
                              {a.nombre}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {a.registros}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("Quitar archivo {nombre}", {
                                  nombre: a.nombre,
                                })}
                                onClick={() =>
                                  setArchivosManuales((prev) =>
                                    prev.filter((_, xi) => xi !== i),
                                  )
                                }
                              >
                                <Trash2
                                  className="size-3.5 text-destructive"
                                  aria-hidden
                                />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        <div className="mr-auto text-[12.5px] text-muted-foreground">
          {t("Total factura")}:{" "}
          <span className="font-bold text-foreground">
            {formatCOP(totalValor)}
          </span>
        </div>
        <Button variant="outline" onClick={onCancel}>
          {t("Cancelar")}
        </Button>
        <Button onClick={guardar} disabled={!validated || saving}>
          {saving ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          {t("Radicar factura y RIPS")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}
