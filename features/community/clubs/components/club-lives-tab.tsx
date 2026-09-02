"use client";

import { useEffect, useState } from "react";
import { Radio, CalendarPlus, Mic2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/feedback/status-badge";
import { SectionHeader } from "@/components/layout/section-header";
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
import { useT } from "@/providers/i18n-provider";
import type { LiveSession } from "../types";
import {
  fetchClubLiveSessions,
  scheduleLive,
  sendLiveChatMessage,
} from "../mock/clubs-api";
import { LIVE_STATUS_COLORS, formatDateTime, initials } from "./clubs-helpers";

export function ClubLivesTab({
  clubId,
  canManage,
}: {
  clubId: string;
  canManage: boolean;
}) {
  const t = useT();
  const [lives, setLives] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeLive, setActiveLive] = useState<LiveSession | null>(null);
  const [draft, setDraft] = useState("");

  const load = async () => {
    setLives(await fetchClubLiveSessions(clubId));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const send = async () => {
    if (!activeLive || !draft.trim()) return;
    await sendLiveChatMessage(activeLive.id, draft.trim());
    setDraft("");
    const updated = await fetchClubLiveSessions(clubId);
    setLives(updated);
    setActiveLive(updated.find((l) => l.id === activeLive.id) ?? null);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Transmisiones en vivo")}
        description={`${lives.length} ${t("lives")}`}
        icon={Radio}
        variant="primary"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <CalendarPlus data-icon="inline-start" />
              {t("Programar live")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          {t("Cargando lives…")}
        </div>
      ) : lives.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Radio className="size-8 text-muted-foreground/50" />
          <p className="text-sm">{t("Este club aún no tiene lives")}</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {lives.map((live) => (
            <div
              key={live.id}
              className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center justify-center gap-2 py-10">
                {live.status === "ACTIVO" ? (
                  <>
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex size-3 rounded-full bg-destructive" />
                    </span>
                    <span className="text-sm font-black uppercase tracking-widest text-destructive">
                      {t("En vivo")}
                    </span>
                  </>
                ) : (
                  <>
                    <Radio
                      className={
                        live.status === "PROGRAMADO"
                          ? "size-8 text-warning"
                          : "size-8 text-muted-foreground"
                      }
                    />
                    <span
                      className={
                        live.status === "PROGRAMADO"
                          ? "text-sm font-black uppercase tracking-widest text-warning"
                          : "text-sm font-black uppercase tracking-widest text-muted-foreground"
                      }
                    >
                      {live.status === "PROGRAMADO"
                        ? t("Programado")
                        : t("Live ANTARES")}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2 p-4 pt-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{live.title}</h3>
                  <StatusBadge
                    status={t(
                      live.status === "ACTIVO"
                        ? "En vivo"
                        : live.status === "PROGRAMADO"
                          ? "Programado"
                          : live.status === "FINALIZADO"
                            ? "Finalizado"
                            : "Cancelado",
                    )}
                    color={LIVE_STATUS_COLORS[live.status]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(live.scheduledStartAt)}
                </p>
                {live.speakers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mic2 className="size-3.5" />
                    {live.speakers.map((s) => s.displayName).join(", ")}
                  </div>
                )}
                {live.status === "ACTIVO" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveLive(live);
                      setDraft("");
                    }}
                  >
                    <Radio data-icon="inline-start" />
                    {t("Entrar al live")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de live activo con chat */}
      <Dialog
        open={activeLive !== null}
        onOpenChange={(o) => {
          if (!o) setActiveLive(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("En vivo")}: {activeLive?.title}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Transmisión estilo broadcast — cualquiera puede unirse y usar el chat (mock).",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex aspect-video items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-destructive/20 via-muted/40 to-muted">
            <Radio className="size-10 text-destructive" />
            <span className="text-sm font-black uppercase tracking-widest text-destructive">
              {t("En transmisión")}
            </span>
          </div>
          <div className="flex h-48 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-muted/40 p-3">
            {activeLive?.chat.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("Aún no hay mensajes en el chat")}
              </p>
            ) : (
              activeLive?.chat.map((message) => (
                <div key={message.id} className="flex items-start gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                    {initials(message.sender.displayName)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-xs font-semibold">
                      {message.sender.displayName}
                    </span>
                    <span className="text-xs text-foreground/90">
                      {message.body}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("Escribe un mensaje…")}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
            />
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={!draft.trim()}
              title={t("Enviar")}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {createOpen && (
        <ScheduleLiveDialog
          clubId={clubId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ScheduleLiveDialog({
  clubId,
  onClose,
  onSaved,
}: {
  clubId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !scheduledStartAt) {
      setError(t("El título y la fecha son obligatorios"));
      return;
    }
    await scheduleLive(clubId, {
      title: title.trim(),
      scheduledStartAt: new Date(scheduledStartAt).toISOString(),
      speakers: speakers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(() => "m-3"),
    });
    onSaved();
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Programar live")}</DialogTitle>
          <DialogDescription>
            {t("Los espectadores podrán unirse libremente y usar el chat.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("Título")} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Fecha y hora")} *</Label>
            <Input
              type="datetime-local"
              value={scheduledStartAt}
              onChange={(e) => setScheduledStartAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Ponentes")}</Label>
            <Input
              value={speakers}
              onChange={(e) => setSpeakers(e.target.value)}
              placeholder={t("Nombres separados por coma")}
            />
          </div>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("Cancelar")}
          </Button>
          <Button size="sm" onClick={save}>
            <CalendarPlus data-icon="inline-start" />
            {t("Programar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
