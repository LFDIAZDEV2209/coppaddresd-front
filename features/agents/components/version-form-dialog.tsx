"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  Sparkles,
  LoaderCircle,
  UploadCloud,
  FileText,
  X,
  BookOpen,
  Settings2,
  BrainCircuit,
  Wrench,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AgentRuntimeConfigForm, KnowledgeBase } from "../types";
import {
  parseRuntimeConfig,
  toRuntimeConfigJson,
  emptyRuntimeConfig,
  MODEL_OPTIONS,
  TOOL_OPTIONS,
  MEMORY_CATEGORIES,
} from "../services/version-config-utils";

interface VersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  /** Versión existente en edición (o null para crear). */
  initialConfig?: string | null;
  /** Knowledge bases disponibles para vincular al RAG del agente. */
  knowledgeBases: KnowledgeBase[];
  /** Sube el .md de instrucciones y devuelve el storageKey. */
  onCreate: (configJson: string, notes?: string | null) => Promise<void>;
  onUploadInstructions: (
    file: File,
  ) => Promise<{ knowledgeBaseId: string; storageKey: string; fileName: string }>;
}

export function VersionFormDialog({
  open,
  onOpenChange,
  saving,
  initialConfig,
  knowledgeBases,
  onCreate,
  onUploadInstructions,
}: VersionFormDialogProps) {
  const [form, setForm] = useState<AgentRuntimeConfigForm>(() =>
    initialConfig ? parseRuntimeConfig(initialConfig) : emptyRuntimeConfig(),
  );
  const [notes, setNotes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedJson, setAdvancedJson] = useState<string>(() =>
    initialConfig
      ? parseRuntimeConfig(initialConfig).systemPrompt
        ? JSON.stringify(JSON.parse(initialConfig), null, 2)
        : toRuntimeConfigJson(emptyRuntimeConfig())
      : toRuntimeConfigJson(emptyRuntimeConfig()),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [uploadingInstructions, setUploadingInstructions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const update = <K extends keyof AgentRuntimeConfigForm>(
    field: K,
    value: AgentRuntimeConfigForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (showAdvanced) setAdvancedJson(toRuntimeConfigJson({ ...form, [field]: value }));
  };

  const toggleTool = (tool: string) => {
    update(
      "tools",
      form.tools.includes(tool)
        ? form.tools.filter((t) => t !== tool)
        : [...form.tools, tool],
    );
  };

  const toggleKb = (kbId: string) => {
    update(
      "knowledgeBaseIds",
      form.knowledgeBaseIds.includes(kbId)
        ? form.knowledgeBaseIds.filter((id) => id !== kbId)
        : [...form.knowledgeBaseIds, kbId],
    );
  };

  const handleInstructionsFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".md") && !selected.name.toLowerCase().endsWith(".txt")) {
      setValidationError("Las instrucciones deben ser un archivo .md o .txt.");
      return;
    }
    setValidationError(null);
    setInstructionsFile(selected);
  };

  const clearInstructions = () => {
    setInstructionsFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let configJson: string;
    if (showAdvanced) {
      try {
        JSON.parse(advancedJson);
      } catch {
        setValidationError("La configuración avanzada debe ser JSON válido.");
        return;
      }
      configJson = advancedJson;
    } else {
      if (!form.systemPrompt.trim()) {
        setValidationError("Escribí una descripción del agente (instrucciones) para continuar.");
        return;
      }
      configJson = toRuntimeConfigJson(form);
    }

    // Si hay instrucciones .md pendientes, primero se suben a la KB del agente
    // y se vinculan al RAG, después se crea la versión con esa config.
    if (instructionsFile) {
      try {
        setUploadingInstructions(true);
        const { knowledgeBaseId } = await onUploadInstructions(instructionsFile);
        const parsed = JSON.parse(configJson) as Record<string, unknown>;
        const retrieval = (parsed.retrieval_config as Record<string, unknown>) ?? {};
        const kbIds = Array.isArray(retrieval.knowledge_base_ids)
          ? (retrieval.knowledge_base_ids as string[])
          : [];
        if (!kbIds.includes(knowledgeBaseId)) kbIds.push(knowledgeBaseId);
        retrieval.enabled = true;
        retrieval.knowledge_base_ids = kbIds;
        parsed.retrieval_config = retrieval;
        configJson = JSON.stringify(parsed, null, 2);
      } catch {
        setValidationError("No se pudo subir el documento de instrucciones.");
        return;
      } finally {
        setUploadingInstructions(false);
      }
    }

    setValidationError(null);
    await onCreate(configJson, notes.trim() || null);
    setNotes("");
    clearInstructions();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] min-w-[760px] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>Nueva versión del agente</DialogTitle>
              <DialogDescription>
                Configurá el comportamiento sin tocar código: instrucciones, modelo y herramientas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-5 px-6 py-5">
          {/* --- Instrucciones (system prompt) --- */}
          <Section
            icon={BrainCircuit}
            title="Instrucciones del agente"
            description="Definen la personalidad y cómo responde. Podés escribirlas o subirlas como documento."
          >
            <Field label="Instrucciones (prompt del sistema)">
              <textarea
                className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={form.systemPrompt}
                onChange={(event) => update("systemPrompt", event.target.value)}
                placeholder="Ej. Sos un asistente de citas médicas de CoppAddresd. Ayudás a agendar, reprogramar y recordar turnos con amabilidad."
                disabled={saving || uploadingInstructions}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <Label>O subí tus instrucciones como documento (.md)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt"
                className="hidden"
                onChange={handleInstructionsFile}
                disabled={saving || uploadingInstructions}
              />
              {instructionsFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <FileText className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{instructionsFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Se indexará con RAG y quedará disponible para el agente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={clearInstructions}
                    aria-label="Quitar documento de instrucciones"
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
                >
                  <UploadCloud className="size-4.5" />
                  Subir documento de instrucciones (.md)
                </button>
              )}
            </div>

            <Field label="Contexto adicional (opcional)">
              <textarea
                className="min-h-16 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={form.extraPrompt ?? ""}
                onChange={(event) => update("extraPrompt", event.target.value || null)}
                placeholder="Ej. Reglas extra que siempre debe recordar, sin estar en un documento."
                disabled={saving || uploadingInstructions}
              />
            </Field>
          </Section>

          {/* --- Modelo --- */}
          <Section
            icon={Settings2}
            title="Modelo de IA"
            description="Qué modelo responde. El predeterminado del servicio es la opción segura."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modelo">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  value={form.model ?? ""}
                  onChange={(event) => update("model", event.target.value || null)}
                  disabled={saving || uploadingInstructions}
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value || "default"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Temperatura (creatividad)">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={form.temperature ?? 0.2}
                    onChange={(event) => update("temperature", Number(event.target.value))}
                    className="flex-1 accent-primary"
                    disabled={saving || uploadingInstructions}
                  />
                  <Badge variant="secondary" className="w-12 justify-center">
                    {form.temperature ?? 0.2}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  0 = preciso y repetitivo · 1 = creativo y variado
                </p>
              </Field>
            </div>
          </Section>

          {/* --- Herramientas --- */}
          <Section
            icon={Wrench}
            title="Herramientas disponibles"
            description="Capacidades extra que el agente puede usar durante la conversación."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {TOOL_OPTIONS.map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  onClick={() => toggleTool(tool.value)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    form.tools.includes(tool.value)
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-muted"
                  }`}
                  disabled={saving || uploadingInstructions}
                >
                  <span
                    className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${
                      form.tools.includes(tool.value)
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {form.tools.includes(tool.value) && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium">{tool.label}</span>
                    <span className="text-[11.5px] text-muted-foreground">{tool.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* --- Conocimiento (RAG) --- */}
          <Section
            icon={BookOpen}
            title="Conocimiento (documentos)"
            description="Vinculá knowledge bases para que el agente responda con su contenido."
          >
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Usar conocimiento de documentos</span>
                <span className="text-xs text-muted-foreground">
                  El agente consulta las bases seleccionadas antes de responder.
                </span>
              </div>
              <Switch
                checked={form.ragEnabled}
                onCheckedChange={(checked) => update("ragEnabled", checked)}
                disabled={saving || uploadingInstructions}
                aria-label="Usar conocimiento de documentos"
              />
            </div>

            {form.ragEnabled && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>Knowledge bases vinculadas</Label>
                  {knowledgeBases.length === 0 ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-[12.5px] text-muted-foreground">
                      No hay knowledge bases todavía. Creá una en la pestaña Conocimiento.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {knowledgeBases.map((kb) => (
                        <button
                          key={kb.id}
                          type="button"
                          onClick={() => toggleKb(kb.id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors ${
                            form.knowledgeBaseIds.includes(kb.id)
                              ? "border-primary bg-primary-soft"
                              : "border-border hover:bg-muted"
                          }`}
                          disabled={saving || uploadingInstructions}
                        >
                          <span
                            className={`size-2 shrink-0 rounded-full ${
                              kb.scope === "Global" ? "bg-emerald-500" : "bg-violet-500"
                            }`}
                          />
                          <span className="truncate font-medium">{kb.name}</span>
                          <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                            {kb.documentCount} doc
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Field label="Cantidad de fragmentos a consultar (top-k)">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.topK}
                    onChange={(event) => update("topK", Number(event.target.value) || 5)}
                    className="w-28"
                    disabled={saving || uploadingInstructions}
                  />
                </Field>
              </>
            )}
          </Section>

          {/* --- Memoria --- */}
          <Section
            icon={BrainCircuit}
            title="Memoria del usuario"
            description="Recordá preferencias y datos del paciente entre conversaciones."
          >
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Guardar memoria del paciente</span>
                <span className="text-xs text-muted-foreground">
                  Extrae hechos de la conversación y los reutiliza después.
                </span>
              </div>
              <Switch
                checked={form.memoryEnabled}
                onCheckedChange={(checked) => update("memoryEnabled", checked)}
                disabled={saving || uploadingInstructions}
                aria-label="Guardar memoria del paciente"
              />
            </div>

            {form.memoryEnabled && (
              <div className="flex flex-col gap-1.5">
                <Label>Categorías a recordar</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MEMORY_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        update(
                          "memoryCategories",
                          form.memoryCategories.includes(category)
                            ? form.memoryCategories.filter((c) => c !== category)
                            : [...form.memoryCategories, category],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                        form.memoryCategories.includes(category)
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                      disabled={saving || uploadingInstructions}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          <Field label="Notas de la versión (opcional)">
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej. Primera versión con memoria de preferencias"
              disabled={saving || uploadingInstructions}
            />
          </Field>

          {/* --- Avanzado (JSON) --- */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit text-muted-foreground"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? (
                <EyeOff data-icon="inline-start" className="size-4" />
              ) : (
                <Eye data-icon="inline-start" className="size-4" />
              )}
              {showAdvanced ? "Ocultar configuración avanzada" : "Ver configuración avanzada (JSON)"}
            </Button>
            {showAdvanced && (
              <textarea
                className="min-h-44 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={advancedJson}
                onChange={(event) => {
                  setAdvancedJson(event.target.value);
                  try {
                    setForm(parseRuntimeConfig(event.target.value));
                  } catch {
                    // JSON inválido en edición manual: se valida al guardar.
                  }
                }}
                disabled={saving || uploadingInstructions}
              />
            )}
          </div>

          {validationError && (
            <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive" role="alert">
              {validationError}
            </p>
          )}

          <DialogFooter className="-mx-6 -mb-5 px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploadingInstructions}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploadingInstructions}>
              {uploadingInstructions ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  Indexando instrucciones...
                </>
              ) : saving ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  Creando versión...
                </>
              ) : (
                "Crear versión"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-background/40 p-4">
      <legend className="flex items-center gap-2 px-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[13px] font-semibold">{title}</span>
      </legend>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-muted-foreground">{description}</p>
        {children}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
