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

const assignmentTones: Record<AssignmentState, string> = {
  proposed: "border-warning/20 bg-warning-soft text-[color-mix(in_srgb,var(--warning-soft-foreground)_85%,black)] dark:text-warning-soft-foreground",
  "pending-narrative": "border-warning/20 bg-warning-soft text-[color-mix(in_srgb,var(--warning-soft-foreground)_85%,black)] dark:text-warning-soft-foreground",
  applied: "border-success/20 bg-success-soft text-[color-mix(in_srgb,var(--success-soft-foreground)_85%,black)] dark:text-success-soft-foreground",
  edited: "border-success/20 bg-success-soft text-[color-mix(in_srgb,var(--success-soft-foreground)_85%,black)] dark:text-success-soft-foreground",
  dismissed: "border-border bg-muted text-foreground",
  fallback: "border-border bg-muted text-foreground",
};

export function AssignmentStatus({ state }: { state: AssignmentState }) {
  const t = useT();
  return <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold", assignmentTones[state])}>{t(assignmentLabels[state] ?? state)}</span>;
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
