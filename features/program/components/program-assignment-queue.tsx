"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/providers/i18n-provider";
import { fetchAssignments } from "../services/program-assignments-service";
import { useAssignmentResource } from "../hooks/use-assignment-resource";
import { AssignmentError, AssignmentSkeleton, AssignmentStatus, assignmentLabels } from "./assignment-shared";

export function ProgramAssignmentQueue() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ search: "", page: 1, status: "" });
  useEffect(() => {
    const timer = setTimeout(() => setQuery((prev) => prev.search === search.trim() ? prev : { ...prev, search: search.trim(), page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback((signal: AbortSignal) => fetchAssignments(query.page, query.search, query.status, signal), [query]);
  const { data, loading, error, retry } = useAssignmentResource(load);

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">{t("Asignación del programa")}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("Revisa el perfil y confirma el contenido para iniciar la primera semana de cada paciente.")}</p></div>
      <Button variant="outline" disabled={loading} onClick={retry}>{t("Actualizar")}</Button>
    </header>
    <section aria-label={t("Cola de asignación")} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end gap-4 border-b border-border p-5">
        <div className="min-w-56 flex-1"><label className="mb-2 block text-sm font-medium" htmlFor="assignment-search">{t("Buscar paciente")}</label><div className="relative"><Search aria-hidden className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input id="assignment-search" type="search" maxLength={200} className="h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Nombre o documento")} /></div></div>
        <div><label htmlFor="assignment-status" className="mb-2 block text-sm font-medium">{t("Estado")}</label><select id="assignment-status" value={query.status} onChange={(event) => setQuery((prev) => ({ ...prev, page: 1, status: event.target.value }))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"><option value="">{t("Pendientes de asignación")}</option><option value="all">{t("Todos los estados")}</option>{Object.entries(assignmentLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></div>
      </div>
      <p className="px-5 py-3 text-xs text-muted-foreground">{t("Prioridad: mayor tiempo de espera, seguido de severidad clínica.")}</p>
      {loading ? <AssignmentSkeleton /> : error ? <div className="p-5"><AssignmentError retry={retry} /></div> : data && data.items.length > 0 ? <>
        <Table><caption className="sr-only">{t("Cola de asignación")}</caption><TableHeader><TableRow>{["Paciente", "Días en espera", "Condición principal", "Estado", "Acciones"].map((label) => <TableHead scope="col" key={label} className="px-5">{t(label)}</TableHead>)}</TableRow></TableHeader><TableBody>{data.items.map((item) => <TableRow key={item.recommendationId}>
          <TableCell className="px-5 py-4"><Link href={`/program/asignacion/${encodeURIComponent(item.recommendationId)}`} className="rounded font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{item.patientName}</Link><p className="mt-1 text-xs text-muted-foreground">{item.patientDocument ?? t("Sin documento")}</p></TableCell>
          <TableCell className="px-5 tabular-nums">{t("{days} días", { days: String(item.daysWaiting) })}</TableCell>
          <TableCell className="max-w-72 whitespace-normal px-5">{item.primaryCondition ?? t("Consultar perfil clínico")}<p className="mt-1 text-xs text-muted-foreground"><cite className="not-italic">{item.primaryConditionSource}</cite></p></TableCell>
          <TableCell className="px-5"><AssignmentStatus state={item.state} /></TableCell>
          <TableCell className="px-5"><Link className="rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" href={`/program/asignacion/${encodeURIComponent(item.recommendationId)}`} aria-label={t("Revisar asignación de {name}", { name: item.patientName })}>{t("Revisar")}</Link></TableCell>
        </TableRow>)}</TableBody></Table>
        <nav aria-label={t("Paginación de asignaciones")} className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5"><p role="status" className="text-sm text-muted-foreground">{t("Página {page} de {pages} · {total} pacientes", { page: String(data.page), pages: String(Math.max(1, data.totalPages)), total: String(data.total) })}</p><div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1} onClick={() => setQuery((prev) => ({ ...prev, page: prev.page - 1 }))}>{t("Anterior")}</Button><Button variant="outline" disabled={data.page >= data.totalPages} onClick={() => setQuery((prev) => ({ ...prev, page: prev.page + 1 }))}>{t("Siguiente")}</Button></div></nav>
      </> : <div role="status" className="flex flex-col items-center gap-3 px-6 py-16 text-center"><ClipboardCheck aria-hidden className="size-10 text-primary" /><h2 className="text-lg font-semibold">{t(query.search || query.status ? "No encontramos asignaciones" : "No hay pacientes esperando")}</h2><p className="max-w-md text-sm text-muted-foreground">{t(query.search || query.status ? "Prueba con otro nombre, documento o estado." : "Cuando un paciente complete sus tests, podrás revisar aquí su propuesta de programa.")}</p></div>}
    </section>
  </div>;
}
