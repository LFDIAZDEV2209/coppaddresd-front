"use client";

import {
  CalendarDays,
  CheckCircle2,
  Mail,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/feedback/status-badge";
import { useAuth } from "@/providers/auth-provider";
import type { User } from "../types";
import {
  formatDate,
  getFullName,
  getInitials,
  getStatusColor,
  getStatusLabel,
} from "../services/users-service";
import { useT } from "@/providers/i18n-provider";

interface UsersCardsProps {
  users: User[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const MAX_VISIBLE_ROLES = 3;

export function UsersCards({
  users,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
}: UsersCardsProps) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("Users.Update");
  const canDelete = hasPermission("Users.Delete");
  const t = useT();

  return (
    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {users.map((user) => {
        const visibleRoles = user.roles.slice(0, MAX_VISIBLE_ROLES);
        const extraRoles = user.roles.length - visibleRoles.length;
        const active = user.isActive;

        return (
          <article
            key={user.id}
            data-selected={selectedIds.has(user.id)}
            className="group flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 data-[selected=true]:border-primary data-[selected=true]:ring-1 data-[selected=true]:ring-primary/30"
          >
            <div className="flex items-start gap-2.5">
              <Checkbox
                checked={selectedIds.has(user.id)}
                onCheckedChange={() => onToggleSelect(user.id)}
                aria-label={t('Seleccionar {name}', { name: getFullName(user) })}
                className="mt-0.5"
              />
              <Avatar className="size-9">
                <AvatarFallback className="bg-info-soft text-[11px] font-bold text-info-foreground">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="truncate text-[13px] font-semibold text-foreground">
                  {getFullName(user)}
                </h3>
                <p className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                  <Mail className="size-3 shrink-0" />
                  {user.email}
                </p>
              </div>
              {(canUpdate || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-muted"
                    aria-label={t('Acciones de {name}', { name: getFullName(user) })}
                  >
                    <MoreHorizontal className="size-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdate && (
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="size-4" />
                        {t('Editar')}
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(user)}
                      >
                        <Trash2 className="size-4" />
                        {t('Eliminar')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {visibleRoles.length === 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {t('Sin roles')}
                </span>
              )}
              {visibleRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"
                >
                  <ShieldCheck className="size-3" />
                  {role}
                </span>
              ))}
              {extraRoles > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  +{extraRoles}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
              <StatusBadge
                status={getStatusLabel(active)}
                color={getStatusColor(active)}
              />
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {active ? (
                  <CheckCircle2 className="size-3 text-success-foreground" />
                ) : (
                  <XCircle className="size-3 text-destructive" />
                )}
                <CalendarDays className="size-3" />
                {formatDate(user.createdAt)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}