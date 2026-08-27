"use client";

import { useState } from "react";
import { Send, Plus, Link2, Trophy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import type { PostType } from "../types";

const TIPOS: { key: PostType; label: string }[] = [
  { key: "Texto", label: "Texto" },
  { key: "Imagen", label: "Imagen" },
  { key: "Video", label: "Video" },
  { key: "Encuesta", label: "Encuesta" },
  { key: "Logro", label: "Logro" },
];

export const DESTINOS = [
  "🌐 Todas las comunidades (284)",
  "🏥 Comunidad ADRED",
  "🏃 Reto caminata 30 días",
  "🧠 Apoyo emocional",
  "🥗 Cocina saludable",
  "😴 Solo inactivos",
];

export function PostDialog() {
  const t = useT();
  const { publishPost } = useErp();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>("Texto");
  const [destination, setDestination] = useState<string>("Todas las comunidades");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [push, setPush] = useState(false);
  const [giveXp, setGiveXp] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [logroTitle, setLogroTitle] = useState("");

  const buildBody = () => {
    const base = body.trim();
    if (type === "Imagen" && imageUrl.trim()) return `${base}${base ? "\n\n" : ""}🖼️ ${imageUrl.trim()}`;
    if (type === "Video" && videoUrl.trim()) return `${base}${base ? "\n\n" : ""}🎬 ${videoUrl.trim()}`;
    if (type === "Encuesta") {
      const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
      const poll = `${pollQuestion.trim() ? `📊 ${pollQuestion.trim()}\n` : ""}${opts.map((o, i) => `${i + 1}. ${o}`).join("\n")}`;
      return `${base}${base && poll ? "\n\n" : ""}${poll}`;
    }
    if (type === "Logro" && logroTitle.trim()) return `${base}${base ? "\n\n" : ""}🏆 ${logroTitle.trim()}`;
    return base;
  };

  const canPublish = buildBody().length > 0;

  const reset = () => {
    setBody("");
    setPinned(false);
    setPush(false);
    setGiveXp(false);
    setType("Texto");
    setDestination("Todas las comunidades");
    setImageUrl("");
    setVideoUrl("");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setLogroTitle("");
  };

  const confirm = () => {
    const finalBody = buildBody();
    if (!finalBody) return;
    publishPost({ type, destination, body: finalBody, pinned });
    setOpen(false);
    reset();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t("Nuevo post")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Nueva publicación")}</DialogTitle>
            <DialogDescription>
              {t("Crea una publicación para la comunidad.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Tipo")}</Label>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as PostType)}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {TIPOS.map((tip) => (
                  <label
                    key={tip.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5 transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-primary-soft/60 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary-soft"
                  >
                    <RadioGroupItem value={tip.key} />
                    <span className="text-sm">{tip.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("Destino")}</Label>
              <Select value={destination} onValueChange={(v) => { if (v !== null) setDestination(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINOS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("Mensaje")}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder={t("Escribe tu mensaje...")}
              />
            </div>

            {type === "Imagen" && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("URL de la imagen")}</Label>
                <div className="relative">
                  <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="pl-8 text-sm" />
                </div>
              </div>
            )}
            {type === "Video" && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("URL del video")}</Label>
                <div className="relative">
                  <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="pl-8 text-sm" />
                </div>
              </div>
            )}
            {type === "Encuesta" && (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3">
                <Label>{t("Pregunta de la encuesta")}</Label>
                <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder={t("¿Cuál es tu pregunta?")} className="text-sm" />
                <Label>{t("Opciones")}</Label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">{idx + 1}</span>
                    <Input value={opt} onChange={(e) => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} placeholder={`${t("Opción")} ${idx + 1}`} className="flex-1 text-sm" />
                    {pollOptions.length > 2 && (
                      <Button size="icon-sm" variant="ghost" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}><X className="size-3.5" /></Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <Button size="sm" variant="ghost" className="self-start text-xs" onClick={() => setPollOptions([...pollOptions, ""])}><Plus data-icon="inline-start" className="size-3" />{t("Añadir opción")}</Button>
                )}
              </div>
            )}
            {type === "Logro" && (
              <div className="flex flex-col gap-1.5">
                <Label>{t("Título del logro")}</Label>
                <div className="relative">
                  <Trophy className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={logroTitle} onChange={(e) => setLogroTitle(e.target.value)} placeholder={t("Ej: Racha de 30 días completada")} className="pl-8 text-sm" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(Boolean(c))} />
                <span className="text-sm">{t("Fijar al tope")}</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={push} onCheckedChange={(c) => setPush(Boolean(c))} />
                <span className="text-sm">{t("Notificación push")}</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={giveXp} onCheckedChange={(c) => setGiveXp(Boolean(c))} />
                <span className="text-sm">{t("Dar XP por comentar")}</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t("Cancelar")}
            </Button>
            <Button size="sm" onClick={confirm} disabled={!canPublish}>
              <Send data-icon="inline-start" />
              {t("Publicar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
