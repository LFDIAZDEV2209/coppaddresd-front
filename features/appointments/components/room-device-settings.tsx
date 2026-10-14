"use client";

import { useEffect, useState } from "react";
import { Camera, Mic, Headphones, Settings2, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";

export function RoomDeviceSettings({ getTracks, version, disabled }: { getTracks: () => TwilioVideo.LocalTrack[]; version: number; disabled: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<TwilioVideo.LocalTrack[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState("");
  const [revision, setRevision] = useState(0);
  const outputSupported = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
  useEffect(() => {
    let active = true;
    const refresh = () => { void navigator.mediaDevices?.enumerateDevices().then((items) => { if (active) { setDevices(items); setTracks(getTracks()); } }).catch(() => { if (active) setError(t("No se pudieron cargar los dispositivos.")); }); };
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => { active = false; navigator.mediaDevices?.removeEventListener("devicechange", refresh); };
  }, [t, getTracks, version]);
  useEffect(() => {
    if (!output || !outputSupported) return;
    const apply = () => {
      document.querySelectorAll("audio").forEach((audio) => {
        void (audio as HTMLAudioElement & { setSinkId(id: string): Promise<void> }).setSinkId(output).catch(() => setError(t("No se pudo cambiar el dispositivo. Revisa sus permisos.")));
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [output, outputSupported, t]);
  const changeOutput = async (id: string) => {
    setBusy(true); setError("");
    const previous = output;
    const audioElements = Array.from(document.querySelectorAll("audio")) as (HTMLAudioElement & { setSinkId(id: string): Promise<void> })[];
    try {
      await Promise.all(audioElements.map((audio) => audio.setSinkId(id)));
      setOutput(id);
    } catch {
      await Promise.allSettled(audioElements.map((audio) => audio.setSinkId(previous)));
      setError(t("No se pudo cambiar el dispositivo. Revisa sus permisos."));
    } finally { setBusy(false); }
  };
  const change = async (kind: "audio" | "video", id: string) => {
    const track = tracks.find((item) => item.kind === kind && (item as TwilioVideo.LocalVideoTrack).name !== "screen");
    if (!track?.restart) return;
    setBusy(true); setError("");
    const enabled = track.isEnabled;
    try {
      await track.restart({ deviceId: { exact: id } });
      if (!enabled) track.disable();
    } catch { setError(t("No se pudo cambiar el dispositivo. Revisa sus permisos.")); }
    finally { setBusy(false); setRevision((value) => value + 1); }
  };
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} className="h-11 gap-2 rounded-full border border-border bg-background px-4">
      <Settings2 className="size-4" />{t("Dispositivos")}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-[24px] p-6 shadow-xl sm:max-w-[480px]">
        <DialogHeader className="gap-2 pr-6">
          <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
          <DialogTitle className="text-lg font-semibold">{t("Dispositivos de la consulta")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{t("Elige cómo te ven y te escuchan durante la consulta.")}</DialogDescription>
        </DialogHeader>
    <div className="grid gap-3 py-1" data-revision={revision}>
      {(["videoinput", "audioinput", "audiooutput"] as const).map((kind) => {
        const isOutput = kind === "audiooutput";
        const track = tracks.find((item) => item.kind === (kind === "videoinput" ? "video" : "audio") && (item as TwilioVideo.LocalVideoTrack).name !== "screen");
        const label = kind === "videoinput" ? t("Cámara") : isOutput ? t("Salida de audio") : t("Micrófono");
        const Icon = kind === "videoinput" ? Camera : isOutput ? Headphones : Mic;
        return <label key={kind} className="flex gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm font-medium">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-primary"><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="mb-2 block text-[13px] text-muted-foreground">{label}</span>
          <span className="relative block"><select className="h-11 w-full appearance-none truncate rounded-xl border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled || busy || (isOutput ? !outputSupported : !track?.restart)} value={isOutput ? output : track?.mediaStreamTrack?.getSettings().deviceId ?? ""} onChange={(event) => { if (isOutput) { void changeOutput(event.target.value); } else void change(kind === "videoinput" ? "video" : "audio", event.target.value); }}>
            <option value="" disabled>{t("Seleccionar dispositivo")}</option>
            {devices.filter((device) => device.kind === kind).map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `${label} ${index + 1}`}</option>)}
          </select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" /></span></span>
        </label>;
      })}
    </div>
    {!outputSupported && <p className="mt-3 text-sm text-muted-foreground">{t("Controla la salida de audio desde tu dispositivo.")}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          {busy && <Loader2 aria-label={t("Cargando")} className="size-4 animate-spin text-primary" />}
          <Button onClick={() => setOpen(false)} className="h-10 rounded-xl px-6">{t("Listo")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
