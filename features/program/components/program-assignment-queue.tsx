"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { clinicalLabel } from "./assignment-profile";
import { fetchAssignment, fetchAssignments } from "../services/program-assignments-service";
import type { AssignmentItem } from "../types/assignments";
import { useAssignmentResource } from "../hooks/use-assignment-resource";
import { AssignmentError, AssignmentSkeleton, AssignmentStatus } from "./assignment-shared";

function PatientCard({ item }: { item: AssignmentItem }) {
  const t = useT();
  const load = useCallback((signal: AbortSignal) => fetchAssignment(item.recommendationId, signal), [item.recommendationId]);
  const { data, error } = useAssignmentResource(load);
  const profile = data?.profileSnapshot;
  const completed = profile ? new Set([...(profile.tests ?? []).map((test) => test.code), ...(profile.results ?? []).map((result) => result.testCode)]).size : null;
  const condition = item.primaryCondition ?? (() => { const active = profile?.conditions?.find((condition) => condition.active); return active ? active.name ?? clinicalLabel(active.code) : undefined; })();
  const urgent = ["proposed", "pending-narrative"].includes(item.state) && item.maxSeverity >= 3;
  const href = `/program/asignacion/${encodeURIComponent(item.recommendationId)}`;
  return <Card className="group min-w-0 gap-0 overflow-hidden border border-border transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md motion-reduce:transition-none">
    <CardHeader className="gap-4 pb-5">
      <div className="flex items-start justify-between gap-3"><span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-xl font-semibold text-primary-soft-foreground">{item.patientName.split(/\s+/).slice(0, 2).map((name) => name[0]).join("")}</span><AssignmentStatus state={item.state} /></div>
      <div><CardTitle><h2 className="text-xl leading-snug wrap-anywhere"><Link href={href} className="rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{item.patientName}</Link></h2></CardTitle><p className="mt-1 text-sm text-muted-foreground">{item.patientDocument ?? t("Sin documento")}</p></div>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col gap-5">
      <div><p className="mb-2 text-xs font-medium text-muted-foreground">{t("Condición principal")}</p><span className={cn("inline-flex rounded-md px-2.5 py-1 text-sm font-medium", condition ? "bg-warning-soft text-warning-soft-foreground" : "bg-muted text-muted-foreground")}>{condition ? t(condition) : t("Por confirmar en el perfil")}</span></div>
      <div className={cn("rounded-xl p-3", urgent ? "bg-destructive-soft text-destructive-soft-foreground" : item.daysWaiting >= 5 ? "bg-warning-soft text-warning-soft-foreground" : "bg-muted/40 text-foreground")}><div className="flex items-center gap-2"><Clock3 aria-hidden className="size-4" /><span className="text-2xl font-semibold tabular-nums">{item.daysWaiting}</span><span className="text-sm">{t("días en espera")}</span>{urgent && <span className="ml-auto text-xs font-semibold">{t("Prioridad clínica")}</span>}</div><div aria-hidden className="mt-3 grid grid-cols-7 gap-1">{Array.from({ length: 7 }, (_, i) => <span key={i} className={cn("h-1.5 rounded-full", i < item.daysWaiting ? "bg-current" : "bg-current/15")} />)}</div></div>
      <div className="mt-auto"><div className="mb-2 flex justify-between gap-2 text-xs"><span className="text-muted-foreground">{t("Evaluaciones registradas")}</span><span className="font-medium tabular-nums">{completed === null ? t(error ? "Perfil por consultar" : "Consultando perfil…") : t("{count} de 9", { count: String(completed) })}</span></div><div role="progressbar" aria-label={t("Evaluaciones registradas")} aria-valuemin={0} aria-valuemax={Math.max(9, completed ?? 0)} aria-valuenow={completed ?? undefined} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (completed ?? 0) / 9 * 100)}%` }} /></div></div>
    </CardContent>
    <CardFooter className="mt-5 border-t border-border pt-4"><Link href={href} aria-label={t("Revisar asignación de {name}", { name: item.patientName })} className={cn(buttonVariants({ variant: "default" }), "min-h-11 w-full justify-between")}>{t("Revisar paciente")}<ArrowRight aria-hidden className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none" /></Link></CardFooter>
  </Card>;
}

export function ProgramAssignmentQueue() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1, status: "" });
  useEffect(() => { const timer = setTimeout(() => setQuery((prev) => prev.search === search.trim() ? prev : { ...prev, search: search.trim(), page: 1 }), 350); return () => clearTimeout(timer); }, [search]);
  const load = useCallback((signal: AbortSignal) => fetchAssignments(query.page, query.search, query.status, signal), [query]);
  const { data, loading, error, retry } = useAssignmentResource(load);
  const pending = data?.items.filter((item) => ["proposed", "pending-narrative"].includes(item.state)) ?? [];
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{t("Pacientes por revisar")}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("Revisa su salud, confirma el plan y acompaña el inicio de su primera semana.")}</p></div><Button variant="outline" disabled={loading} onClick={retry}>{t("Actualizar")}</Button></header>
    <section aria-label={t("Resumen de esta página")} className="rounded-xl border border-border bg-card px-5 py-4"><dl className="grid grid-cols-3 gap-3 divide-x divide-border">{[["Esperando", pending.length], ["Críticos", pending.filter((item) => item.maxSeverity >= 3).length], ["Espera media", pending.length ? Math.round(pending.reduce((sum, item) => sum + item.daysWaiting, 0) / pending.length) : 0]].map(([label, value]) => <div key={label} className="pl-3 first:pl-0"><dt className="text-xs text-muted-foreground">{t(String(label))}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{loading ? "—" : value}{label === "Espera media" && <span className="ml-1 text-xs font-normal">{t("días")}</span>}</dd></div>)}</dl><p className="mt-3 text-xs text-muted-foreground">{t("Resumen de esta página")}</p></section>
    <section aria-label={t("Cola de asignación")} className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4"><div className="w-full sm:max-w-sm"><label htmlFor="assignment-search" className="mb-2 block text-sm font-medium">{t("Buscar paciente")}</label><div className="relative"><Search aria-hidden className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="assignment-search" type="search" maxLength={200} className="h-11 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Nombre o documento")} /></div></div><ToggleGroup multiple={false} value={[query.status || "pending"]} onValueChange={(value) => { if (value.length) setQuery((prev) => ({ ...prev, page: 1, status: value[0] === "pending" ? "" : value[0] })); }} variant="outline" className="flex flex-wrap" aria-label={t("Filtrar por estado")}>{[["pending", "Por revisar"], ["applied", "Aplicadas"], ["dismissed", "Descartadas"], ["all", "Todos"]].map(([value, label]) => <ToggleGroupItem key={value} value={value} className="min-h-11 px-3">{t(label)}</ToggleGroupItem>)}</ToggleGroup></div>
      <p className="text-xs text-muted-foreground">{t("Ordenados por tiempo de espera y gravedad clínica.")}</p>
      {loading ? <AssignmentSkeleton /> : error ? <AssignmentError retry={retry} /> : data?.items.length ? <><div className="grid grid-flow-dense grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{data.items.map((item) => <PatientCard key={item.recommendationId} item={item} />)}</div><nav aria-label={t("Paginación de asignaciones")} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4"><p role="status" className="text-sm text-muted-foreground">{t("Página {page} de {pages} · {total} pacientes", { page: String(data.page), pages: String(Math.max(1, data.totalPages)), total: String(data.total) })}</p><div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1} onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}>{t("Anterior")}</Button><Button variant="outline" disabled={data.page >= data.totalPages} onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}>{t("Siguiente")}</Button></div></nav></> : <div role="status" className="rounded-xl border border-dashed border-border px-6 py-16 text-center"><h2 className="text-lg font-semibold">{t("No hay pacientes en esta vista")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t(query.search || query.status ? "Prueba con otro nombre, documento o estado." : "Esperando que el paciente complete sus 9 evaluaciones. Después podrás revisar aquí su programa.")}</p></div>}
    </section>
  </div>;
}
