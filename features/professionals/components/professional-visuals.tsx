"use client";

import { StatusBadge } from "@/components/feedback/status-badge";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "../services/employees-service";

const STATUS_LABELS: Record<string, string> = {
  Invited: "Invitado",
  Active: "Activo",
  Inactive: "Inactivo",
};

/** Etiqueta visible de un estado del empleado (Active/Invited/Inactive). */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusColor(status: string) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    Active: {
      bg: "#087d43",
      text: "#ffffff",
      dot: "#ffffff",
    },
    Invited: {
      bg: "#ffc400",
      text: "#422500",
      dot: "#422500",
    },
    Inactive: {
      bg: "#c83237",
      text: "#ffffff",
      dot: "#ffffff",
    },
  };
  return (
    colors[status] ?? {
      bg: "var(--muted)",
      text: "var(--muted-foreground)",
      dot: "var(--muted-foreground)",
    }
  );
}

/** Badge de estado del profesional con icono + texto y colores del sistema. */
export function ProfessionalStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge status={statusLabel(status)} color={statusColor(status)} />
  );
}

/** Nombre completo del empleado (incluye segundo nombre si existe). */
export function fullName(
  employee: Pick<EmployeeListItem, "firstName" | "middleName" | "lastName">,
) {
  return [employee.firstName, employee.middleName, employee.lastName]
    .filter(Boolean)
    .join(" ");
}

/** Iniciales para el avatar (primera letra de nombre + apellido). */
export function initials(
  employee: Pick<EmployeeListItem, "firstName" | "lastName">,
) {
  return `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase();
}

/** Avatar con gradiente de marca e iniciales. */
export function ProfessionalAvatar({
  employee,
  size = "md",
}: {
  employee: Pick<EmployeeListItem, "firstName" | "lastName">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-gradient font-bold text-white shadow-sm",
        size === "sm" && "size-9 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-14 text-base",
      )}
    >
      {initials(employee)}
    </span>
  );
}
