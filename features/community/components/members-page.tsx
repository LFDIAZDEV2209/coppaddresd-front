"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Send,
  Trophy,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import { mockDiagnostics, mockRegions } from "../mock-data";
import { MemberAvatar } from "./member-avatar";
import { LevelBadge } from "./level-badge";
import { AwardDialog } from "./award-dialog";
import { CommunityPagination } from "./community-pagination";

export function MembersPage() {
  const t = useT();
  const { members, sendMessage, toast, membersLoading, membersError } = useErp();
  const [diagFilter, setDiagFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsPageSize, setCardsPageSize] = useState(10);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (diagFilter !== "all" && m.diagnosis !== diagFilter) return false;
      if (regionFilter !== "all" && m.region !== regionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${m.firstName} ${m.lastName}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [members, diagFilter, regionFilter, search]);

  const activeMembers = filtered.filter((m) => m.status === "Activo");

  const paginatedCards = useMemo(() => {
    const start = (cardsPage - 1) * cardsPageSize;
    return activeMembers.slice(start, start + cardsPageSize);
  }, [activeMembers, cardsPage, cardsPageSize]);

  const paginatedTable = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filtered.slice(start, start + tablePageSize);
  }, [filtered, tablePage, tablePageSize]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Miembros")}
        description={`${members.length} ${t("miembros en ANTARES Comunidad ADRED")}`}
        icon={Users}
        actions={<AwardDialog />}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Select value={diagFilter} onValueChange={(v) => { if (v !== null) { setDiagFilter(v); setCardsPage(1); setTablePage(1); } }}>
            <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
              <SelectValue placeholder={t("Filtrar por diagnóstico")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todos los diagnósticos")}</SelectItem>
              {mockDiagnostics.map((d) => (
                <SelectItem key={d.diagnosis} value={d.diagnosis}>
                  {d.diagnosis}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={(v) => { if (v !== null) { setRegionFilter(v); setCardsPage(1); setTablePage(1); } }}>
            <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs">
              <SelectValue placeholder={t("Filtrar por región")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Todas las regiones")}</SelectItem>
              {mockRegions.map((r) => (
                <SelectItem key={r.region} value={r.region}>
                  {r.region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCardsPage(1); setTablePage(1); }}
            placeholder={t("Buscar miembro...")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Active member cards — paginadas */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader title={t("Miembros activos")} description={`${activeMembers.length} ${t("miembros")}`} icon={Users} variant="primary" />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginatedCards.map((m) => (
            <div
              key={m.id}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-lg hover:shadow-black/5"
            >
              <MemberAvatar member={m} showStreak />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {m.diagnosis} · {m.region} · {t("Semana")} {m.week}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">{m.posts}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">{t("Posts")}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">{(m.xp / 1000).toFixed(0)}K</span>
                  <span className="text-[9px] uppercase text-muted-foreground">XP</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">{m.streak}🔥</span>
                  <span className="text-[9px] uppercase text-muted-foreground">{t("Racha")}</span>
                </div>
              </div>
              <LevelBadge level={m.level} />
              {m.topRank && (
                <StatusBadge
                  status={`TOP ${m.topRank}`}
                  color={{ bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" }}
                />
              )}
              <div className="flex w-full gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    sendMessage(m.id, t("¡Hola! Nos gustaría saber de ti 💙"));
                    toast(t("Mensaje enviado"));
                  }}
                >
                  <Send data-icon="inline-start" />
                  {t("Mensaje")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => toast(t("Premio enviado a") + " " + m.firstName)}
                >
                  <Trophy data-icon="inline-start" />
                  {t("Premiar")}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {activeMembers.length === 0 && (
          <p className="pb-6 text-center text-sm text-muted-foreground">{t("No hay miembros que coincidan con el filtro")}</p>
        )}
        {activeMembers.length > 0 && (
          <CommunityPagination page={cardsPage} pageSize={cardsPageSize} total={activeMembers.length} onPageChange={setCardsPage} onPageSizeChange={(s) => { setCardsPageSize(s); setCardsPage(1); }} />
        )}
      </div>

      {/* Engagement table — paginada */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Participación")}
          description={t("Tabla de engagement detallada")}
          icon={Users}
          variant="primary"
        />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Diagnóstico")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Región")}</TableHead>
                <TableHead className="text-right">{t("Posts")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("Comentarios")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("Reacciones")}</TableHead>
                <TableHead className="text-right">{t("Racha")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">XP</TableHead>
                <TableHead className="hidden md:table-cell">{t("Nivel")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Último post")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Estado")}</TableHead>
                <TableHead className="w-10 text-right"><span className="sr-only">{t("Acciones")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersError ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-destructive">
                    {t("Error al cargar los miembros")}: {membersError}
                  </TableCell>
                </TableRow>
              ) : membersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={12}>
                      <div className="h-8 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                    {t("No hay miembros que coincidan con el filtro")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTable.map((m) => (
              <TableRow key={m.id} className="transition-colors hover:bg-muted/50">
                <TableCell className="py-2">
                  <MemberAvatar member={m} subtitle="" />
                </TableCell>
                <TableCell className="hidden md:table-cell py-2 text-xs">{m.diagnosis}</TableCell>
                <TableCell className="hidden md:table-cell py-2 text-xs">{m.region}</TableCell>
                <TableCell className="py-2 text-right text-xs font-semibold">{m.posts}</TableCell>
                <TableCell className="hidden text-right md:table-cell py-2 text-xs">{m.comments}</TableCell>
                <TableCell className="hidden text-right md:table-cell py-2 text-xs">{m.reactions}</TableCell>
                <TableCell className="py-2 text-right text-xs">
                  {m.streak > 0 ? `🔥 ${m.streak}` : "💤 0"}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell py-2 text-xs font-semibold">
                  {m.xp.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell py-2">
                  <LevelBadge level={m.level} />
                </TableCell>
                <TableCell className="hidden md:table-cell py-2 text-xs text-muted-foreground">
                  {m.lastPost}
                </TableCell>
                <TableCell className="hidden md:table-cell py-2">
                  <StatusBadge
                    status={t(m.status)}
                    color={
                      m.status === "Activo"
                        ? { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }
                        : { bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }
                    }
                  />
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            sendMessage(m.id, t("¡Hola! Nos gustaría saber de ti 💙"));
                            toast(t("Mensaje enviado"));
                          }}
                        >
                          <Send className="size-3.5" />
                          {t("Mensaje")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast(t("Premio enviado a") + " " + m.firstName)}
                        >
                          <Trophy className="size-3.5" />
                          {t("Premiar")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
                ))
              )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <CommunityPagination page={tablePage} pageSize={tablePageSize} total={filtered.length} onPageChange={setTablePage} onPageSizeChange={(s) => { setTablePageSize(s); setTablePage(1); }} />
        )}
      </div>
    </div>
  );
}
