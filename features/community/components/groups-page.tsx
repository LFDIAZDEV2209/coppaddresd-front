"use client";

import {
  MessageCircle,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useErp } from "../erp-provider";
import { useT } from "@/providers/i18n-provider";
import type { GroupType } from "../types";

const GROUP_TYPE_COLORS: Record<GroupType, { bg: string; text: string; dot: string }> = {
  Reto: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
  Apoyo: { bg: "var(--primary-soft)", text: "var(--primary)", dot: "var(--primary)" },
  Nutrición: { bg: "var(--success-soft)", text: "var(--success-foreground)", dot: "var(--success-foreground)" },
  General: { bg: "var(--warning-soft)", text: "var(--warning-foreground)", dot: "var(--warning-foreground)" },
  Principal: { bg: "var(--info-soft)", text: "var(--info-foreground)", dot: "var(--info-foreground)" },
};

export function GroupsPage() {
  const t = useT();
  const { groups, toast } = useErp();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Grupos/Chats")}
        description={t("Gestión de grupos y chats de ANTARES")}
        icon={MessageCircle}
      />

      <div className="cp-card flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Grupos")}
          description={`${groups.length} ${t("grupos activos")}`}
          icon={MessageCircle}
          variant="primary"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Nombre")}</TableHead>
              <TableHead className="text-right">{t("Miembros")}</TableHead>
              <TableHead className="text-right">{t("Mensajes")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Tipo")}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t("Última actividad")}</TableHead>
              <TableHead className="w-16 text-right">{t("Acción")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => {
              const typeColor = GROUP_TYPE_COLORS[g.type] ?? GROUP_TYPE_COLORS.General;
              return (
                <TableRow key={g.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="text-xs font-semibold">{g.name}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{g.members}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{g.posts.toLocaleString()}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <StatusBadge status={t(g.type)} color={typeColor} />
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell text-xs text-muted-foreground">
                    {g.lastActivity}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => toast(t("Mensaje enviado al grupo") + ": " + g.name)}
                        title={t("Mensaje")}
                      >
                        <Send className="size-3.5" />
                      </Button>
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
