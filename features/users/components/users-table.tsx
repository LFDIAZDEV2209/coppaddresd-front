"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

interface UsersTableProps {
  users: User[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const MAX_VISIBLE_ROLES = 2;

export function UsersTable({
  users,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: UsersTableProps) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("Users.Update");
  const canDelete = hasPermission("Users.Delete");
  const allSelected = users.length > 0 && selectedIds.size === users.length;
  const t = useT();

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-10 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label={t('Seleccionar todos')}
            />
          </TableHead>
          <TableHead>{t('Usuario')}</TableHead>
          <TableHead className="w-[190px]">{t('Roles')}</TableHead>
          <TableHead className="w-[120px]">{t('Estado')}</TableHead>
          <TableHead className="w-[110px]">{t('Creado')}</TableHead>
          <TableHead className="w-[76px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const visibleRoles = user.roles.slice(0, MAX_VISIBLE_ROLES);
          const extraRoles = user.roles.length - visibleRoles.length;
          return (
            <TableRow key={user.id} className="h-11">
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(user.id)}
                  onCheckedChange={() => onToggleSelect(user.id)}
                  aria-label={t('Seleccionar {name}', { name: getFullName(user) })}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-info-soft text-[11px] font-bold text-info-foreground">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">
                      {getFullName(user)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  {visibleRoles.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {t('Sin roles')}
                    </span>
                  )}
                  {visibleRoles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-medium text-secondary-foreground"
                    >
                      {role}
                    </span>
                  ))}
                  {extraRoles > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{extraRoles}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={getStatusLabel(user.isActive)}
                  color={getStatusColor(user.isActive)}
                />
              </TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell>
                {canUpdate || canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
                      aria-label={t('Acciones')}
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
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
