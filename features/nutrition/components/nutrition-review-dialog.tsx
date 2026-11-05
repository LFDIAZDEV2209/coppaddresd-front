"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/providers/auth-provider";
import { useT } from "@/providers/i18n-provider";
import type { NutritionFood, NutritionPatientDetail, NutritionServiceIssue } from "../types/nutrition";
import { NutritionIssueMessage } from "./nutrition-feedback";
import { cycleIsComplete } from "../lib/nutrition-calculations";
import { NutritionTargetsPanel, NutritionValidity } from "./nutrition-shared";

export function NutritionReviewDialog({ patient, catalog, mode, busy, failed, reloadRequired, onClose, onConfirm }: {
  patient: NutritionPatientDetail; catalog: NutritionFood[]; mode: "approve" | "return"; busy: boolean; failed: NutritionServiceIssue | null; reloadRequired: boolean;
  onClose: () => void; onConfirm: (options: { comment: string; criticalConfirmed: boolean }) => Promise<boolean>;
}) {
  const t = useT();
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [comment, setComment] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cycle = patient.cycle!;
  const criticalCount = cycle.alerts.filter((alert) => alert.severity === "critical").length;
  const complete = cycleIsComplete(cycle, catalog);
  const canConfirm = mode === "return" ? comment.trim().length > 0 : complete && (criticalCount === 0 || confirmed);
  const author = t(cycle.createdBy === user?.id ? "Nutricionista actual" : "Nutricionista externo");
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent size="default" className="nutrition-module nutrition-review-dialog" initialFocus={titleRef}><form className="nutrition-review-form" onSubmit={async (event) => { event.preventDefault(); if (canConfirm && !busy && await onConfirm({ comment: comment.trim(), criticalConfirmed: confirmed })) onClose(); }}>
    <DialogHeader className="nutrition-review-header"><DialogTitle ref={titleRef} tabIndex={-1} className="nutrition-display">{t(mode === "approve" ? "Revisar aprobación del plan" : "Devolver plan con comentario")}</DialogTitle><DialogDescription>{t("{patient} · versión {version} · ciclo de 30 días", { patient: patient.patientName, version: String(cycle.version) })}</DialogDescription></DialogHeader>
    <DialogBody className="nutrition-review-body">
    <p className="text-sm text-muted-foreground">{t(mode === "approve" ? "Al confirmar, esta versión se publica para el paciente." : "Al confirmar, el plan se devuelve para realizar ajustes. No se publica.")}</p>
    {mode === "approve" && <><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="nutrition-label">{t("Preparado por")}</dt><dd>{author}</dd></div><div><dt className="nutrition-label">{t("Contenido que se publica")}</dt><dd>{t("30 días · 4 comidas por día · indicaciones y metas")}</dd></div><div><dt className="nutrition-label">{t("Vigencia del ciclo")}</dt><dd className="text-sm"><NutritionValidity start={cycle.startDate} end={cycle.endDate} /></dd></div><div><dt className="nutrition-label">{t("Versión publicada actual")}</dt><dd>{patient.publishedCycle ? t("v{version}", { version: String(patient.publishedCycle.version) }) : t("Sin plan")}</dd></div></dl><NutritionTargetsPanel targets={cycle.targets} /><div className="nutrition-notice"><p className="font-semibold">{t("Controles del borrador")}</p><p className="mt-2 text-sm">{t(complete ? "120 comidas completas; alimentos y cantidades válidos; menús actualizados." : "Revisa las comidas vacías, cantidades o metas desactualizadas antes de aprobar.")}</p><p className="mt-2 text-sm">{t("Esta comprobación estructural no sustituye la revisión clínica.")}</p></div>{cycle.provisional && <p className="nutrition-notice">{t("Plan provisional: se conservará esta marca después de aprobar.")}</p>}{criticalCount > 0 && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm leading-relaxed"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} className="mt-1" /><span>{criticalCount === 1 ? t("Revisé personalmente la alerta crítica de este plan.") : t("Revisé personalmente las {count} alertas críticas de este plan.", { count: String(criticalCount) })}</span></label>}</>}
    <div><label htmlFor="nutrition-review-comment" className="nutrition-label">{t(mode === "return" ? "Motivo de devolución (obligatorio)" : "Comentario de revisión (opcional)")}</label><Textarea id="nutrition-review-comment" required={mode === "return"} maxLength={2000} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /></div>
    {failed && <NutritionIssueMessage issue={failed} />}
    {reloadRequired && <div className="space-y-3"><p className="text-sm text-destructive">{t("No se pudo confirmar el resultado. Recarga la ficha antes de reintentar.")}</p><Button type="button" variant="outline" onClick={() => window.location.reload()}>{t("Recargar ficha")}</Button></div>}
    </DialogBody>
    <DialogFooter className="nutrition-review-footer"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("Cancelar")}</Button><Button type="submit" disabled={!canConfirm || busy || reloadRequired}>{t(mode === "approve" ? "Aprobar y publicar" : "Confirmar devolución")}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
