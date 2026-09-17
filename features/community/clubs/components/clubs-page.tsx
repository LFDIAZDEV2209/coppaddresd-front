"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Plus, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import type { Club, ClubVisibility } from "../types";
import { fetchClubs } from "../mock/clubs-api";
import { CommunityPagination } from "@/features/community/components/community-pagination";
import {
  CLUB_STATUS_COLORS,
  VISIBILITY_COLORS,
  categoryColor,
  clubCoverStyle,
  initials,
} from "./clubs-helpers";

export function ClubsPage() {
  const t = useT();
  const { can } = useAppContext();
  const canManage = can("Community.Manage");

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [visibility, setVisibility] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let active = true;
    fetchClubs({
      search: search || null,
      category: category === "all" ? null : category,
      visibility: visibility === "all" ? null : (visibility as ClubVisibility),
    }).then((data) => {
      if (active) {
        setClubs(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [search, category, visibility]);

  const categories = useMemo(
    () => Array.from(new Set(clubs.map((c) => c.category))).sort(),
    [clubs],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clubs.slice(start, start + pageSize);
  }, [clubs, page, pageSize]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Clubes")}
        description={t(
          "Crea y gestiona clubes temáticos de la comunidad Copp Adresd",
        )}
        icon={Users}
        actions={
          canManage ? (
            <Link
              href="/community/clubs/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus data-icon="inline-start" />
              {t("Nuevo club")}
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("Buscar clubes por nombre, descripción o etiqueta…")}
            className="pl-9"
          />
        </div>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("Categoría")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas las categorías")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {t(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={visibility}
          onValueChange={(v) => {
            setVisibility(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder={t("Visibilidad")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Todas")}</SelectItem>
            <SelectItem value="PUBLICO">{t("Público")}</SelectItem>
            <SelectItem value="PRIVADO">{t("Privado")}</SelectItem>
            <SelectItem value="INVITACION">{t("Solo invitación")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Clubes de la comunidad")}
          description={`${clubs.length} ${t("clubes encontrados")}`}
          icon={Users}
          variant="primary"
        />
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            {t("Cargando clubes…")}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Users className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("No se encontraron clubes con esos filtros")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Club")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Categoría")}
                </TableHead>
                <TableHead>{t("Visibilidad")}</TableHead>
                <TableHead className="text-right">{t("Miembros")}</TableHead>
                <TableHead>{t("Estado")}</TableHead>
                <TableHead className="w-12 text-right">{t("Abrir")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((club) => (
                <TableRow
                  key={club.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <TableCell className="py-2.5">
                    <Link
                      href={`/community/clubs/${club.id}`}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                        style={
                          club.coverUrl
                            ? {
                                backgroundImage: `url(${club.coverUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : clubCoverStyle(club.category)
                        }
                      >
                        {!club.coverUrl && initials(club.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {club.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {club.tags.slice(0, 3).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden py-2.5 md:table-cell">
                    <StatusBadge
                      status={t(club.category)}
                      color={categoryColor(club.category)}
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusBadge
                      status={t(visibilityLabel(club.visibility))}
                      color={VISIBILITY_COLORS[club.visibility]}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-sm font-bold">
                    {club.memberCount}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusBadge
                      status={t(
                        club.status === "ACTIVO" ? "Activo" : "Archivado",
                      )}
                      color={CLUB_STATUS_COLORS[club.status]}
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex justify-end">
                      <Link
                        href={`/community/clubs/${club.id}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "icon-sm",
                        })}
                        title={t("Abrir club")}
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <CommunityPagination
          page={page}
          pageSize={pageSize}
          total={clubs.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

function visibilityLabel(visibility: ClubVisibility): string {
  switch (visibility) {
    case "PUBLICO":
      return "Público";
    case "PRIVADO":
      return "Privado";
    case "INVITACION":
      return "Solo invitación";
  }
}
