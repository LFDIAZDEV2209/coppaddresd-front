"use client";

import { useEffect, useState } from "react";
import {
  CalendarPlus,
  MapPin,
  Video,
  Users,
  Clock,
  QrCode,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";
import type { ClubEvent, EventType } from "../types";
import {
  checkIn,
  confirmAttendance,
  createClubEvent,
  fetchClubEvents,
  joinWaitlist,
} from "../mock/clubs-api";
import { EVENT_TYPE_COLORS, formatDateTime } from "./clubs-helpers";

export function ClubEventsTab({
  clubId,
  canManage,
}: {
  clubId: string;
  canManage: boolean;
}) {
  const t = useT();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<ClubEvent | null>(null);

  const load = async () => {
    setEvents(await fetchClubEvents(clubId));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <SectionHeader
        title={t("Eventos del club")}
        description={`${events.length} ${t("eventos")}`}
        icon={CalendarPlus}
        variant="primary"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <CalendarPlus data-icon="inline-start" />
              {t("Nuevo evento")}
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          {t("Cargando eventos…")}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <CalendarPlus className="size-8 text-muted-foreground/50" />
          <p className="text-sm">{t("Este club aún no tiene eventos")}</p>
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold">{event.title}</h3>
                <StatusBadge
                  status={t(
                    event.status === "ABIERTO"
                      ? "Abierto"
                      : event.status === "LLENO"
                        ? "Lleno"
                        : event.status === "FINALIZADO"
                          ? "Finalizado"
                          : "Cancelado",
                  )}
                  color={
                    event.status === "ABIERTO"
                      ? {
                          bg: "var(--success-soft)",
                          text: "var(--success-foreground)",
                          dot: "var(--success-foreground)",
                        }
                      : event.status === "LLENO"
                        ? {
                            bg: "var(--warning-soft)",
                            text: "var(--warning-foreground)",
                            dot: "var(--warning)",
                          }
                        : {
                            bg: "var(--muted)",
                            text: "var(--muted-foreground)",
                            dot: "var(--muted-foreground)",
                          }
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {event.description}
              </p>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {formatDateTime(event.startsAt)}
                </span>
                {event.type === "PRESENCIAL" ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {event.location ?? t("Sin ubicación")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Video className="size-3.5" />
                    {event.meetingUrl ?? t("Enlace pendiente")}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {event.maxAttendees
                    ? `${event.confirmedCount}/${event.maxAttendees}`
                    : event.confirmedCount}{" "}
                  {t("confirmados")}
                  {event.waitlistCount > 0 &&
                    ` · ${event.waitlistCount} ${t("en espera")}`}
                </span>
              </div>
              {event.maxAttendees && (
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        event.confirmedCount >= event.maxAttendees
                          ? "h-full rounded-full bg-warning"
                          : "h-full rounded-full bg-primary"
                      }
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (event.confirmedCount / event.maxAttendees) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {Math.min(
                      100,
                      Math.round(
                        (event.confirmedCount / event.maxAttendees) * 100,
                      ),
                    )}
                    % {t("del cupo cubierto")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                <StatusBadge
                  status={t(
                    event.type === "PRESENCIAL" ? "Presencial" : "Virtual",
                  )}
                  color={EVENT_TYPE_COLORS[event.type]}
                />
                <div className="flex gap-2">
                  {event.status === "LLENO" &&
                    event.myAttendance !== "CONFIRMADO" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await joinWaitlist(event.id);
                          await load();
                        }}
                      >
                        {t("Lista de espera")}
                      </Button>
                    )}
                  {event.myAttendance === null &&
                    event.status !== "FINALIZADO" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await confirmAttendance(event.id);
                          await load();
                        }}
                      >
                        {t("Confirmar asistencia")}
                      </Button>
                    )}
                  {event.myAttendance === "CONFIRMADO" &&
                    event.status !== "FINALIZADO" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQrEvent(event)}
                        >
                          <QrCode data-icon="inline-start" />
                          {t("Check-in")}
                        </Button>
                        <Button size="sm" variant="ghost" disabled>
                          {t("Confirmado")}
                        </Button>
                      </>
                    )}
                  {event.myAttendance === "LISTA_ESPERA" && (
                    <Button size="sm" variant="ghost" disabled>
                      {t("En lista de espera")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateEventDialog
          clubId={clubId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      )}

      <Dialog
        open={qrEvent !== null}
        onOpenChange={(o) => {
          if (!o) setQrEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("Check-in del evento")}</DialogTitle>
            <DialogDescription>
              {t("QR simulado para el check-in presencial (mock).")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-44 items-center justify-center rounded-2xl border-4 border-border bg-muted">
              <QrCode className="size-32 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{qrEvent?.title}</p>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={async () => {
                if (!qrEvent) return;
                await checkIn(qrEvent.id);
                setQrEvent(null);
                await load();
              }}
            >
              {t("Registrar check-in")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateEventDialog({
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
  const [description, setDescription] = useState("");
  const [type, setType] = useState<EventType>("PRESENCIAL");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !startsAt) {
      setError(t("El título y la fecha de inicio son obligatorios"));
      return;
    }
    await createClubEvent(clubId, {
      title: title.trim(),
      description: description.trim(),
      type,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt
        ? new Date(endsAt).toISOString()
        : new Date(startsAt).toISOString(),
      location: type === "PRESENCIAL" ? location.trim() || null : null,
      meetingUrl: type === "VIRTUAL" ? meetingUrl.trim() || null : null,
      maxAttendees: maxAttendees ? Number(maxAttendees) : null,
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
          <DialogTitle>{t("Nuevo evento")}</DialogTitle>
          <DialogDescription>
            {t("Presencial con sede y check-in, o virtual con enlace.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("Título")} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Descripción")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("Tipo")}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "PRESENCIAL") as EventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENCIAL">{t("Presencial")}</SelectItem>
                <SelectItem value="VIRTUAL">{t("Virtual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("Inicio")} *</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("Fin")}</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          {type === "PRESENCIAL" ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t("Ubicación")}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("Sede o dirección")}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>{t("Enlace de reunión")}</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.example.com/…"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t("Capacidad máxima (opcional)")}</Label>
            <Input
              type="number"
              min={1}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
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
            {t("Crear evento")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
