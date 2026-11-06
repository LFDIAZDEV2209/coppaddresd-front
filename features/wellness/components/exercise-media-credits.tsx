"use client";
import { useT } from "@/providers/i18n-provider";
import type { MediaProvenance } from "@/features/media/types";

export function ExerciseMediaCredits({ provenance }: { provenance?: MediaProvenance | null }) {
  const t = useT();
  if (!provenance) return null;
  return <div className="flex flex-col gap-1 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
    <p className="font-medium text-foreground">{provenance.authorUrl ? <a href={provenance.authorUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{provenance.author}</a> : provenance.author || t("Autor no indicado por la fuente")}</p>
    <p>{provenance.title} · <a href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("Fuente original")}</a> · <a href={provenance.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{provenance.licenseName}</a></p>
    {provenance.derivativeSourceUrl && <a href={provenance.derivativeSourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t("Fuente de la obra original")}</a>}
    {provenance.changes && <p>{t("Cambios: {changes}", { changes: provenance.changes })}</p>}
    <p>{t("La licencia corresponde a esta demostración; no implica respaldo de su autor al programa.")}</p>
  </div>;
}
