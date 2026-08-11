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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/feedback/status-badge";
import type { User } from "../types";
import { getStatusColor } from "../services/users-service";

interface UsersTableProps {
  users: User[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function UsersTable({
  users,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: UsersTableProps) {
  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-10 hover:bg-transparent">
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Seleccionar todos"
            />
          </TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead className="w-[130px]">Rol</TableHead>
          <TableHead className="w-[140px]">Estado</TableHead>
          <TableHead className="w-[170px]">Última actividad</TableHead>
          <TableHead className="w-[76px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} className="h-11">
            <TableCell>
              <Checkbox
                checked={selectedIds.has(user.id)}
                onCheckedChange={() => onToggleSelect(user.id)}
                aria-label={`Seleccionar ${user.name}`}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-info-soft text-[11px] font-bold text-info-foreground">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-medium text-secondary-foreground">
                {user.role}
              </span>
            </TableCell>
            <TableCell>
              <StatusBadge
                status={user.status}
                color={getStatusColor(user.status)}
              />
            </TableCell>
            <TableCell className="text-[12.5px] text-muted-foreground">
              {user.lastActivity}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
                  aria-label="Acciones"
                >
                  <MoreHorizontal className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
