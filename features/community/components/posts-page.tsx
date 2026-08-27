"use client";

import { useState } from "react";
import {
  Send,
  Pin,
  Trash2,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Video,
  BarChart3,
  Trophy,
  Heart,
  MessageCircle,
  Eye,
  Edit,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { DESTINOS } from "./post-dialog";
import { PostDialog } from "./post-dialog";
import { MemberAvatar, profileName } from "./member-avatar";
import type { PostType } from "../types";

const TIPOS: { key: PostType; label: string; icon: typeof FileText }[] = [
  { key: "Texto", label: "Texto", icon: FileText },
  { key: "Imagen", label: "Imagen", icon: ImageIcon },
  { key: "Video", label: "Video", icon: Video },
  { key: "Encuesta", label: "Encuesta", icon: BarChart3 },
  { key: "Logro", label: "Logro", icon: Trophy },
];

const TYPE_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  Texto: { bg: "var(--info-soft)", text: "var(--info-foreground)" },
  Imagen: { bg: "var(--success-soft)", text: "var(--success-foreground)" },
  Video: { bg: "var(--primary-soft)", text: "var(--primary)" },
  Encuesta: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
  Logro: { bg: "var(--warning-soft)", text: "var(--warning-foreground)" },
};

export function PostsPage() {
  const t = useT();
  const { posts, publishPost, togglePin, deletePost, members } = useErp();
  const [type, setType] = useState<PostType>("Texto");
  const [destination, setDestination] = useState(DESTINOS[0]);
  const [body, setBody] = useState(
    "¡Felicitaciones a Carolina Mendoza por alcanzar 45 días de racha consecutiva! Desde el equipo ADRED queremos reconocer su increíble constancia. ¡Sigue brillando! 🏆",
  );
  const [pinned, setPinned] = useState(true);
  const [push, setPush] = useState(false);
  const [giveXp, setGiveXp] = useState(false);

  const pinnedPosts = posts.filter((p) => p.pinned);

  const handlePublish = () => {
    publishPost({ type, destination, body, pinned });
    setBody("");
    setPinned(false);
    setPush(false);
    setGiveXp(false);
  };

  const findMember = (authorId: string) =>
    members.find((m) => m.id === authorId);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Publicaciones")}
        description={t("Gestión de publicaciones de ANTARES Comunidad ADRED")}
        icon={Send}
        actions={<PostDialog />}
      />

      {/* Composer - Tarjeta ANTARES con color distintivo */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-strong)] shadow-lg shadow-primary/20">
        <div className="flex items-center gap-3 border-b border-white/15 px-4 py-3.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-[15px] font-extrabold text-white">
            A
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white">{t("Nuevo post")}</span>
            <span className="text-[12px] text-white/70">{t("El mensaje aparecerá en la app de los miembros")}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-4">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((tip) => {
              const Icon = tip.icon;
              return (
                <button
                  key={tip.key}
                  onClick={() => setType(tip.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    type === tip.key
                      ? "border-white bg-white text-primary"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t(tip.label)}
                </button>
              );
            })}
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="border-white/20 bg-white/10 text-sm text-white placeholder:text-white/50 focus-visible:ring-[#B8860B]"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap text-white/80">{t("Destino")}</Label>
              <Select value={destination} onValueChange={(v) => { if (v !== null) setDestination(v); }}>
                <SelectTrigger className="h-8 w-auto min-w-[180px] border-white/20 bg-white/10 text-xs text-white">
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

            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={pinned} onCheckedChange={(c) => setPinned(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Fijar al tope")}</span>
            </label>
            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={push} onCheckedChange={(c) => setPush(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Push notification")}</span>
            </label>
            <label className="flex items-center gap-2 text-white">
              <Checkbox checked={giveXp} onCheckedChange={(c) => setGiveXp(Boolean(c))} className="border-white/40" />
              <span className="text-xs">{t("Dar XP por comentar")}</span>
            </label>

            <Button size="sm" onClick={handlePublish} className="ml-auto bg-[#B8860B] text-white hover:bg-[#A06E0A]">
              <Send data-icon="inline-start" />
              {t("Publicar")}
            </Button>
          </div>
        </div>
      </div>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={t("Publicaciones fijadas")}
            description={`${pinnedPosts.length} ${t("publicaciones fijadas activas")}`}
            icon={Pin}
            variant="primary"
          />
          <div className="flex flex-col gap-3 p-4">
            {pinnedPosts.map((post) => {
              const member = findMember(post.authorId);
              const chipColor = TYPE_CHIP_COLORS[post.type] ?? TYPE_CHIP_COLORS.Texto;
              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 transition-all hover:shadow-sm"
                >
                  {member ? (
                    <MemberAvatar member={member} subtitle={post.createdAt} />
                  ) : (
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {profileName(post.author, post.isSystem, t).slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold">{profileName(post.author, post.isSystem, t)}</span>
                        <span className="truncate text-xs text-muted-foreground">{post.createdAt}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={t("Fijado")}
                        color={{ bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" }}
                      />
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: chipColor.bg, color: chipColor.text }}
                      >
                        {t(post.type)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {post.destination}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.body}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="size-3" /> {post.reactions}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="size-3" /> {post.comments}</span>
                      <span className="flex items-center gap-1"><Eye className="size-3" /> {post.views}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={() => togglePin(post.id)} title={t("Desfijar")}>
                      <Pin className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => {}} title={t("Editar")}>
                      <Edit className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => deletePost(post.id)} title={t("Eliminar")}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All posts */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Todas las publicaciones")}
          description={`${posts.length} ${t("publicaciones este mes")}`}
          icon={FileText}
          variant="primary"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Autor")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Tipo")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("Contenido")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Comunidad")}</TableHead>
              <TableHead className="text-right"><Heart className="size-3 inline" /></TableHead>
              <TableHead className="text-right"><MessageCircle className="size-3 inline" /></TableHead>
              <TableHead className="text-right hidden md:table-cell"><Eye className="size-3 inline" /></TableHead>
              <TableHead className="hidden md:table-cell">{t("Estado")}</TableHead>
              <TableHead className="w-10 text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const member = findMember(post.authorId);
              const chipColor = TYPE_CHIP_COLORS[post.type] ?? TYPE_CHIP_COLORS.Texto;
              return (
                <TableRow key={post.id}>
                  <TableCell>
                    {member ? (
                      <MemberAvatar member={member} subtitle="" />
                    ) : (
                      <span className="text-sm font-semibold">{profileName(post.author, post.isSystem, t)}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: chipColor.bg, color: chipColor.text }}
                    >
                      {t(post.type)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                    {post.body}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{post.destination}</TableCell>
                  <TableCell className="text-right text-xs">{post.reactions}</TableCell>
                  <TableCell className="text-right text-xs">{post.comments}</TableCell>
                  <TableCell className="hidden md:table-cell text-right text-xs">{post.views}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      {post.pinned ? (
                        <StatusBadge
                          status={t("Fijado")}
                          color={{ bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" }}
                        />
                      ) : (
                        <StatusBadge
                          status={t("Activo")}
                          color={{ bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }}
                        />
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => togglePin(post.id)}
                        title={post.pinned ? t("Desfijar") : t("Fijar")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pin className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => togglePin(post.id)}>
                            {post.pinned ? t("Desfijar") : t("Fijar")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => deletePost(post.id)}
                          >
                            {t("Eliminar")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
