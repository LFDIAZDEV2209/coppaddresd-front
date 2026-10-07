"use client";

import { useT } from "@/providers/i18n-provider";
import { Check, Eye, MailPlus, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fullName } from "../professional-visuals";
import {
  ProfessionalAccess,
  useProfessionalAccessState,
} from "./professional-access";
import type { EmployeeListItem } from "../../services/employees-service";

// --- Menú de acciones de fila ---

export function ActionsMenu({
  employee,
  canInvite,
  canDelete,
  inviting,
  copied,
  onOpen,
  onInvite,
  onDelete,
}: {
  employee: EmployeeListItem;
  canInvite: boolean;
  canDelete: boolean;
  inviting: boolean;
  copied: boolean;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
  onDelete: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  const access = useProfessionalAccessState(employee);
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
      <DropdownMenuContent align="end" className="min-w-44">
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
        {employee.isProfessional && employee.status !== "Invited" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              className="py-2"
              onClick={() => {
                if (!access.disabled) access.toggle();
              }}
            >
              <ProfessionalAccess employee={employee} />
            </DropdownMenuItem>
          </>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(employee)}
            >
              <Trash2 />
              {t("Eliminar perfil")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
