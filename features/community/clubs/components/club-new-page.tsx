"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import type { ClubVisibility } from "../types";
import { createClub } from "../mock/clubs-api";
import { CLUB_CATEGORIES } from "../mock/seeds";

const STEPS = [
  "Identidad",
  "Categoría",
  "Visibilidad",
  "Reglas y objetivos",
  "Equipo",
] as const;

const AVAILABLE_PROFILES = [
  { id: "m-3", name: "Carlos Andrés Pardo" },
  { id: "m-4", name: "Luisa Martínez" },
  { id: "m-5", name: "Andrés Felipe Gil" },
  { id: "m-6", name: "Valentina Ospina" },
  { id: "m-7", name: "Jorge Iván Salazar" },
];

interface WizardState {
  name: string;
  description: string;
  category: string;
  tags: string;
  visibility: ClubVisibility;
  maxMembers: string;
  rules: string;
  objectives: string;
  moderators: string[];
}

const INITIAL: WizardState = {
  name: "",
  description: "",
  category: "",
  tags: "",
  visibility: "PUBLICO",
  maxMembers: "",
  rules: "",
  objectives: "",
  moderators: [],
};

export function ClubNewPage() {
  const t = useT();
  const router = useRouter();
  const { can } = useAppContext();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const stepErrors = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) next.name = t("El nombre del club es obligatorio");
    }
    if (step === 1) {
      if (!form.category) next.category = t("Selecciona una categoría");
    }
    if (step === 2) {
      if (!form.visibility) next.visibility = t("Selecciona la visibilidad");
    }
    return next;
  };

  const canManage = can("Community.Manage");
  if (!canManage) {
    return (
      <div className="p-6">
        <PageHeader
          title={t("Nuevo club")}
          description={t("Sin permiso")}
          icon={Users}
        />
        <p className="text-sm text-muted-foreground">
          {t("Necesitas el permiso Community.Manage para crear clubes")}
        </p>
      </div>
    );
  }

  const next = () => {
    const errs = stepErrors();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    const club = await createClub({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      tags: form.tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      visibility: form.visibility,
      maxMembers: form.maxMembers ? Number(form.maxMembers) : null,
      rules: form.rules
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      objectives: form.objectives
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    });
    router.push(`/community/clubs/${club.id}`);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Nuevo club")}
        description={t("Crea un club temático para la comunidad ANTARES")}
        icon={Users}
      />

      {/* Indicador de pasos */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                i === step
                  ? "bg-primary text-white"
                  : i < step
                    ? "bg-primary-soft text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step && <Check className="size-3" />}
              {t(label)}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Nombre del club")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("Ej. Caminantes ADRES")}
              />
              {errors.name && (
                <span className="text-xs text-destructive">{errors.name}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Descripción")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder={t(
                  "¿De qué trata el club? ¿A quién está dirigido?",
                )}
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Categoría")} *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set("category", v ?? "")}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder={t("Selecciona…")} />
                </SelectTrigger>
                <SelectContent>
                  {CLUB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <span className="text-xs text-destructive">
                  {errors.category}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Etiquetas")}</Label>
              <Input
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder={t("caminata, pasos, reto (separadas por coma)")}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Visibilidad")} *</Label>
              <RadioGroup
                value={form.visibility}
                onValueChange={(v) => set("visibility", v as ClubVisibility)}
                className="flex flex-col gap-2"
              >
                {(
                  [
                    [
                      "PUBLICO",
                      t("Público — cualquiera puede unirse al instante"),
                    ],
                    [
                      "PRIVADO",
                      t("Privado — los interesados envían solicitud"),
                    ],
                    [
                      "INVITACION",
                      t("Solo invitación — se entra con enlace o QR"),
                    ],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 hover:bg-muted/50"
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </RadioGroup>
              {errors.visibility && (
                <span className="text-xs text-destructive">
                  {errors.visibility}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Capacidad máxima de miembros (opcional)")}</Label>
              <Input
                type="number"
                min={1}
                value={form.maxMembers}
                onChange={(e) => set("maxMembers", e.target.value)}
                placeholder={t("Sin límite")}
                className="w-full sm:w-56"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Reglas del club")}</Label>
              <Textarea
                value={form.rules}
                onChange={(e) => set("rules", e.target.value)}
                placeholder={t("Una regla por línea")}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Objetivos")}</Label>
              <Textarea
                value={form.objectives}
                onChange={(e) => set("objectives", e.target.value)}
                placeholder={t("Un objetivo por línea")}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Label>{t("Administradores y moderadores")}</Label>
            <p className="text-xs text-muted-foreground">
              {t(
                "Tú quedarás como administrador del club. Selecciona moderadores adicionales (opcional).",
              )}
            </p>
            <div className="flex flex-col gap-2">
              {AVAILABLE_PROFILES.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={form.moderators.includes(p.id)}
                    onCheckedChange={(checked) =>
                      set(
                        "moderators",
                        checked
                          ? [...form.moderators, p.id]
                          : form.moderators.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <span className="text-sm font-medium">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={back}
            disabled={step === 0}
          >
            <ArrowLeft data-icon="inline-start" />
            {t("Atrás")}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={next}>
              {t("Continuar")}
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={submitting}>
              <Sparkles data-icon="inline-start" />
              {submitting ? t("Creando…") : t("Crear club")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
