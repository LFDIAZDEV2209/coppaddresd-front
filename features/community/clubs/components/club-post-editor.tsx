"use client";

import { useState } from "react";
import { Send, FileText, CalendarClock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";
import type { ClubPostType, PostVisibility } from "../types";
import { createClubPost } from "../mock/clubs-api";

interface ClubPostEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubId: string;
  onSaved: () => void;
}

export function ClubPostEditorDialog({
  open,
  onOpenChange,
  clubId,
  onSaved,
}: ClubPostEditorDialogProps) {
  const t = useT();
  const [body, setBody] = useState("");
  const [type, setType] = useState<ClubPostType>("TEXTO");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLICO");
  const [pinned, setPinned] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setBody("");
    setType("TEXTO");
    setVisibility("PUBLICO");
    setPinned(false);
    setFeatured(false);
    setSchedule("");
    setPollQuestion("");
    setPollOptions("");
  };

  const save = async (asDraft: boolean) => {
    setSaving(true);
    const options = pollOptions
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    await createClubPost(clubId, {
      body: body.trim(),
      type,
      visibility,
      pinned,
      featured,
      scheduledFor: schedule ? new Date(schedule).toISOString() : null,
      draft: asDraft,
      poll:
        type === "ENCUESTA" && pollQuestion.trim() && options.length >= 2
          ? { question: pollQuestion.trim(), options }
          : undefined,
    });
    setSaving(false);
    reset();
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Nueva publicación")}</DialogTitle>
          <DialogDescription>
            {t(
              "Solo administradores y moderadores pueden publicar en el club.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("Contenido")} *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder={t("Escribe la publicación…")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Tipo")}</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v ?? "TEXTO") as ClubPostType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXTO">{t("Texto")}</SelectItem>
                  <SelectItem value="IMAGEN">{t("Imagen")}</SelectItem>
                  <SelectItem value="VIDEO">{t("Video")}</SelectItem>
                  <SelectItem value="ENCUESTA">{t("Encuesta")}</SelectItem>
                  <SelectItem value="ANUNCIO">{t("Anuncio")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Visibilidad")}</Label>
              <Select
                value={visibility}
                onValueChange={(v) =>
                  setVisibility((v ?? "PUBLICO") as PostVisibility)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLICO">
                    {t("Pública — visible para todos")}
                  </SelectItem>
                  <SelectItem value="PRIVADO">
                    {t("Privada — solo miembros")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "ENCUESTA" && (
            <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t("Pregunta de la encuesta")}</Label>
                <Input
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder={t("¿Qué prefieres?")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("Opciones (una por línea)")}</Label>
                <Textarea
                  value={pollOptions}
                  onChange={(e) => setPollOptions(e.target.value)}
                  rows={3}
                  placeholder={"Opción 1\nOpción 2"}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Programar para (opcional)")}</Label>
              <Input
                type="datetime-local"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Switch checked={pinned} onCheckedChange={setPinned} />
                {t("Fijar publicación")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Switch checked={featured} onCheckedChange={setFeatured} />
                {t("Destacar publicación")}
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !body.trim()}
            onClick={() => void save(true)}
          >
            <FileText data-icon="inline-start" />
            {t("Guardar borrador")}
          </Button>
          <Button
            size="sm"
            disabled={saving || !body.trim()}
            onClick={() => void save(false)}
          >
            {schedule ? (
              <CalendarClock data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            {schedule ? t("Programar") : t("Publicar")}
          </Button>
          {type === "ENCUESTA" && <BarChart3 className="hidden" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
