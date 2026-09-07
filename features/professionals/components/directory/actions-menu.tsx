"use client";

import { useT } from "@/providers/i18n-provider";
import { Check, Eye, MailPlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fullName } from "../professional-visuals";
import type { EmployeeListItem } from "../../services/employees-service";

// --- Menú de acciones de fila ---

export function ActionsMenu({
  employee,
  canInvite,
  inviting,
  copied,
  onOpen,
  onInvite,
}: {
  employee: EmployeeListItem;
  canInvite: boolean;
  inviting: boolean;
  copied: boolean;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Acciones de {name}", { name: fullName(employee) })}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(employee)}>
          <Eye />
          {t("Ver detalles")}
        </DropdownMenuItem>
        {canInvite && employee.status === "Invited" && (
          <DropdownMenuItem
            disabled={inviting}
            onClick={() => onInvite(employee)}
          >
            <MailPlus />
            {inviting ? t("Enviando...") : t("Reenviar invitación")}
          </DropdownMenuItem>
        )}
        {copied && (
          <DropdownMenuItem disabled>
            <Check />
            {t("Enlace copiado")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
