"use client";

import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, LockKeyhole, RotateCcw } from "lucide-react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import {
  changeProfessionalAccess,
  type EmployeeListItem,
} from "../../services/employees-service";
import { fullName } from "../professional-visuals";

type AccessChange = {
  operationId: string;
  status: "Active" | "Inactive";
  phase: "saving" | "pending" | "uncertain" | "rejected";
  message?: string;
};

const AccessContext = createContext<{
  changes: Record<string, AccessChange>;
  change: (
    employee: EmployeeListItem,
    previous?: AccessChange,
  ) => Promise<void>;
} | null>(null);

/** Estado compartido entre tabla y tarjetas; un cambio de vista no duplica operaciones. */
export function ProfessionalAccessProvider({
  children,
  employees,
  onChanged,
}: {
  children: ReactNode;
  employees: EmployeeListItem[];
  onChanged: () => Promise<boolean>;
}) {
  const t = useT();
  const [changes, setChanges] = useState<Record<string, AccessChange>>({});
  const busy = useRef(new Set<string>());
  const refreshRef = useRef(onChanged);
  useEffect(() => {
    refreshRef.current = onChanged;
  }, [onChanged]);
  const hasPending =
    employees.some((employee) => employee.pendingStatus) ||
    Object.values(changes).some((change) => change.phase === "pending");

  useEffect(() => {
    if (!hasPending) return;
    let running = false;
    const timer = setInterval(async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        if (await refreshRef.current()) {
          setChanges((current) =>
            Object.fromEntries(
              Object.entries(current).filter(
                ([, change]) => change.phase !== "pending",
              ),
            ),
          );
        }
      } finally {
        running = false;
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [hasPending]);

  async function change(employee: EmployeeListItem, previous?: AccessChange) {
    if (busy.current.has(employee.id)) return;
    busy.current.add(employee.id);
    const operation: AccessChange = {
      operationId: previous?.operationId ?? crypto.randomUUID(),
      status:
        previous?.status ??
        (employee.status === "Active" ? "Inactive" : "Active"),
      phase: "saving",
    };
    setChanges((current) => ({ ...current, [employee.id]: operation }));
    try {
      const result = await changeProfessionalAccess(
        employee.id,
        operation.status,
        operation.operationId,
      );
      const refreshed = await refreshRef.current();
      if (result.pending || !refreshed) {
        setChanges((current) => ({
          ...current,
          [employee.id]: { ...operation, phase: "pending" },
        }));
      } else {
        setChanges((current) => {
          const next = { ...current };
          delete next[employee.id];
          return next;
        });
      }
    } catch (cause) {
      const rejected =
        cause instanceof ApiError &&
        [400, 403, 404, 409, 422, 429].includes(cause.status);
      setChanges((current) => ({
        ...current,
        [employee.id]: {
          ...operation,
          phase: rejected ? "rejected" : "uncertain",
          message: rejected
            ? t(
                "No se pudo cambiar el acceso. Actualiza el directorio e inténtalo de nuevo.",
              )
            : t("No pudimos confirmar el cambio. Reintenta para comprobarlo."),
        },
      }));
    } finally {
      busy.current.delete(employee.id);
    }
  }

  return <AccessContext value={{ changes, change }}>{children}</AccessContext>;
}

/**
 * Estado del cambio de acceso de un empleado. Compartido entre el switch del
 * menú de acciones y el ítem que lo contiene (permite alternar con teclado).
 */
export function useProfessionalAccessState(employee: EmployeeListItem) {
  const context = use(AccessContext);
  const { can } = useAppContext();
  const { user } = useAuth();
  const descriptionId = useId();
  if (!context)
    throw new Error("ProfessionalAccess necesita ProfessionalAccessProvider");
  const change = context.changes[employee.id];
  const saving = change?.phase === "saving";
  const pending =
    change?.phase === "pending" || Boolean(employee.pendingStatus);
  const uncertain = change?.phase === "uncertain";
  const state =
    change && change.phase !== "rejected"
      ? change.status
      : (employee.pendingStatus ?? employee.status);
  const ownAccess = user?.id === employee.userId;
  const readOnly = !can("Employees.Update") || ownAccess || !employee.userId;
  return {
    context,
    change,
    saving,
    pending,
    uncertain,
    state,
    ownAccess,
    readOnly,
    disabled: readOnly || saving || pending || uncertain,
    descriptionId,
    toggle: () => void context.change(employee),
  };
}

export function ProfessionalAccess({
  employee,
}: {
  employee: EmployeeListItem;
}) {
  const t = useT();
  const {
    context,
    change,
    saving,
    pending,
    uncertain,
    state,
    ownAccess,
    readOnly,
    disabled,
    descriptionId,
    toggle,
  } = useProfessionalAccessState(employee);

  if (employee.status === "Invited" || !employee.isProfessional) return null;

  return (
    <div
      className="professional-access flex w-full flex-col gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
          aria-live="polite"
        >
          {saving
            ? t("Guardando…")
            : pending
              ? t("Sincronizando…")
              : uncertain
                ? t("Por confirmar")
                : t("Acceso al ERP")}
        </span>
        {saving || pending ? (
          <LoaderCircle
            aria-hidden
            className="size-3.5 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          />
        ) : ownAccess ? (
          <LockKeyhole
            aria-hidden
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        ) : null}
        <SwitchPrimitive.Root
          checked={state === "Active"}
          disabled={disabled}
          aria-label={t("Acceso al ERP de {name}", {
            name: fullName(employee),
          })}
          aria-describedby={descriptionId}
          aria-busy={saving || pending}
          onCheckedChange={toggle}
          className="professional-access-switch relative inline-flex shrink-0 rounded-full"
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            className="block rounded-full"
          />
        </SwitchPrimitive.Root>
        <span id={descriptionId} className="sr-only">
          {ownAccess
            ? t("Tu acceso está protegido")
            : readOnly
              ? t("Sin permiso para cambiar el acceso")
              : t("Solo afecta al ERP; conserva el acceso como paciente.")}
        </span>
      </div>
      {change?.message ? (
        <div
          className="flex max-w-56 flex-col items-start gap-1 whitespace-normal text-xs text-destructive"
          role="alert"
        >
          <span>{change.message}</span>
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              void context.change(employee, uncertain ? change : undefined)
            }
          >
            <RotateCcw data-icon="inline-start" />
            {t("Reintentar")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
