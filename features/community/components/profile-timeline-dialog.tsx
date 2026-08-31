"use client";

import { useEffect } from "react";
import { Repeat, Heart, MessageCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import type { TimelineEntry } from "../types";
import { MemberAvatar } from "./member-avatar";

/** Icono de tipo de publicación (simplificado). */
function PostTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Imagen":
      return <span className="text-[10px]">🖼</span>;
    case "Video":
      return <span className="text-[10px]">🎬</span>;
    case "Encuesta":
      return <span className="text-[10px]">📊</span>;
    case "Logro":
      return <span className="text-[10px]">🏆</span>;
    default:
      return <span className="text-[10px]">💬</span>;
  }
}

function TimelineCard({
  entry,
  t,
}: {
  entry: TimelineEntry;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30">
      {/* Cabecera: autor + badge repost si aplica */}
      <div className="flex items-center gap-2">
        <MemberAvatar
          member={{
            id: entry.authorId,
            firstName: entry.author.split(" ")[0] ?? "",
            lastName: entry.author.split(" ").slice(1).join(" ") || "",
            streak: 0,
            isSystem: entry.isSystem,
          }}
          subtitle=""
        />
        <div className="flex flex-1 items-center gap-1.5">
          <PostTypeIcon type={entry.type} />
          <span className="text-[10px] text-muted-foreground">
            {entry.createdAtDisplay}
          </span>
          {entry.destination && (
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              · {entry.destination}
            </span>
          )}
        </div>
        {entry.isRepost && (
          <Badge
            variant="secondary"
            className="flex items-center gap-1 bg-violet-100 text-[10px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
          >
            <Repeat className="size-2.5" />
            {t("Reposteado")}
          </Badge>
        )}
      </div>

      {/* Cuerpo */}
      <p className="line-clamp-4 text-xs leading-relaxed text-foreground/90">
        {entry.body}
      </p>

      {/* Imagen (si existe) */}
      {entry.imageUrl && (
        <div className="mt-1 overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.imageUrl}
            alt=""
            className="h-32 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Métricas */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <Heart className="size-3" /> {entry.reactions}
        </span>
        <span className="flex items-center gap-0.5">
          <MessageCircle className="size-3" /> {entry.comments}
        </span>
        <span className="flex items-center gap-0.5">
          <Eye className="size-3" /> {entry.views}
        </span>
        {entry.reposts > 0 && (
          <span className="flex items-center gap-0.5">
            <Repeat className="size-3" /> {entry.reposts}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProfileTimelineDialog({
  open,
  onOpenChange,
  profileId,
  profileName: name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName: string;
}) {
  const t = useT();
  const { profileTimeline, profileTimelineLoading, fetchProfileTimeline } =
    useErp();

  useEffect(() => {
    if (open && profileId) {
      fetchProfileTimeline(profileId);
    }
  }, [open, profileId, fetchProfileTimeline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Repeat className="size-4 text-violet-500" />
            {t("Timeline de")} {name}
          </DialogTitle>
        </DialogHeader>

        {profileTimelineLoading ? (
          <div className="flex flex-col gap-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : profileTimeline.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {t("Sin publicaciones")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {profileTimeline.map((entry) => (
              <TimelineCard key={entry.id} entry={entry} t={t} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
