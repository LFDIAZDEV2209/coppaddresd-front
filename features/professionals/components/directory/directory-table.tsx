"use client";

import { useT } from "@/providers/i18n-provider";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DirectoryIcon } from "./directory-icon";
import { fullName, ProfessionalAvatar } from "../professional-visuals";
import { ActionsMenu } from "./actions-menu";
import { ProfessionalAccess } from "./professional-access";
import { PROFESSIONAL_CLINICS_ENABLED } from "@/features/professionals/config";
import type { EmployeeListItem } from "../../services/employees-service";

// --- Tabla ---

type SortField = "name" | "type" | "status";
interface SortState {
  field: SortField;
  dir: "asc" | "desc";
}

function sortEmployees(
  employees: EmployeeListItem[],
  sort: SortState,
): EmployeeListItem[] {
  const sorted = [...employees];
  sorted.sort((a, b) => {
    let cmp = 0;
    if (sort.field === "name") {
      cmp = fullName(a).localeCompare(fullName(b));
    } else if (sort.field === "type") {
      cmp = (a.professionalTypeName ?? "").localeCompare(
        b.professionalTypeName ?? "",
      );
    } else {
      cmp = a.status.localeCompare(b.status);
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function SortableHead({
  label,
  field,
  sort,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  sort: SortState;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort.field === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-primary",
        )}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground" />
        )}
      </button>
    </TableHead>
  );
}

export function DirectoryTable({
  employees,
  canInvite,
  invitingId,
  copiedId,
  selected,
  allSelected,
  someSelected,
  onToggleAll,
  onToggleOne,
  onOpen,
  onInvite,
}: {
  employees: EmployeeListItem[];
  canInvite: boolean;
  invitingId: string | null;
  copiedId: string | null;
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  const [sort, setSort] = useState<SortState>({ field: "name", dir: "asc" });
  const sorted = useMemo(
    () => sortEmployees(employees, sort),
    [employees, sort],
  );
  const onSort = (field: SortField) =>
    setSort((current) =>
      current.field === field
        ? { field, dir: current.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" },
    );

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <DirectoryIcon kind="team" className="directory-3d-icon--small" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {employees.length} {t("profesionales visibles")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("Equipo del ERP")}</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected || someSelected}
                onCheckedChange={onToggleAll}
                aria-label={t("Seleccionar todos los visibles")}
              />
            </TableHead>
            <SortableHead
              label={t("Profesional")}
              field="name"
              sort={sort}
              onSort={onSort}
            />
            <SortableHead
              label={t("Tipo")}
              field="type"
              sort={sort}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            <TableHead className="hidden lg:table-cell">
              {t("Especialidades")}
            </TableHead>
            {PROFESSIONAL_CLINICS_ENABLED && (
              <TableHead className="hidden xl:table-cell">
                {t("Clínicas")}
              </TableHead>
            )}
            <SortableHead
              label={t("Estado")}
              field="status"
              sort={sort}
              onSort={onSort}
            />
            <TableHead className="w-10">
              <span className="sr-only">{t("Acciones")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((employee, index) => (
            <TableRow
              key={employee.id}
              className="group animate-slide-up"
              style={{
                animationDelay: `${Math.min(index * 30, 300)}ms`,
              }}
            >
              <TableCell>
                <Checkbox
                  checked={selected.has(employee.id)}
                  onCheckedChange={() => onToggleOne(employee.id)}
                  aria-label={t("Seleccionar {name}", {
                    name: fullName(employee),
                  })}
                />
              </TableCell>
              <TableCell>
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => onOpen(employee)}
                >
                  <ProfessionalAvatar employee={employee} size="sm" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {fullName(employee)}
                    </span>
                    <span className="max-w-52 truncate text-xs text-muted-foreground">
                      {employee.email}
                    </span>
                  </span>
                </button>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {employee.professionalTypeName ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    <Stethoscope className="size-3 text-primary" />
                    {employee.professionalTypeName}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t("Sin tipo")}
                  </span>
                )}
                {employee.jobTitle && (
                  <span className="block text-xs text-muted-foreground">
                    {employee.jobTitle}
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex max-w-52 flex-wrap gap-1">
                  {employee.specialtyNames?.length ? (
                    employee.specialtyNames.slice(0, 2).map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {(employee.specialtyNames?.length ?? 0) > 2 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      +{(employee.specialtyNames?.length ?? 0) - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              {PROFESSIONAL_CLINICS_ENABLED && (
                <TableCell className="hidden xl:table-cell">
                  <div className="flex max-w-52 flex-wrap gap-1">
                    {employee.clinicNames.length ? (
                      employee.clinicNames.slice(0, 2).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          <Building2 className="size-3" />
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {employee.clinicNames.length > 2 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                        +{employee.clinicNames.length - 2}
                      </span>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <ProfessionalAccess employee={employee} />
              </TableCell>
              <TableCell>
                <ActionsMenu
                  employee={employee}
                  canInvite={canInvite}
                  inviting={invitingId === employee.id}
                  copied={copiedId === employee.id}
                  onOpen={onOpen}
                  onInvite={onInvite}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
