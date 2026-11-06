"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ImageIcon, Video, Library, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { MediaPlayer } from "@/features/media/components/media-player";
import { getMediaItemById } from "@/features/media/services/media-service";
import { ExerciseMediaPicker } from "./exercise-media-picker";
import { ExerciseMediaCredits } from "./exercise-media-credits";
import { ExerciseYouTubePlayer } from "./exercise-youtube-player";
import { importExerciseMedia, searchExerciseMedia, canonicalYouTubeUrl, type ExerciseMediaPage, type ExerciseMediaCandidate } from "../services/exercise-media-service";
import type { MediaItem } from "@/features/media/types";

interface Props {
  value: string; youTubeUrl: string; exerciseName: string; disabled?: boolean;
  onChange: (mediaId: string, youTubeUrl: string) => void;
  onBusyChange: (busy: boolean) => void;
}
export function ExerciseSourcesPicker({value, youTubeUrl, exerciseName, disabled, onChange, onBusyChange}: Props) {
  const t = useT(), fieldId = useId();
  const { can } = useAppContext();
  const importController = useRef<AbortController | null>(null);
  useEffect(() => () => importController.current?.abort(), []);
  const [tab, setTab] = useState<string>(youTubeUrl ? "youtube" : "wger");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ExerciseMediaPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(youTubeUrl);
  const [imported, setImported] = useState<MediaItem | null>(null);
  const canBrowse = can("Media.View") && can("Wellness.View");
  const canImport = can("Media.Create") && can("Media.Publish") && can("Wellness.Manage");
  useEffect(() => {
    if (!value || !canBrowse) return;
    let active = true;
    getMediaItemById(value).then(item => { if (active) setImported(item); }).catch(() => {});
    return () => { active = false; };
  }, [value, canBrowse]);
  useEffect(() => {
    if (tab !== "wger" || !canBrowse) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchExerciseMedia(search, page, controller.signal).then(data => {
        if (!controller.signal.aborted) { setResult(data); setError(""); }
      }).catch(cause => { if (!controller.signal.aborted) { setResult(null); setError(cause instanceof Error ? cause.message : t("No se pudo consultar wger.")); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [tab, canBrowse, search, page, attempt, t]);
  const select = async (item: ExerciseMediaCandidate) => {
    setBusy(true); onBusyChange(true); setError("");
    importController.current = new AbortController();
    try { const media = await importExerciseMedia(item, importController.current.signal); setImported(media); onChange(media.id, ""); }
    catch (cause) { setError(cause instanceof Error ? t(cause.message) : t("No se pudo adjuntar la demostración.")); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-background p-4" aria-label={t("Demostración del ejercicio")}>
    <div><h4 className="text-sm font-semibold">{t("Demostración del ejercicio")}</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("Elige el movimiento exacto para este ejercicio. La demostración no cambia la indicación clínica.")}</p></div>
    {value && <p className="text-xs font-medium text-primary">{t("Hay un archivo adjunto. Se conservará hasta que elijas otra fuente.")}</p>}
    {imported?.id === value && tab !== "library" && <div className="flex w-full max-w-xl flex-col gap-2">
      <MediaPlayer key={value} storageKey={imported.storageKey} thumbnailKey={imported.thumbnailKey} mediaType={imported.mediaType} alt={exerciseName || imported.title} />
      <ExerciseMediaCredits provenance={imported.provenance} />
    </div>}
    {youTubeUrl && <ExerciseYouTubePlayer url={youTubeUrl} title={exerciseName} />}
    <Tabs value={tab} onValueChange={next => { if (!busy) { setTab(String(next)); setError(""); } }}>
      <TabsList className="h-auto w-full" aria-label={t("Fuente de la demostración")}>
        <TabsTrigger value="wger" disabled={disabled || busy}>wger</TabsTrigger>
        <TabsTrigger value="library" disabled={disabled || busy}><Library className="hidden size-4 sm:block" />{t("Mis archivos")}</TabsTrigger>
        <TabsTrigger value="youtube" disabled={disabled || busy}><LinkIcon className="hidden size-4 sm:block" />YouTube</TabsTrigger>
      </TabsList>
      <TabsContent value="wger" className="mt-3 flex flex-col gap-3">
        {canBrowse ? <>
          <Label htmlFor={`${fieldId}-wger`}>{t("Buscar en wger")}</Label>
          <Input id={`${fieldId}-wger`} placeholder={t("Ej. plancha, squat, lunge...")} value={search} disabled={disabled || busy} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("Catálogo gratuito con licencia por recurso. Si no encuentras el ejercicio en español, prueba su nombre en inglés.")}</p>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto" aria-busy={loading}>
            {loading ? <p role="status">{t("Consultando demostraciones...")}</p> : result?.items.map(item => <article key={`${item.kind}:${item.id}`} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">{item.kind === "Video" ? <Video aria-hidden className="size-4 shrink-0" /> : <ImageIcon aria-hidden className="size-4 shrink-0" />}<p className="text-sm font-medium">{item.title}</p></div>
              <p className="text-xs text-muted-foreground">{item.author || t("Autor no indicado por la fuente")} · {item.licenseName}</p>
              <a href={item.sourceUrl} className="w-fit text-xs underline underline-offset-4" target="_blank" rel="noopener noreferrer">{t("Revisar fuente original")}</a>
              <Button type="button" size="sm" variant="outline" disabled={disabled || busy || !canImport} onClick={() => void select(item)}>{t("Usar esta demostración")}</Button>
            </article>)}
          </div>
          {!loading && result?.items.length === 0 && <p className="text-xs text-muted-foreground">{t("No hay medios con créditos suficientes en esta página. Prueba otra búsqueda o la página siguiente.")}</p>}
          {result && <div className="flex items-center justify-between gap-2"><Button type="button" size="sm" variant="ghost" disabled={page === 1 || busy || loading} onClick={() => setPage(p => p - 1)}>{t("Anterior")}</Button><span className="text-xs">{t("Página {page}", { page: String(page) })}</span><Button type="button" size="sm" variant="ghost" disabled={!result.hasMore || busy || loading} onClick={() => setPage(p => p + 1)}>{t("Siguiente")}</Button></div>}
          {!canImport && <p className="text-xs text-muted-foreground">{t("Para importar necesitas permisos de crear, publicar medios y gestionar rutinas.")}</p>}
          {error && <Button type="button" variant="outline" size="sm" onClick={() => setAttempt(a => a + 1)}>{t("Reintentar")}</Button>}
        </> : <p>{t("Necesitas el permiso de biblioteca de medios para buscar demostraciones.")}</p>}
      </TabsContent>
      <TabsContent value="library" className="mt-3">
        <ExerciseMediaPicker value={value} exerciseName={exerciseName} disabled={disabled || busy} onChange={id => onChange(id, "")} onBusyChange={onBusyChange} />
      </TabsContent>
      <TabsContent value="youtube" className="mt-3 flex flex-col gap-3">
        <Label htmlFor={`${fieldId}-youtube`}>{t("Enlace de YouTube")}</Label>
        <Input id={`${fieldId}-youtube`} type="url" value={link} placeholder="https://www.youtube.com/watch?v=..." disabled={disabled || busy} onChange={e => setLink(e.target.value)} />
        <p className="text-xs leading-relaxed text-muted-foreground">{t("Se guarda el enlace y se usa el reproductor oficial. No descargamos ni almacenamos vídeos de YouTube. El propietario puede impedir su reproducción.")}</p>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={disabled || busy || !link.trim()} onClick={() => {
          const canonical = canonicalYouTubeUrl(link);
          if (!canonical) { setError(t("Usa un enlace válido de YouTube con HTTPS.")); return; }
          setError(""); setLink(canonical); onChange("", canonical);
        }}>{t("Usar enlace")}</Button>{youTubeUrl && <Button type="button" size="sm" variant="outline" disabled={disabled || busy} onClick={() => { setLink(""); onChange("", ""); }}>{t("Quitar demostración")}</Button>}</div>
      </TabsContent>
    </Tabs>
    <p className="text-xs leading-relaxed text-muted-foreground">{t("La cuota diaria se aplica por cuenta. Reutilizar un archivo de la biblioteca evita subir otra copia.")}</p>
    {busy && <p role="status" className="text-xs text-primary">{t("Preparando la copia en segundo plano. Puede tardar unos minutos; después estará en Mis archivos.")}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </section>;
}
