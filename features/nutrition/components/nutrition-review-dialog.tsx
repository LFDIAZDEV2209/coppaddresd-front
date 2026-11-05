"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";
import type { NutritionFood, NutritionPatientDetail } from "../types/nutrition";
import { cycleIsComplete } from "../lib/nutrition-calculations";
import { NutritionTargetsPanel } from "./nutrition-shared";

export function NutritionReviewDialog({ patient, catalog, mode, busy, failed, onClose, onConfirm }: {
  patient: NutritionPatientDetail; catalog: NutritionFood[]; mode: "approve" | "return"; busy: boolean; failed: boolean;
  onClose: () => void; onConfirm: (options: { comment: string; criticalConfirmed: boolean }) => Promise<boolean>;
}) {
  const t = useT();
  const [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cycle = patient.cycle!;
  const criticalCount = cycle.alerts.filter((alert) => alert.severity === "critical").length;
  const complete = cycleIsComplete(cycle, catalog);
  const canConfirm = mode === "return" ? comment.trim().length > 0 : complete && (criticalCount === 0 || confirmed);
  const author = patient.audit.find((entry) => entry.actorId === cycle.createdBy)?.actorName ?? t("Profesional demo");
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent size="default" className="nutrition-module" initialFocus={titleRef}><form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); if (canConfirm && !busy && await onConfirm({ comment: comment.trim(), criticalConfirmed: confirmed })) onClose(); }}>
    <DialogHeader><DialogTitle ref={titleRef} tabIndex={-1} className="nutrition-display">{t(mode === "approve" ? "Revisar aprobación del plan" : "Devolver plan con comentario")}</DialogTitle><DialogDescription>{t("{patient} · versión {version} · ciclo de 30 días", { patient: patient.patientName, version: String(cycle.version) })}</DialogDescription></DialogHeader>
    <p className="text-sm text-muted-foreground">{t("Simulación local: no publica ni modifica el plan de un paciente real.")}</p>
    {mode === "approve" && <><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="nutrition-label">{t("Preparado por")}</dt><dd>{author}</dd></div><div><dt className="nutrition-label">{t("Contenido que se publica en demo")}</dt><dd>{t("30 días · 4 comidas por día · indicaciones y metas")}</dd></div><div><dt className="nutrition-label">{t("Vigencia demo")}</dt><dd className="nutrition-measure text-sm">{cycle.startDate} → {cycle.endDate}</dd></div><div><dt className="nutrition-label">{t("Versión publicada actual")}</dt><dd>{patient.publishedCycle ? t("v{version}", { version: String(patient.publishedCycle.version) }) : t("Sin plan")}</dd></div></dl><NutritionTargetsPanel targets={cycle.targets} /><div className="nutrition-notice"><p className="font-semibold">{t("Controles del borrador demo")}</p><p className="mt-2 text-sm">{t(complete ? "120 comidas completas; alimentos y cantidades válidos; menús actualizados." : "Revisa las comidas vacías, cantidades o metas desactualizadas antes de aprobar.")}</p><p className="mt-2 text-sm">{t("Esta comprobación estructural no sustituye la revisión clínica.")}</p></div>{cycle.provisional && <p className="nutrition-notice">{t("Plan provisional: se conservará esta marca después de aprobar.")}</p>}{criticalCount > 0 && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm leading-relaxed"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} className="mt-1" /><span>{t("Revisé personalmente las {count} alertas críticas de este plan.", { count: String(criticalCount) })}</span></label>}</>}
    <div><label htmlFor="nutrition-review-comment" className="nutrition-label">{t(mode === "return" ? "Motivo de devolución (obligatorio)" : "Comentario de revisión (opcional)")}</label><Textarea id="nutrition-review-comment" required={mode === "return"} maxLength={2000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /></div>
    {failed && <p role="alert" className="text-sm text-destructive">{t("No pudimos completar la acción. Revisa el guardado e inténtalo de nuevo.")}</p>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancelar")}</Button><Button type="submit" disabled={!canConfirm || busy}>{t(mode === "approve" ? "Confirmar aprobación demo" : "Confirmar devolución demo")}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
