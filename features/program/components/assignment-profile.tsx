"use client";

import { useT } from "@/providers/i18n-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssignmentCondition, AssignmentProfile as Profile } from "../types/assignments";

// Cita mediciones publicadas en facts; no reevalúa ni diagnostica condiciones.
function measurements(condition: AssignmentCondition, facts: Record<string, unknown>) {
  if (condition.value !== undefined) return `${condition.value} ${condition.unit ?? ""}`;
  const fields = new Map<string, string>();
  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const entry = node as Record<string, unknown>;
    if (typeof entry.field === "string" && typeof facts[entry.field] === "number") fields.set(entry.field, `${entry.field}: ${facts[entry.field]} ${typeof entry.unit === "string" ? entry.unit : ""}`);
    Object.values(entry).forEach(visit);
  }
  visit(condition.criteria);
  return [...fields.values()].join(" · ");
}

export function AssignmentProfile({ profile }: { profile: Profile }) {
  const t = useT();
  const conditions = (profile.conditions ?? []).filter((condition) => condition.active);
  return <section aria-labelledby="normalized-profile" className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 id="normalized-profile" className="text-lg font-semibold">{t("Perfil normalizado")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Resultados medidos y criterios que sustentan la propuesta.")}</p>
    <div className="my-5 flex flex-wrap gap-3">{conditions.length ? conditions.map((condition) => <div key={condition.code} className="max-w-full rounded-xl border border-border bg-muted/30 p-3"><span className="text-sm font-semibold">{condition.name ?? condition.code}</span><p className="mt-1 text-sm">{measurements(condition, profile.facts ?? {}) || t("Sin valor medido disponible")}</p>{condition.severity && <p className="text-xs text-muted-foreground">{condition.severity}</p>}<cite className="mt-2 block text-xs not-italic text-muted-foreground">{condition.sourceRef ?? condition.source_ref ?? t("Fuente no disponible")}</cite></div>) : <p className="text-sm text-muted-foreground">{t("Sin condiciones activas en este perfil.")}</p>}</div>
    <Table><caption className="sr-only">{t("Resultados por test")}</caption><TableHeader><TableRow><TableHead scope="col">{t("Test")}</TableHead><TableHead scope="col">{t("Score")}</TableHead><TableHead scope="col">{t("Tipificación")}</TableHead></TableRow></TableHeader><TableBody>{(profile.results ?? []).map((result, index) => <TableRow key={`${result.testCode}-${result.code}-${index}`}><TableCell className="whitespace-normal">{result.testCode}<span className="ml-2 text-xs text-muted-foreground">{result.code}</span></TableCell><TableCell className="tabular-nums">{result.value}{result.maximum != null ? ` / ${result.maximum}` : ""}</TableCell><TableCell className="whitespace-normal">{result.qualifier ?? result.severity ?? t("Sin tipificación")}</TableCell></TableRow>)}</TableBody></Table>
    {!profile.results?.length && <p className="py-3 text-sm text-muted-foreground">{t("Sin resultados disponibles.")}</p>}
    {!!profile.biometrics?.length && <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">{t("Ver mediciones del perfil")}</summary><dl className="mt-3 grid gap-3 sm:grid-cols-2">{profile.biometrics.map((item, index) => <div key={`${item.questionCode}-${index}`} className="text-sm"><dt className="text-muted-foreground">{item.questionCode}</dt><dd className="font-medium tabular-nums">{item.value} {item.unit}{item.valid === false ? ` · ${t("Fuera del rango publicado")}` : ""}</dd></div>)}</dl></details>}
  </section>;
}
