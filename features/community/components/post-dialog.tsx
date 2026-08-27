"use client";

import { useState } from "react";
import { Send, Plus } from "lucide-react";
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
  const [body, setBody] = useState(
    "¡Felicitaciones a toda la comunidad por el increíble progreso de esta semana! 🎉",
  );
  const [pinned, setPinned] = useState(false);
  const [push, setPush] = useState(false);
  const [giveXp, setGiveXp] = useState(false);

  const confirm = () => {
    publishPost({ type, destination, body, pinned });
    setOpen(false);
    setBody("");
    setPinned(false);
    setPush(false);
    setGiveXp(false);
    setType("Texto");
    setDestination("Todas las comunidades");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t("Nuevo post")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
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
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5"
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
              />
            </div>

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
            <Button size="sm" onClick={confirm}>
              <Send data-icon="inline-start" />
              {t("Publicar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
