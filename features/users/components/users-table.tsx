"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Clock,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserRoundCog,
  UserX,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import type { User, UserSort, UserSortField } from "../types";
import { formatDate, getFullName } from "../services/users-service";
import { getMockLastAccess, formatRelativeTime } from "../services/users-mock";
import {
  RoleChips,
  UserAvatar,
  UserIdentity,
  UserStatusBadge,
} from "./user-visuals";

interface UsersTableProps {
  users: User[];
  selectedIds: Set<string>;
  sort: UserSort;
  onSortChange: (sort: UserSort) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleActive: (user: User) => void;
  onDelete: (user: User) => void;
}

/** Columnas ordenables: clic = asc → clic de nuevo = desc → clic de nuevo = asc. */
function toggleSort(current: UserSort, field: UserSortField): UserSort {
  if (current.field === field) {
    return { field, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { field, dir: field === "createdAt" ? "desc" : "asc" };
}

function SortHeader({
  label,
  field,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  field: UserSortField;
  sort: UserSort;
  onSortChange: (sort: UserSort) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const nextDir =
    active && sort.dir === "asc"
      ? "desc"
      : active && sort.dir === "desc"
        ? null
        : "asc";

  return (
    <button
      type="button"
      onClick={() =>
        onSortChange(
          nextDir === null
            ? { field: null, dir: "desc" }
            : toggleSort(sort, field),
        )
      }
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase transition-colors hover:bg-muted/70",
        active ? "text-primary" : "text-muted-foreground",
        className,
      )}
      aria-label={label}
    >
      {label}
      <Icon
        className={cn(
          "size-3 transition-opacity",
          active ? "opacity-100" : "opacity-40 group-hover:opacity-70",
        )}
      />
    </button>
  );
}

export function UsersTable({
  users,
  selectedIds,
  sort,
  onSortChange,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onToggleActive,
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
              aria-label={t("Seleccionar todos")}
            />
          </TableHead>
          <TableHead>
            <SortHeader
              label={t("Usuario")}
              field="name"
              sort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[190px]">{t("Roles")}</TableHead>
          <TableHead className="w-[120px]">
            <SortHeader
              label={t("Estado")}
              field="status"
              sort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[130px]">
            <SortHeader
              label={t("Último acceso")}
              field="lastAccess"
              sort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[120px]">
            <SortHeader
              label={t("Creado")}
              field="createdAt"
              sort={sort}
              onSortChange={onSortChange}
            />
          </TableHead>
          <TableHead className="w-[76px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, index) => {
          const selected = selectedIds.has(user.id);
          const lastAccess = getMockLastAccess(user.id);
          return (
            <TableRow
              key={user.id}
              data-selected={selected}
              className="h-12 animate-slide-up data-[selected=true]:bg-primary/[0.04]"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <TableCell>
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSelect(user.id)}
                  aria-label={t("Seleccionar {name}", {
                    name: getFullName(user),
                  })}
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/users/${user.id}`}
                  className="flex items-center gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-muted/60"
                >
                  <UserAvatar user={user} className="size-8" />
                  <UserIdentity user={user} />
                </Link>
              </TableCell>
              <TableCell>
                <RoleChips roles={user.roles} />
              </TableCell>
              <TableCell>
                <UserStatusBadge isActive={user.isActive} />
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Clock className="size-3 shrink-0 text-muted-foreground/70" />
                  {formatRelativeTime(lastAccess)}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <CalendarDays className="size-3 shrink-0 text-muted-foreground/70" />
                  {formatDate(user.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                {canUpdate || canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
                      aria-label={t("Acciones de {name}", {
                        name: getFullName(user),
                      })}
                    >
                      <MoreHorizontal className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onView(user)}>
                        <Eye className="size-4" />
                        {t("Ver usuario")}
                      </DropdownMenuItem>
                      {canUpdate && (
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Pencil className="size-4" />
                          {t("Editar")}
                        </DropdownMenuItem>
                      )}
                      {canUpdate && (
                        <>
                          <DropdownMenuSeparator />
                          {user.isActive ? (
                            <DropdownMenuItem
                              onClick={() => onToggleActive(user)}
                            >
                              <UserX className="size-4" />
                              {t("Desactivar")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onToggleActive(user)}
                            >
                              <UserCheck className="size-4" />
                              {t("Activar")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            <UserRoundCog className="size-4" />
                            {t("Gestionar roles")}
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(user)}
                          >
                            <Trash2 className="size-4" />
                            {t("Eliminar")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    onClick={() => onView(user)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("Ver usuario")}
                  >
                    <Eye className="size-4" />
                  </button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
