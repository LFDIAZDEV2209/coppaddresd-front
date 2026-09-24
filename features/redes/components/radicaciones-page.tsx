"use client";

import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  FileText,
  FileUp,
  Loader2,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CupLine,
  Radicacion,
  RadicacionEstado,
  RedPrestador,
} from "../types";
import {
  analizarCotizacion,
  buildCupLine,
  createRadicacion,
  lookupCie10,
  lookupCupsOrCum,
  lookupRedByNit,
} from "../services/radicaciones-service";
import { formatCOP } from "../lib/format";

const ESTADO_STYLES: Record<RadicacionEstado, string> = {
  radicada: "bg-primary-soft text-primary",
  "en-revision": "bg-warning-soft text-warning-foreground",
  aprobada: "bg-success-soft text-success",
  rechazada: "bg-destructive-soft text-destructive",
};

function EstadoBadge({ estado }: { estado: RadicacionEstado }) {
  const t = useT();
  const labels: Record<RadicacionEstado, string> = {
    radicada: t("Radicada"),
    "en-revision": t("En revisión"),
    aprobada: t("Aprobada"),
    rechazada: t("Rechazada"),
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        ESTADO_STYLES[estado],
      )}
    >
      {estado === "aprobada" && <CheckCircle2 className="size-3" />}
      {estado === "en-revision" && <Clock className="size-3" />}
      {estado === "rechazada" && <X className="size-3" />}
      {labels[estado]}
    </span>
  );
}

/**
 * Radicaciones — las redes prestadoras solicitan sus autorizaciones desde
 * esta vista (acceso a redes). Flujo: NIT → datos → diagnóstico (urgencias) →
 * CUPS/CUMS manual o cotización analizada → valores editables → historial.
 */
