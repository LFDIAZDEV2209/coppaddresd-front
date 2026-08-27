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
  const { communityGroups, communityGroupsLoading, toast } = useErp();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Grupos/Chats")}
        description={t("Gestión de grupos y chats de ANTARES")}
        icon={MessageCircle}
      />

      <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-black/5">
        <SectionHeader
          title={t("Grupos")}
          description={`${communityGroups.length} ${t("grupos activos")}`}
          icon={MessageCircle}
          variant="primary"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0">{t("Nombre")}</TableHead>
              <TableHead className="w-[80px] text-right">{t("Miembros")}</TableHead>
              <TableHead className="w-[80px] text-right">{t("Mensajes")}</TableHead>
              <TableHead className="hidden md:table-cell w-[96px]">{t("Tipo")}</TableHead>
              <TableHead className="hidden lg:table-cell w-[132px] text-right">{t("Última actividad")}</TableHead>
              <TableHead className="w-16 text-right">{t("Acción")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(communityGroupsLoading ? [] : communityGroups).map((g) => {
              const typeColor = GROUP_TYPE_COLORS[g.type] ?? GROUP_TYPE_COLORS.General;
              return (
                <TableRow key={g.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="py-2 max-w-[220px] truncate text-xs font-semibold">{g.name}</TableCell>
                  <TableCell className="py-2 text-right text-xs font-bold">{g.members}</TableCell>
                  <TableCell className="py-2 text-right text-xs font-bold">{g.posts.toLocaleString()}</TableCell>
                  <TableCell className="hidden md:table-cell py-2">
                    <StatusBadge status={t(g.type)} color={typeColor} />
                  </TableCell>
                  <TableCell className="hidden text-right lg:table-cell py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {g.lastActivity}
                  </TableCell>
                  <TableCell className="py-2">
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
