"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";

const decisions = ["Repetir con variación", "Recalcular metas", "Pasar a mantenimiento", "Cerrar programa", "Registrar mediciones"] as const;
type Decision = typeof decisions[number];
const measurements = [
  { name: "weight", label: "Peso (kg)", min: 0.1, max: undefined },
  { name: "height", label: "Talla (cm)", min: 0.1, max: undefined },
  { name: "glucose", label: "Glicemia (mg/dL)", min: 0.1, max: undefined },
  { name: "hba1c", label: "HbA1c (%)", min: 0, max: 100 },
  { name: "fat", label: "Grasa corporal (%)", min: 0, max: 100 },
  { name: "adherence", label: "Adherencia (%)", min: 0, max: 100 },
] as const;

/** TODO backend: exploración de interacción, sin cliente API ni persistencia. */
export function NutritionCycleDecisions() {
  const t = useT();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [message, setMessage] = useState("");
  return <section className="nutrition-section">
    <h2 className="text-base font-semibold">{t("Decisión del siguiente ciclo")}</h2>
    <p className="my-3 text-sm text-muted-foreground">{t("Exploración local con datos sintéticos. Ninguna acción guarda ni publica cambios.")}</p>
    <div className="flex flex-wrap gap-2">{decisions.map((label) => <Button key={label} variant="outline" onClick={() => { setMessage(""); setDecision(label); }}>{t(label)}</Button>)}</div>
    {message && <p role="status" className="mt-4 text-sm">{t(message)}</p>}
    <Dialog open={!!decision} onOpenChange={(open) => { if (!open) setDecision(null); }}>
      {decision && <DecisionForm key={decision} decision={decision} close={() => setDecision(null)} confirm={() => { setDecision(null); setMessage("Vista previa local. No se guardaron cambios."); }} />}
    </Dialog>
  </section>;
}

function DecisionForm({ decision, close, confirm }: { decision: Decision; close: () => void; confirm: () => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const measuring = decision === "Registrar mediciones";
  const varying = decision === "Repetir con variación";
  const closing = decision === "Cerrar programa";
  const dateLabel = measuring ? "Fecha de medición" : closing ? "Fecha de cierre" : "Inicio propuesto";
  const dateNow = new Date();
  const localDate = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, "0")}-${String(dateNow.getDate()).padStart(2, "0")}`;
  const labels = { "Repetir con variación": "Revisar variación", "Recalcular metas": "Revisar metas", "Pasar a mantenimiento": "Revisar mantenimiento", "Cerrar programa": "Revisar cierre", "Registrar mediciones": "Revisar mediciones" };
  return <DialogContent className="nutrition-module nutrition-rework nutrition-cycle-dialog overflow-hidden p-0" showCloseButton={false}>
    <form className="flex min-h-0 flex-col" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      if (varying && !data.getAll("weeks").length) { setError("Selecciona al menos un bloque para variar."); event.currentTarget.querySelector<HTMLInputElement>('[name="weeks"]')?.focus(); return; }
      if (measuring && !measurements.some(({ name }) => String(data.get(name) ?? "").trim())) { setError("Registra al menos una medición."); event.currentTarget.querySelector<HTMLInputElement>('[name="weight"]')?.focus(); return; }
      if (!measuring && !String(data.get("reason") ?? "").trim()) { setError("Escribe el motivo de la decisión."); event.currentTarget.querySelector<HTMLTextAreaElement>('[name="reason"]')?.focus(); return; }
      confirm();
    }}>
      <DialogHeader className="p-6"><DialogTitle>{t(decision)}</DialogTitle><DialogDescription>{t("Vista previa de diseño · C2 · Paciente sintético. Requiere integración backend.")}</DialogDescription></DialogHeader>
      <DialogBody className="space-y-4">
        {error && <p id="cycle-decision-error" role="alert" className="text-sm text-destructive">{t(error)}</p>}
        {!measuring && <p className="text-sm">{t("Ciclo fuente: C1 · versión 2. La publicación actual se conserva.")}</p>}
        <label className="block space-y-2 text-sm"><span>{t(dateLabel)}</span><Input name="date" type="date" required max={measuring || closing ? localDate : undefined} min={!measuring && !closing ? localDate : undefined} /></label>
        {varying && <>
          <fieldset aria-describedby={error ? "cycle-decision-error" : undefined}><legend className="text-sm font-medium">{t("Bloques con variación")}</legend><div className="mt-2 grid grid-cols-2 gap-2">{["Semana 1", "Semana 2", "Semana 3", "Semana 4", "Días 29 y 30"].map((label, index) => <label key={label} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="weeks" value={String(index)} defaultChecked />{t(label)}</label>)}</div></fieldset>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="keepTargets" defaultChecked />{t("Mantener metas actuales")}</label>
        </>}
        {measuring ? <>
          <label className="block space-y-2 text-sm"><span>{t("Hora de medición")}</span><Input name="time" type="time" required /></label>
          <div className="space-y-2 text-sm"><label htmlFor="cycle-measurement-source">{t("Origen de la medición")}</label><select id="cycle-measurement-source" name="source" className="nutrition-select w-full" required defaultValue=""><option value="" disabled>{t("Selecciona el origen")}</option><option value="consultation">{t("Consulta clínica")}</option><option value="lab">{t("Laboratorio")}</option></select></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{measurements.map(({ name, label, min, max }) => <label key={name} className="block space-y-2 text-sm"><span>{t(label)}</span><Input name={name} type="number" step="0.1" min={min} max={max} aria-describedby={error ? "cycle-decision-error" : undefined} /></label>)}</div>
          <p className="text-xs text-muted-foreground">{t("Deja vacíos los datos no medidos. No se calculan glicemia ni grasa corporal.")}</p>
        </> : <>
          {decision === "Recalcular metas" && <div className="space-y-2 text-sm"><label htmlFor="cycle-target-objective">{t("Objetivo")}</label><select id="cycle-target-objective" name="objective" className="nutrition-select w-full" defaultValue="lose"><option value="lose">{t("Perder peso")}</option><option value="maintain">{t("Mantener peso")}</option></select></div>}
          {!varying && !closing && <div className="rounded-lg border p-3 text-sm"><strong>{t("Comparación de metas")}</strong><p className="mt-2 text-muted-foreground">{t("Propuesta pendiente del motor autorizado. Requiere mediciones reales y revisión profesional.")}</p></div>}
          <label className="block space-y-2 text-sm"><span>{t("Motivo de la decisión")}</span><textarea name="reason" required maxLength={1000} rows={3} aria-describedby={error ? "cycle-decision-error" : undefined} className="w-full rounded-md border bg-background p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" /></label>
          {closing && <label className="flex min-h-11 items-start gap-3 text-sm"><input name="confirm" type="checkbox" required className="mt-1" />{t("Revisé el impacto sobre el ciclo vigente y los próximos ciclos.")}</label>}
          {decision === "Pasar a mantenimiento" && <label className="flex min-h-11 items-start gap-3 text-sm"><input name="confirm" type="checkbox" required className="mt-1" />{t("La propuesta requiere revisión profesional antes de aprobar.")}</label>}
        </>}
      </DialogBody>
      <DialogFooter className="m-0 rounded-none"><Button type="button" variant="outline" onClick={close}>{t("Cancelar")}</Button><Button type="submit">{t(labels[decision])}</Button></DialogFooter>
    </form>
  </DialogContent>;
}