export function RadicacionesPage() {
  const t = useT();
  const [mode, setMode] = useState<"list" | "nueva">("list");
  const [items, setItems] = useState<Radicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<"all" | RadicacionEstado>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Carga inicial del historial (mock con latencia).
  useEffect(() => {
    let alive = true;
    import("../services/radicaciones-service").then(async (m) => {
      const rows = await m.listRadicaciones();
      if (!alive) return;
      setItems(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((r) => {
      if (estado !== "all" && r.estado !== estado) return false;
      if (!term) return true;
      return (
        r.consecutivo.toLowerCase().includes(term) ||
        r.razonSocial.toLowerCase().includes(term) ||
        r.nit.toLowerCase().includes(term) ||
        r.diagnosticoCie10.toLowerCase().includes(term)
      );
    });
  }, [items, search, estado]);

  const stats = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const delMes = items.filter((r) => r.createdAt.startsWith(month));
    return {
      count: delMes.length,
      valor: delMes.reduce((a, r) => a + r.total, 0),
      aprobadas: items.filter((r) => r.estado === "aprobada").length,
      pendientes: items.filter(
        (r) => r.estado === "radicada" || r.estado === "en-revision",
      ).length,
    };
  }, [items]);

  if (mode === "nueva") {
    return (
      <NuevaRadicacion
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
        title={t("Radicaciones — Acceso a redes")}
        description={t(
          "Las redes prestadoras solicitan y hacen seguimiento a sus autorizaciones",
        )}
        icon={ClipboardPlus}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={() => setMode("nueva")}
          >
            <Plus data-icon="inline-start" />
            {t("Nueva radicación")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Radicaciones del mes")}
          value={String(stats.count)}
          icon={ClipboardPlus}
          variant="primary"
          centered
        />
        <StatCard
          label={t("Valor radicado")}
          value={formatCOP(stats.valor)}
          icon={FileText}
          variant="success"
          centered
        />
        <StatCard
          label={t("Autorizaciones aprobadas")}
          value={String(stats.aprobadas)}
          icon={CheckCircle2}
          variant="info"
          centered
        />
        <StatCard
          label={t("Pendientes de respuesta")}
          value={String(stats.pendientes)}
          icon={Clock}
          variant="warning"
          centered
        />
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Historial de radicaciones")}
          description={t(
            "Estado de cada autorización solicitada por la red prestadora",
          )}
          icon={FileText}
          variant="primary"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2 size-3.5 text-muted-foreground" />
                <Input
                  className="h-8 w-56 pl-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Buscar consecutivo, red o diagnóstico...")}
                  aria-label={t("Buscar radicaciones")}
                />
              </div>
              <Select
                value={estado}
                onValueChange={(v) =>
                  setEstado((v ?? "all") as "all" | RadicacionEstado)
                }
              >
                <SelectTrigger
                  className="h-8 w-[150px] text-xs"
                  aria-label={t("Filtrar por estado")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todos los estados")}</SelectItem>
                  <SelectItem value="radicada">{t("Radicada")}</SelectItem>
                  <SelectItem value="en-revision">{t("En revisión")}</SelectItem>
                  <SelectItem value="aprobada">{t("Aprobada")}</SelectItem>
                  <SelectItem value="rechazada">{t("Rechazada")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("Cargando radicaciones...")}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {items.length === 0
              ? t("Aún no hay radicaciones registradas.")
              : t("Ninguna radicación coincide con los filtros aplicados.")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px] [&_td]:py-2.5 [&_td]:text-[12.5px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Consecutivo")}</TableHead>
                  <TableHead>{t("Fecha")}</TableHead>
                  <TableHead>{t("Red prestadora")}</TableHead>
                  <TableHead>{t("Diagnóstico")}</TableHead>
                  <TableHead>{t("Líneas")}</TableHead>
                  <TableHead className="text-right">{t("Total")}</TableHead>
                  <TableHead>{t("Estado")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const expanded = expandedId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() =>
                          setExpandedId(expanded ? null : r.id)
                        }
                      >
                        <TableCell className="font-semibold text-foreground">
                          {r.consecutivo}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.createdAt}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{r.razonSocial}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            NIT {r.nit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {r.diagnosticoCie10}
                          </span>
                          <span className="block max-w-[220px] truncate text-[11px] text-muted-foreground">
                            {r.diagnosticoDescripcion}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.cups.length} {t("líneas")}
                          {r.cotizacion && (
                            <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                              {t("Cotización adjunta")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCOP(r.total)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={r.estado} />
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={7} className="p-0">
                            <RadicacionDetail row={r} />
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

/** Panel expandido del historial: detalle completo de una radicación. */
function RadicacionDetail({ row }: { row: Radicacion }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 border-l-2 border-primary/30 bg-muted/20 p-5">
      <div className="grid gap-3 text-[12.5px] sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Building2 className="size-3.5" /> {t("Red prestadora")}
          </p>
          <p className="font-semibold">{row.razonSocial}</p>
          <p className="text-muted-foreground">NIT {row.nit}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Stethoscope className="size-3.5" /> {t("Autorización")}
          </p>
          <p className="font-semibold">
            {t("Nivel")}: {row.nivel}
          </p>
          <p className="text-muted-foreground">
            {t("Prioridad")}: {row.prioridad}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("Cotización adjunta")}
          </p>
          {row.cotizacion ? (
            <>
              <p className="font-medium">{row.cotizacion.numero}</p>
              <p className="text-muted-foreground">
                {row.cotizacion.fecha} · {formatCOP(row.cotizacion.monto)}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">{t("Ingreso manual")}</p>
          )}
        </div>
      </div>
      {row.observaciones && (
        <p className="text-[12px] text-muted-foreground">
          <span className="font-semibold">{t("Observaciones")}:</span>{" "}
          {row.observaciones}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-border">
        <Table className="[&_td]:py-2 [&_td]:text-[12px]">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{t("Tipo")}</TableHead>
              <TableHead>{t("Código")}</TableHead>
              <TableHead>{t("Descripción")}</TableHead>
              <TableHead className="text-right">{t("Cantidad")}</TableHead>
              <TableHead className="text-right">{t("Valor unitario")}</TableHead>
              <TableHead className="text-right">{t("Subtotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.cups.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {c.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11.5px]">{c.codigo}</TableCell>
                <TableCell>{c.descripcion}</TableCell>
                <TableCell className="text-right tabular-nums">{c.cantidad}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCOP(c.valorUnitario)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatCOP(c.cantidad * c.valorUnitario)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------ Nueva radicación ------------------------------ */

function NuevaRadicacion({
  onSaved,
  onCancel,
}: {
  onSaved: (created: Radicacion) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [nit, setNit] = useState("");
  const [looking, setLooking] = useState(false);
  const [red, setRed] = useState<RedPrestador | null>(null);
  const [nitTouched, setNitTouched] = useState(false);

  const [nivel, setNivel] = useState<Radicacion["nivel"]>("urgencias");
  const [cie10, setCie10] = useState("");
  const [diagDesc, setDiagDesc] = useState("");
  const [prioridad, setPrioridad] = useState<Radicacion["prioridad"]>("alta");
  const [observaciones, setObservaciones] = useState("");

  const [cups, setCups] = useState<CupLine[]>([]);
  const [tipo, setTipo] = useState<CupLine["tipo"]>("CUPS");
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [valor, setValor] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [cotizacion, setCotizacion] = useState<{
    nombreArchivo: string;
    numero: string;
    fecha: string;
    monto: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const consultarRed = async () => {
    setLooking(true);
    setNitTouched(true);
    // Latencia simulada de la búsqueda por NIT ("traen los datos").
    await new Promise((r) => setTimeout(r, 700));
    setRed(lookupRedByNit(nit));
    setLooking(false);
  };

  const onCie10Blur = () => {
    const desc = lookupCie10(cie10);
    if (desc && !diagDesc) setDiagDesc(desc);
  };

  const onCodigoBlur = () => {
    const hit = lookupCupsOrCum(codigo);
    if (hit) {
      setTipo(hit.tipo);
      if (!descripcion) setDescripcion(hit.descripcion);
    }
  };

  const agregarLinea = () => {
    const cant = Math.max(1, Number(cantidad) || 1);
    const val = Number(valor) || 0;
    if (!codigo.trim()) return;
    setCups((prev) => [
      ...prev,
      buildCupLine(tipo, codigo.trim(), descripcion.trim(), cant, val),
    ]);
    setCodigo("");
    setDescripcion("");
    setCantidad("1");
    setValor("");
  };

  const adjuntarCotizacion = async (file: File) => {
    setAnalizando(true);
    const result = await analizarCotizacion(file);
    if (result) {
      setCotizacion({
        nombreArchivo: result.plantilla.nombreArchivo,
        numero: result.plantilla.numero,
        fecha: result.plantilla.fecha,
        monto: result.plantilla.monto,
      });
      setCups((prev) => [...prev, ...result.lines]);
    }
    setAnalizando(false);
  };

  const total = cups.reduce((a, c) => a + c.cantidad * c.valorUnitario, 0);
  const canSave = Boolean(red) && cie10.trim() !== "" && cups.length > 0;

  const guardar = async () => {
    if (!canSave || !red) return;
    setSaving(true);
    const created = await createRadicacion({
      nit: red.nit,
      nivel,
      diagnosticoCie10: cie10.trim().toUpperCase(),
      diagnosticoDescripcion: diagDesc.trim(),
      prioridad,
      observaciones: observaciones.trim(),
      cups,
      cotizacion,
    });
    onSaved(created);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        title={t("Nueva radicación de autorización")}
        description={t(
          "Solicitud de autorización por la red prestadora · ejemplo a nivel de urgencias",
        )}
        icon={ClipboardPlus}
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

      {/* Paso 1 — NIT de la red */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Red prestadora")}
          description={t("Ingresa el NIT de la red y trae sus datos")}
          icon={Building2}
          variant="primary"
        />
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="sm:max-w-xs"
              value={nit}
              onChange={(e) => {
                setNit(e.target.value);
                setNitTouched(false);
                setRed(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && consultarRed()}
              placeholder={t("Ej: 900123456-1")}
              aria-label={t("NIT de la red")}
            />
            <Button size="sm" onClick={consultarRed} disabled={!nit.trim() || looking}>
              {looking ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {t("Consultar datos")}
            </Button>
          </div>

          {looking && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("Consultando red...")}
            </div>
          )}

          {!looking && nitTouched && !red && (
            <p className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive-soft/40 px-3 py-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {t("No se encontró una red con ese NIT. Verifica el número.")}
            </p>
          )}

          {red && !looking && (
            <div className="grid gap-x-6 gap-y-2 rounded-xl border border-border bg-muted/20 p-4 text-[12.5px] sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm font-bold">{red.razonSocial}</p>
                <p className="text-muted-foreground">
                  NIT {red.nit} · {red.codigoPrestador}
                </p>
              </div>
              <span className="text-muted-foreground">
                {red.direccion}, {red.ciudad} ({red.departamento})
              </span>
              <span className="text-muted-foreground">
                {red.telefono} · {red.email}
              </span>
              <span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold",
                    red.habilitacion === "habilitado"
                      ? "border-success/30 bg-success-soft text-success"
                      : "border-destructive/30 bg-destructive-soft text-destructive",
                  )}
                >
                  {red.habilitacion === "habilitado"
                    ? t("Habilitado")
                    : t("No habilitado")}
                </Badge>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Paso 2 — Diagnóstico y autorización */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Diagnóstico de la autorización")}
          description={t("Nivel y diagnóstico de ingreso (ejemplo: urgencias)")}
          icon={Stethoscope}
          variant="primary"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Nivel de atención")}
            </label>
            <Select value={nivel} onValueChange={(v) => setNivel((v ?? "urgencias") as Radicacion["nivel"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgencias">{t("Urgencias")}</SelectItem>
                <SelectItem value="consulta-externa">
                  {t("Consulta externa")}
                </SelectItem>
                <SelectItem value="hospitalizacion">
                  {t("Hospitalización")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Prioridad")}
            </label>
            <Select
              value={prioridad}
              onValueChange={(v) => setPrioridad((v ?? "alta") as Radicacion["prioridad"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">{t("Alta")}</SelectItem>
                <SelectItem value="media">{t("Media")}</SelectItem>
                <SelectItem value="baja">{t("Baja")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Diagnóstico CIE-10")}
            </label>
            <Input
              value={cie10}
              onChange={(e) => setCie10(e.target.value)}
              onBlur={onCie10Blur}
              placeholder={t("Ej: S72.0")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Descripción del diagnóstico")}
            </label>
            <Input
              value={diagDesc}
              onChange={(e) => setDiagDesc(e.target.value)}
              placeholder={t("Descripción del diagnóstico")}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Observaciones")}
            </label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder={t("Contexto clínico de la solicitud (opcional)")}
            />
          </div>
        </div>
      </section>

      {/* Paso 3 — CUPS / CUMS */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("CUPS y CUMS de la autorización")}
          description={t(
            "Ingresa las líneas manualmente o adjunta una cotización para analizarlas",
          )}
          icon={FileText}
          variant="primary"
        />
        <div className="flex flex-col gap-5 p-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            {/* Alta manual */}
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("Ingreso manual")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo((v ?? "CUPS") as CupLine["tipo"])}
                >
                  <SelectTrigger className="h-8 text-xs" aria-label={t("Tipo de línea")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUPS">CUPS</SelectItem>
                    <SelectItem value="CUM">CUM</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 text-xs"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onBlur={onCodigoBlur}
                  placeholder={t("Código")}
                />
              </div>
              <Input
                className="h-8 text-xs"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t("Descripción")}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder={t("Cantidad")}
                  aria-label={t("Cantidad")}
                />
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder={t("Valor unitario")}
                  aria-label={t("Valor unitario")}
                />
              </div>
              <Button size="sm" onClick={agregarLinea} disabled={!codigo.trim()}>
                <Plus data-icon="inline-start" />
                {t("Agregar línea")}
              </Button>
            </div>

            {/* Cotización */}
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("Adjuntar cotización")}
              </p>
              <label
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary-soft/40 px-4 py-6 text-center transition-colors hover:bg-primary-soft/70"
                htmlFor="cotizacion-input"
              >
                <FileUp className="size-6 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {t("Adjuntar y analizar cotización")}
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  {t("PDF o imagen · el sistema extrae los CUPS y CUMS")}
                </span>
                <input
                  id="cotizacion-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void adjuntarCotizacion(f);
                  }}
                />
              </label>
              {analizando && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("Analizando cotización...")}
                </p>
              )}
              {cotizacion && !analizando && (
                <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <FileText className="size-3.5 shrink-0 text-primary" />
                  {cotizacion.numero} · {cotizacion.fecha} ·{" "}
                  {formatCOP(cotizacion.monto)}
                </p>
              )}
            </div>
          </div>

          {/* Líneas editables */}
          {cups.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table className="[&_td]:py-2 [&_td]:text-[12px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Tipo")}</TableHead>
                    <TableHead>{t("Código")}</TableHead>
                    <TableHead>{t("Descripción")}</TableHead>
                    <TableHead className="w-20 text-right">{t("Cant.")}</TableHead>
                    <TableHead className="w-32 text-right">
                      {t("Valor unitario")}
                    </TableHead>
                    <TableHead className="w-28 text-right">
                      {t("Subtotal")}
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cups.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {c.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11.5px]">
                        {c.codigo}
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-full min-w-[180px] rounded-md border-0 bg-transparent px-1 py-0.5 text-[12px] hover:bg-muted focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
                          value={c.descripcion}
                          onChange={(e) =>
                            setCups((prev) =>
                              prev.map((x, xi) =>
                                xi === i ? { ...x, descripcion: e.target.value } : x,
                              ),
                            )
                          }
                          aria-label={t("Descripción de la línea {n}", {
                            n: String(i + 1),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-16 rounded-md border-0 bg-transparent px-1 py-0.5 text-right text-[12px] tabular-nums hover:bg-muted focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
                          type="number"
                          min={1}
                          value={c.cantidad}
                          onChange={(e) =>
                            setCups((prev) =>
                              prev.map((x, xi) =>
                                xi === i
                                  ? { ...x, cantidad: Math.max(1, Number(e.target.value) || 1) }
                                  : x,
                              ),
                            )
                          }
                          aria-label={t("Cantidad de la línea {n}", {
                            n: String(i + 1),
                          })}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          className="w-28 rounded-md border-0 bg-transparent px-1 py-0.5 text-right text-[12px] tabular-nums hover:bg-muted focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
                          type="number"
                          min={0}
                          value={c.valorUnitario}
                          onChange={(e) =>
                            setCups((prev) =>
                              prev.map((x, xi) =>
                                xi === i
                                  ? { ...x, valorUnitario: Math.max(0, Number(e.target.value) || 0) }
                                  : x,
                              ),
                            )
                          }
                          aria-label={t("Valor unitario de la línea {n}", {
                            n: String(i + 1),
                          })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCOP(c.cantidad * c.valorUnitario)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("Quitar línea {n}", { n: String(i + 1) })}
                          onClick={() =>
                            setCups((prev) => prev.filter((_, xi) => xi !== i))
                          }
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={5} className="text-right font-bold">
                      {t("Total de la autorización")}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-primary">
                      {formatCOP(total)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {t(
                "Agrega las líneas manualmente o adjunta la cotización del servicio.",
              )}
            </p>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <div className="mr-auto text-[12.5px] text-muted-foreground">
          {t("Total")}:{" "}
          <span className="font-bold text-foreground">{formatCOP(total)}</span>
        </div>
        <Button variant="outline" onClick={onCancel}>
          {t("Cancelar")}
        </Button>
        <Button onClick={guardar} disabled={!canSave || saving}>
          {saving ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          {t("Radicar autorización")}
        </Button>
      </div>
    </div>
  );
}
