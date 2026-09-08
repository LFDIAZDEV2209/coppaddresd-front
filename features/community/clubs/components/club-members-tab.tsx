"use client";

import { useEffect, useState } from "react";
import { UserMinus, VolumeX, Shield, Volume2, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { StatusBadge } from "@/components/feedback/status-badge";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import type { ClubMember, ClubMemberRole } from "../types";
import {
  addClubMember,
  changeMemberRole,
  expelMember,
  fetchClubMembers,
  muteMember,
  unmuteMember,
} from "../mock/clubs-api";
import { searchProfiles } from "../services/clubs-service";
import { useAppContext } from "@/providers/context-provider";
import {
  MEMBER_STATUS_COLORS,
  formatRelative,
  initials,
} from "./clubs-helpers";

const ROLE_LABELS: Record<ClubMemberRole, string> = {
  ADMIN: "Administrador",
  MODERADOR: "Moderador",
  MIEMBRO: "Miembro",
};

export function ClubMembersTab({ clubId }: { clubId: string }) {
  const t = useT();
  const { can } = useAppContext();
  const canManage = can("Community.Manage");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [muteTarget, setMuteTarget] = useState<ClubMember | null>(null);
  const [muteHours, setMuteHours] = useState("24");
  const [expelTarget, setExpelTarget] = useState<ClubMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<{ id: string; displayName: string }[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addError, setAddError] = useState("");

  const load = async () => {
    setMembers(await fetchClubMembers(clubId, "ACTIVO"));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  useEffect(() => {
    let active = true;
    if (!addSearch.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddResults([]);
      return;
    }
    setAddSearching(true);
    searchProfiles(addSearch)
      .then((data) => {
        if (active) {
          const existing = new Set(members.map((m) => m.profile.id));
          setAddResults(data.filter((p) => !existing.has(p.id)));
        }
      })
      .catch(() => setAddResults([]))
      .finally(() => {
        if (active) setAddSearching(false);
      });
    return () => {
      active = false;
    };
  }, [addSearch, members]);

  const applyAdd = async (profileId: string, role: ClubMemberRole) => {
    setAddError("");
    try {
      await addClubMember(clubId, profileId, role);
      setAddOpen(false);
      setAddSearch("");
      setAddResults([]);
      await load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    }
  };

  const applyMute = async () => {
    if (!muteTarget) return;
    const until = new Date(
      Date.now() + Number(muteHours) * 3_600_000,
    ).toISOString();
    await muteMember(clubId, muteTarget.id, until);
    setMuteTarget(null);
    await load();
  };

  const applyExpel = async () => {
    if (!expelTarget) return;
    await expelMember(clubId, expelTarget.id);
    setExpelTarget(null);
    await load();
  };

  const applyUnmute = async (member: ClubMember) => {
    await unmuteMember(clubId, member.id);
    await load();
  };

  const applyRole = async (member: ClubMember, role: ClubMemberRole) => {
    await changeMemberRole(clubId, member.id, role);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Miembros activos")}
          description={`${members.length} ${t("miembros")}`}
          icon={Shield}
          variant="primary"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus data-icon="inline-start" />
                {t("Agregar miembro")}
              </Button>
            ) : undefined
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t("Cargando miembros…")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Miembro")}</TableHead>
                <TableHead>{t("Rol")}</TableHead>
                <TableHead>{t("Estado")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Se unió")}
                </TableHead>
                <TableHead className="text-right">{t("Acciones")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {initials(member.profile.displayName)}
                      </span>
                      <span className="text-sm font-semibold">
                        {member.profile.displayName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        applyRole(member, v as ClubMemberRole)
                      }
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">
                          {t("Administrador")}
                        </SelectItem>
                        <SelectItem value="MODERADOR">
                          {t("Moderador")}
                        </SelectItem>
                        <SelectItem value="MIEMBRO">{t("Miembro")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <StatusBadge
                      status={t(
                        MEMBER_STATUS_COLORS[member.status]
                          ? statusLabel(member.status)
                          : "Activo",
                      )}
                      color={MEMBER_STATUS_COLORS[member.status]}
                    />
                  </TableCell>
                  <TableCell className="hidden py-2.5 text-xs text-muted-foreground md:table-cell">
                    {formatRelative(member.joinedAt)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex justify-end gap-1">
                      {member.status === "SILENCIADO" ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title={t("Quitar silencio")}
                          onClick={() => applyUnmute(member)}
                        >
                          <Volume2 className="size-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title={t("Silenciar")}
                          onClick={() => setMuteTarget(member)}
                        >
                          <VolumeX className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={t("Expulsar")}
                        className="text-destructive"
                        onClick={() => setExpelTarget(member)}
                      >
                        <UserMinus className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Diálogo agregar miembro */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setAddSearch("");
            setAddResults([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Agregar miembro")}</DialogTitle>
            <DialogDescription>
              {t("Busca un usuario de la plataforma y asígnalo al club.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder={t("Buscar usuarios de la plataforma…")}
              />
            </div>
            {addSearching && (
              <span className="text-xs text-muted-foreground">{t("Buscando…")}</span>
            )}
            {!addSearching && addResults.length > 0 && (
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1">
                {addResults.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted"
                  >
                    <span className="text-sm">{p.displayName}</span>
                    <div className="flex items-center gap-1">
                      <Select
                        defaultValue="MIEMBRO"
                        onValueChange={(v) => applyAdd(p.id, v as ClubMemberRole)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MIEMBRO">{t("Miembro")}</SelectItem>
                          <SelectItem value="MODERADOR">{t("Moderador")}</SelectItem>
                          <SelectItem value="ADMIN">{t("Administrador")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!addSearching && addSearch.trim() && addResults.length === 0 && (
              <span className="text-xs text-muted-foreground">{t("Sin resultados")}</span>
            )}
            {addError && <span className="text-xs text-destructive">{addError}</span>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de silencio */}
      <Dialog
        open={muteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setMuteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Silenciar miembro")}</DialogTitle>
            <DialogDescription>
              {t(
                "El miembro no podrá comentar ni reaccionar durante el período indicado.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Label>{t("Duración (horas)")}</Label>
            <Input
              type="number"
              min={1}
              value={muteHours}
              onChange={(e) => setMuteHours(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMuteTarget(null)}
            >
              {t("Cancelar")}
            </Button>
            <Button size="sm" onClick={applyMute}>
              {t("Silenciar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de expulsión */}
      <Dialog
        open={expelTarget !== null}
        onOpenChange={(o) => {
          if (!o) setExpelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Expulsar miembro")}</DialogTitle>
            <DialogDescription>
              {t(
                "El miembro perderá el acceso al club. Esta acción se registra en el historial de moderación.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpelTarget(null)}
            >
              {t("Cancelar")}
            </Button>
            <Button size="sm" variant="destructive" onClick={applyExpel}>
              {t("Expulsar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function statusLabel(status: ClubMember["status"]): string {
  switch (status) {
    case "ACTIVO":
      return "Activo";
    case "PENDIENTE":
      return "Pendiente";
    case "EXPULSADO":
      return "Expulsado";
    case "SILENCIADO":
      return "Silenciado";
  }
}

export { ROLE_LABELS };
