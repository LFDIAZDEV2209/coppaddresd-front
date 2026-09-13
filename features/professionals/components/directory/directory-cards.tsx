"use client";

import { useT } from "@/providers/i18n-provider";
import { Building2, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fullName,
  ProfessionalAvatar,
} from "../professional-visuals";
import { ActionsMenu } from "./actions-menu";
import { ProfessionalAccess } from "./professional-access";
import type { EmployeeListItem } from "../../services/employees-service";

// --- Vista de tarjetas ---

export function DirectoryCards({
  employees,
  canInvite,
  invitingId,
  copiedId,
  selected,
  onToggleOne,
  onOpen,
  onInvite,
}: {
  employees: EmployeeListItem[];
  canInvite: boolean;
  invitingId: string | null;
  copiedId: string | null;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onOpen: (employee: EmployeeListItem) => void;
  onInvite: (employee: EmployeeListItem) => void;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {employees.map((employee) => (
        <div
          key={employee.id}
          className={cn(
            "hover-lift flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-all",
            selected.has(employee.id)
              ? "border-primary ring-1 ring-primary"
              : "border-border",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Checkbox
              checked={selected.has(employee.id)}
              onCheckedChange={() => onToggleOne(employee.id)}
              aria-label={t("Seleccionar {name}", { name: fullName(employee) })}
            />
            <ActionsMenu
              employee={employee}
              canInvite={canInvite}
              inviting={invitingId === employee.id}
              copied={copiedId === employee.id}
              onOpen={onOpen}
              onInvite={onInvite}
            />
          </div>

          <button
            className="flex items-center gap-3 text-left"
            onClick={() => onOpen(employee)}
          >
            <ProfessionalAvatar employee={employee} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {fullName(employee)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {employee.email}
              </span>
            </span>
          </button>

          {employee.professionalTypeName && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              <Stethoscope className="size-3 text-primary" />
              {employee.professionalTypeName}
            </span>
          )}

          {employee.specialtyNames?.length ? (
            <div className="flex flex-wrap gap-1">
              {employee.specialtyNames.slice(0, 3).map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {name}
                </span>
              ))}
              {employee.specialtyNames.length > 3 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  +{employee.specialtyNames.length - 3}
                </span>
              )}
            </div>
          ) : null}

          {employee.clinicNames.length > 0 && (
            <p className="flex items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              {employee.clinicNames.join(", ")}
            </p>
          )}

          <div className="mt-auto border-t border-border pt-3">
            <ProfessionalAccess employee={employee} />
          </div>
        </div>
      ))}
    </div>
  );
}
