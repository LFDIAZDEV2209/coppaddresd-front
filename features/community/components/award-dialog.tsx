"use client";

import { useState } from "react";
import {
  Trophy,
  Award,
  Gift,
  Star,
  Pill,
  Send,
} from "lucide-react";
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
import { profileName } from "./member-avatar";

const TIPOS = [
  { key: "Puntos XP", label: "Puntos XP", icon: Trophy },
  { key: "Racha destacada", label: "Racha destacada", icon: Award },
  { key: "Cofre especial", label: "Cofre especial", icon: Gift },
  { key: "Miembro del mes", label: "Miembro del mes", icon: Star },
  { key: "Adherencia perfecta", label: "Adherencia perfecta", icon: Pill },
];

export function AwardDialog() {
  const t = useT();
  const { members, awardXp } = useErp();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("Puntos XP");
  const [xp, setXp] = useState<number>(150);
  const [message, setMessage] = useState("");
  const [publish, setPublish] = useState(true);

  const confirm = () => {
    awardXp({ memberId, typeLabel: tipo, xp, message, publishInFeed: publish });
    setOpen(false);
    setMessage("");
    setXp(150);
    setTipo("Puntos XP");
    setMemberId("all");
    setPublish(true);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Trophy data-icon="inline-start" />
        {t("Dar puntos")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Otorgar reconocimiento")}</DialogTitle>
            <DialogDescription>
              {t("Envía XP o un reconocimiento a un miembro o a toda la comunidad.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Miembro")}</Label>
              <Select value={memberId} onValueChange={(v) => { if (v !== null) setMemberId(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Selecciona un miembro")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Todos los de la comunidad")}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {profileName(`${m.firstName} ${m.lastName}`, m.isSystem, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("Tipo de reconocimiento")}</Label>
              <RadioGroup value={tipo} onValueChange={setTipo} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPOS.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <label
                      key={tip.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2.5 transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-primary-soft/60 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary-soft"
                    >
                      <RadioGroupItem value={tip.key} />
                      <Icon className="size-4 text-primary" />
                      <span className="text-sm">{t(tip.label)}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("Cantidad de XP")}</Label>
              <Input
                type="number"
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("Mensaje personalizado")}</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("Escribe un mensaje de reconocimiento...")}
              />
            </div>

            <label className="flex items-center gap-2">
              <Checkbox
                checked={publish}
                onCheckedChange={(c) => setPublish(Boolean(c))}
              />
              <span className="text-sm">{t("Publicar en el feed")}</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t("Cancelar")}
            </Button>
            <Button size="sm" onClick={confirm}>
              <Send data-icon="inline-start" />
              {t("Confirmar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
