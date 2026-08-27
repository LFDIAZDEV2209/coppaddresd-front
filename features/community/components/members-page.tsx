"use client";

import { useState, useMemo } from "react";
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

export function MembersPage() {
  const t = useT();
  const { members, sendMessage, toast } = useErp();
  const [diagFilter, setDiagFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [search, setSearch] = useState("");

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
          <Select value={diagFilter} onValueChange={(v) => { if (v !== null) setDiagFilter(v); }}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
              <SelectValue placeholder={t("Diagnóstico")} />
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

          <Select value={regionFilter} onValueChange={(v) => { if (v !== null) setRegionFilter(v); }}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
              <SelectValue placeholder={t("Región")} />
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Buscar miembro...")}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Active member cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {activeMembers.map((m) => (
          <div
            key={m.id}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:shadow-sm hover:-translate-y-0.5"
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

      {/* Engagement table */}
      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
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
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <MemberAvatar member={m} subtitle="" />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">{m.diagnosis}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{m.region}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{m.posts}</TableCell>
                <TableCell className="hidden text-right md:table-cell text-xs">{m.comments}</TableCell>
                <TableCell className="hidden text-right md:table-cell text-xs">{m.reactions}</TableCell>
                <TableCell className="text-right text-xs">
                  {m.streak > 0 ? `🔥 ${m.streak}` : "💤 0"}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell text-xs font-semibold">
                  {m.xp.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <LevelBadge level={m.level} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {m.lastPost}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <StatusBadge
                    status={t(m.status)}
                    color={
                      m.status === "Activo"
                        ? { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" }
                        : { bg: "var(--destructive-soft)", text: "var(--destructive)", dot: "var(--destructive)" }
                    }
                  />
                </TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
