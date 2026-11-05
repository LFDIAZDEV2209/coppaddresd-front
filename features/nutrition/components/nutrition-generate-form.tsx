"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/providers/i18n-provider";
import type { NutritionClinicalProfile, NutritionGenerateInput } from "../types/nutrition";

export function NutritionGenerateForm({ profile, busy, onGenerate }: { profile: NutritionClinicalProfile; busy: boolean; onGenerate: (input: NutritionGenerateInput) => Promise<boolean> }) {
  const t = useT();
  const [weight, setWeight] = useState(String(profile.weightKg ?? ""));
  const [height, setHeight] = useState(String(profile.heightCm ?? ""));
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [sex, setSex] = useState(profile.sex ?? "");
  const today = new Date();
  const birth = new Date(`${birthDate}T12:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) age--;
  const valid = Number(weight) > 0 && Number(height) > 0 && Number.isFinite(age) && age >= 18 && age <= 120 && ["male", "female"].includes(sex);
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid && !busy) void onGenerate({ birthDate, manual: { peso: Number(weight), talla: Number(height), edad: age, sexo: sex === "female" ? "F" : "M" }, preserveConfirmedEdits: true }); }}>
    <p className="text-sm text-muted-foreground">{t("Confirma peso, talla, fecha de nacimiento y sexo. Los datos faltantes no se completan automáticamente.")}</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">{t("Datos mínimos para generar la propuesta")}</legend>
      <div><label htmlFor="nutrition-weight" className="nutrition-label">{t("Peso (kg)")}</label><Input id="nutrition-weight" type="number" required min="1" max="500" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} /></div>
      <div><label htmlFor="nutrition-height" className="nutrition-label">{t("Talla (cm)")}</label><Input id="nutrition-height" type="number" required min="50" max="250" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} /></div>
      <div><label htmlFor="nutrition-birth" className="nutrition-label">{t("Fecha de nacimiento")}</label><Input id="nutrition-birth" type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></div>
      <div><label htmlFor="nutrition-sex" className="nutrition-label">{t("Sexo")}</label><select id="nutrition-sex" required className="nutrition-select w-full" value={sex} onChange={(event) => setSex(event.target.value)}><option value="">{t("Selecciona una opción")}</option><option value="female">{t("Mujer")}</option><option value="male">{t("Hombre")}</option></select></div>
    </fieldset><Button type="submit" variant="outline" className="nutrition-ai-button" disabled={busy || !valid}><Sparkles aria-hidden="true" className="size-4" />{t("Generar propuesta con IA")}</Button>
  </form>;
}
