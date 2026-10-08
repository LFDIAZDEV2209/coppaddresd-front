"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Copy } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { CATEGORY_LABELS } from "../../lib/domain";
import { fetchInstrument, fetchQuestions, saveInstrument, cloneVersion, createVersion, publishVersion, saveQuestion, emptyId, type CatalogInstrument, type CatalogQuestion } from "../../services/catalog-service";

// La configuración publicada se conserva; la edición de preguntas usa una copia en borrador.
export function CatalogEditor({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [instrument, setInstrument] = useState<CatalogInstrument | null>(null);
  const [form, setForm] = useState({ code: "", name: "", description: "", category: "salud-mental", sortOrder: 0, isActive: true });
  const [versionId, setVersionId] = useState("");
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsReadyFor, setQuestionsReadyFor] = useState("");
  const [questions, setQuestions] = useState<CatalogQuestion[]>([]);
  const [editing, setEditing] = useState<CatalogQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const questionsReady = !!versionId && questionsReadyFor === versionId && !questionsLoading;
  const version = instrument?.versions.find(v => v.id === versionId);
  async function load(instrumentId: string, selected?: string) {
    const result = await fetchInstrument(instrumentId);
    setInstrument(result);
    setForm({ code: result.code, name: result.name, description: result.description ?? "", category: result.category ?? "salud-mental", sortOrder: result.sortOrder, isActive: result.isActive });
    setVersionId(selected ?? result.versions.find(v => v.status === "draft")?.id ?? result.versions[0]?.id ?? "");
  }
  useEffect(() => {
    let cancelled = false;
    if (id) fetchInstrument(id).then(result => {
      if (cancelled) return;
      setInstrument(result);
      setForm({ code: result.code, name: result.name, description: result.description ?? "", category: result.category ?? "salud-mental", sortOrder: result.sortOrder, isActive: result.isActive });
      setVersionId(result.versions.find(v => v.status === "draft")?.id ?? result.versions[0]?.id ?? "");
    }).catch(() => { if (!cancelled) setError("No pudimos cargar la información"); });
    return () => { cancelled = true; };
  }, [id]);
  useEffect(() => {
    let cancelled = false;
    if (versionId) {
      fetchQuestions(versionId).then(result => {
        if (!cancelled) { setQuestions(result); setQuestionsReadyFor(versionId); }
      }).catch(() => { if (!cancelled) setError("No pudimos cargar las preguntas."); })
        .finally(() => { if (!cancelled) setQuestionsLoading(false); });
    }
    return () => { cancelled = true; };
  }, [versionId]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); onSaved(); setMessage("Cambios guardados."); }
    catch { setError("No pudimos guardar los cambios. Revisa los campos e intenta de nuevo."); }
    finally { setBusy(false); }
  }
  function addQuestion() {
    setEditing({ id: emptyId, versionId, code: "", text: "", section: null, type: "open", scoringDirection: "positive", sortOrder: questions.length + 1, isActive: true, options: [], unit: null, minValue: null, maxValue: null, defaultValue: null, minLabel: null, maxLabel: null, hint: null });
  }
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>{t(instrument ? "Editar configuración" : "Nuevo test")}</DialogTitle>
        <DialogDescription>{t("Las preguntas publicadas conservan su versión. Crea un borrador para modificarlas.")}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-destructive">{t(error)}</p>}
      {message && <p role="status" className="rounded-lg bg-primary-soft p-3 text-primary-soft-foreground">{t(message)}</p>}
      <form onSubmit={event => { event.preventDefault(); void run(async () => { const saved = await saveInstrument(instrument?.id ?? null, form); await load(saved.id, versionId || undefined); }); }} className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">{t("Código")}<Input required maxLength={100} disabled={!!instrument || busy} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
        <label className="grid gap-1">{t("Nombre")}<Input required maxLength={200} value={form.name} disabled={busy} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className="grid gap-1 sm:col-span-2">{t("Descripción")}<Textarea value={form.description} disabled={busy} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label className="grid gap-1">{t("Categoría")}<select className={selectClass} value={form.category} disabled={busy} onChange={e => setForm({ ...form, category: e.target.value })}><option value={form.category}>{t(CATEGORY_LABELS[form.category as keyof typeof CATEGORY_LABELS] ?? form.category)}</option>{Object.entries(CATEGORY_LABELS).filter(([key]) => key !== form.category).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
        <label className="grid gap-1">{t("Orden")}<Input type="number" value={form.sortOrder} disabled={busy} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} disabled={busy} onChange={e => setForm({ ...form, isActive: e.target.checked })} />{t("Activo")}</label>
        <Button type="submit" disabled={busy || (!!id && !instrument)}><Save />{t("Guardar configuración")}</Button>
      </form>
      {instrument && <section className="grid gap-3 border-t pt-4">
        <div className="flex flex-wrap items-end gap-2"><label className="grid min-w-48 flex-1 gap-1">{t("Versión")}<select className={selectClass} value={versionId} disabled={busy} onChange={e => { setEditing(null); setConfirmPublish(false); setQuestionsLoading(true); setVersionId(e.target.value); }}><option value="" disabled>{t("Selecciona una versión")}</option>{instrument.versions.map(v => <option key={v.id} value={v.id}>v{v.versionNumber} · {t(v.status === "draft" ? "Borrador" : v.status === "active" ? "Publicada" : "Retirada")}</option>)}</select></label>
          <Button variant="outline" disabled={busy} onClick={() => void run(async () => { const draft = versionId ? await cloneVersion(versionId) : await createVersion(instrument.id, Math.max(0, ...instrument.versions.map(v => v.versionNumber)) + 1); await load(instrument.id, draft.id); setEditing(null); })}><Copy />{t("Crear borrador")}</Button>
        </div>
        {version?.status === "draft" && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !questionsReady} onClick={addQuestion}><Plus />{t("Añadir pregunta")}</Button><Button disabled={busy || !questionsReady || !questions.some(q => q.isActive)} onClick={() => setConfirmPublish(true)}>{t("Publicar versión")}</Button></div>}
        {confirmPublish && <div className="rounded-lg border border-warning bg-warning/10 p-3"><p>{t("Esta versión se usará en nuevas asignaciones. Los resultados anteriores conservarán su versión original.")}</p><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={() => void run(async () => { await publishVersion(versionId); setConfirmPublish(false); setEditing(null); await load(instrument.id, versionId); })}>{t("Confirmar publicación")}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirmPublish(false)}>{t("Cancelar")}</Button></div></div>}
        {(questionsReady ? questions : []).map(question => <div key={question.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{question.text}</p><p className="text-xs text-muted-foreground">{question.code} · {question.section} · {question.isActive ? t("Activa") : t("Inactiva")}</p></div>{version?.status === "draft" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(structuredClone(question))}>{t("Editar")}</Button>}</div>)}
        {editing && <form className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void run(async () => { if (!questionsReady || editing.versionId !== versionId) return; await saveQuestion(editing); setQuestions(await fetchQuestions(versionId)); setEditing(null); }); }}>
          <label className="grid gap-1">{t("Código")}<Input disabled={busy} required value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} /></label>
          <label className="grid gap-1">{t("Sección")}<Input disabled={busy} value={editing.section ?? ""} onChange={e => setEditing({ ...editing, section: e.target.value || null })} /></label>
          <label className="grid gap-1 sm:col-span-2">{t("Pregunta")}<Textarea disabled={busy} required value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} /></label>
          <label className="grid gap-1">{t("Tipo")}<select disabled={busy} className={selectClass} value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as CatalogQuestion["type"] })}>{(["open", "single", "multi", "scale", "num"] as const).map((type, i) => <option key={type} value={type}>{t(["Texto libre", "Selección única", "Selección múltiple", "Escala", "Numérica"][i])}</option>)}</select></label>
          <label className="flex items-center gap-2"><input disabled={busy} type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />{t("Activa")}</label>
          {(editing.type === "single" || editing.type === "multi" || editing.type === "scale") && <div className="grid gap-2 sm:col-span-2"><p className="font-medium">{t("Opciones y puntuación")}</p>{editing.options.map((option, index) => <div className="flex flex-wrap items-center gap-2" key={option.id === emptyId ? `new-${index}` : option.id}><Input disabled={busy} aria-label={t("Texto de opción")} required className="min-w-48 flex-1" value={option.text} onChange={e => setEditing({ ...editing, options: editing.options.map((o, i) => i === index ? { ...o, text: e.target.value } : o) })} /><Input disabled={busy} aria-label={t("Puntuación")} type="number" step="any" className="w-24" value={option.scoreValue ?? ""} onChange={e => setEditing({ ...editing, options: editing.options.map((o, i) => i === index ? { ...o, scoreValue: e.target.value === "" ? null : Number(e.target.value) } : o) })} /><label className="flex gap-1"><input disabled={busy} type="checkbox" checked={option.isActive} onChange={e => setEditing({ ...editing, options: editing.options.map((o, i) => i === index ? { ...o, isActive: e.target.checked } : o) })} />{t("Activa")}</label></div>)}<Button type="button" variant="outline" onClick={() => setEditing({ ...editing, options: [...editing.options, { id: emptyId, questionId: editing.id, text: "", scoreValue: null, isActive: true, sortOrder: editing.options.length + 1 }] })}>{t("Añadir opción")}</Button></div>}
          {editing.type === "num" && <>{(["unit", "minValue", "maxValue"] as const).map((field, i) => <label className="grid gap-1" key={field}>{t(["Unidad", "Mínimo", "Máximo"][i])}<Input disabled={busy} type={field === "unit" ? "text" : "number"} step="any" value={editing[field] ?? ""} onChange={e => setEditing({ ...editing, [field]: e.target.value === "" ? null : field === "unit" ? e.target.value : Number(e.target.value) })} /></label>)}</>}
          <div className="flex gap-2 sm:col-span-2"><Button disabled={busy} type="submit">{t("Guardar pregunta")}</Button><Button variant="outline" type="button" disabled={busy} onClick={() => setEditing(null)}>{t("Cancelar")}</Button></div>
        </form>}
      </section>}
    </DialogContent>
  </Dialog>;
}
