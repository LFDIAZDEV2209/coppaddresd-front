"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { AssignmentState } from "../types/assignments";

export const assignmentLabels: Record<AssignmentState, string> = {
  proposed: "Propuesta lista", "pending-narrative": "Narrativa en preparación", applied: "Aplicada", edited: "Aplicada con ajuste", dismissed: "Desestimada", fallback: "Asignación automática",
};

export function AssignmentStatus({ state }: { state: AssignmentState }) {
  const t = useT();
  return <span className={cn("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", state === "applied" || state === "edited" ? "bg-success-soft text-success-soft-foreground" : "bg-muted text-foreground")}>{t(assignmentLabels[state] ?? state)}</span>;
}

export function AssignmentSkeleton() {
  const t = useT();
  return <div role="status" className="space-y-4 p-6"><span className="sr-only">{t("Cargando asignaciones")}</span><Skeleton className="h-10 w-64" />{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
}

export function AssignmentError({ retry }: { retry: () => void }) {
  const t = useT();
  return <div role="alert" className="rounded-xl border border-border bg-card p-6"><p className="font-semibold">{t("No pudimos cargar la asignación")}</p><p className="my-2 text-sm text-muted-foreground">{t("Comprueba tu conexión y tus permisos e intenta de nuevo.")}</p><Button variant="outline" onClick={retry}>{t("Reintentar")}</Button></div>;
}

export function AssignmentLink({ id }: { id: string }) {
  const t = useT();
  return <Link className={cn(buttonVariants({ variant: "outline" }), "min-h-9")} href={`/program/asignacion/${encodeURIComponent(id)}`}>{t("Revisar asignación")}</Link>;
}
