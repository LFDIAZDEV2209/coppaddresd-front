"use client";

import { createContext, useContext, useState } from "react";
import {
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/providers/i18n-provider";
import type { Role } from "@/features/roles/types";

interface UsersBulkBarProps {
  selectedCount: number;
  busy: boolean;
  onClear: () => void;
  onAssignRole: (roleId: string) => Promise<void>;
  onSetActive: (active: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  canAssignRoles: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type PendingAction = "delete" | "role" | null;

/**
 * Barra contextual de acciones masivas: aparece SOLO con selección activa.
 * Asignar rol / activar / desactivar / eliminar sobre todos los usuarios
 * seleccionados — la orquestación y el feedback los hace la página.
 */
export function UsersBulkBar({
  selectedCount,
  busy,
  onClear,
  onAssignRole,
  onSetActive,
  onDelete,
  canAssignRoles,
  canUpdate,
  canDelete,
}: UsersBulkBarProps) {
  const t = useT();
  const [pending, setPending] = useState<PendingAction>(null);
  const [roleId, setRoleId] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);

  if (selectedCount === 0) return null;

  const handleRoleConfirm = async () => {
    if (!roleId) return;
    setRoleSaving(true);
    try {
      await onAssignRole(roleId);
      setPending(null);
      setRoleId("");
    } finally {
      setRoleSaving(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto w-fit">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-brand-gradient px-3 py-2 shadow-lg shadow-brand-navy/30">
          <span className="flex items-center gap-2 rounded-xl bg-white/12 px-2.5 py-1 text-[12.5px] font-semibold text-white">
            <ShieldCheck className="size-4" />
            {t("{count} seleccionados", { count: String(selectedCount) })}
          </span>

          {canAssignRoles && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setPending("role")}
              className="gap-1.5 border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 hover:text-white"
            >
              <ShieldCheck data-icon="inline-start" />
              {t("Asignar rol")}
            </Button>
          )}
          {canUpdate && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onSetActive(true)}
                className="gap-1.5 border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 hover:text-white"
              >
                <UserCheck data-icon="inline-start" />
                {t("Activar")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onSetActive(false)}
                className="gap-1.5 border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 hover:text-white"
              >
                <UserX data-icon="inline-start" />
                {t("Desactivar")}
              </Button>
            </>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setPending("delete")}
              className="gap-1.5 border border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 hover:text-white"
            >
              <Trash2 data-icon="inline-start" />
              {t("Eliminar")}
            </Button>
          )}

          {busy ? (
            <LoaderCircle className="ml-1 size-4 animate-spin text-white" />
          ) : (
            <button
              type="button"
              onClick={onClear}
              className="ml-1 flex size-6 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              aria-label={t("Limpiar selección")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmación destructiva */}
      <AlertDialog
        open={pending === "delete"}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogMedia className="bg-destructive-soft text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("¿Eliminar {count} usuarios?", {
                count: String(selectedCount),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Se eliminarán los usuarios seleccionados y todas sus asignaciones. Esta acción no se puede deshacer.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {t("Cancelar")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busy}
              onClick={() => void onDelete().then(() => setPending(null))}
            >
              <Trash2 data-icon="inline-start" />
              {t("Eliminar todo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asignar rol masivo */}
      <Dialog
        open={pending === "role"}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Asignar rol a {count} usuarios", {
                count: String(selectedCount),
              })}
            </DialogTitle>
            <DialogDescription>
              {t(
                "El rol se agrega además de los roles actuales de cada usuario. Puedes ajustarlos individualmente después.",
              )}
            </DialogDescription>
          </DialogHeader>
          <BulkRoleSelector roleId={roleId} onRoleChange={setRoleId} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPending(null)}
              disabled={roleSaving}
            >
              {t("Cancelar")}
            </Button>
            <Button
              onClick={() => void handleRoleConfirm()}
              disabled={!roleId || roleSaving}
            >
              {roleSaving ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <ShieldCheck data-icon="inline-start" />
              )}
              {t("Asignar rol")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BulkRoleSelector({
  roleId,
  onRoleChange,
}: {
  roleId: string;
  onRoleChange: (roleId: string) => void;
}) {
  const t = useT();
  // Los roles llegan vía contexto (BulkRolesProvider) para no propagar
  // props por todos los niveles de la barra masiva.
  const roles = useContext(BulkRolesContext);
  return (
    <Select
      value={roleId}
      onValueChange={(value) => {
        if (value) onRoleChange(value);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t("Seleccionar rol")} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role: Role) => (
          <SelectItem key={role.id} value={role.id}>
            <span className="flex flex-col">
              <span>{role.name}</span>
              {role.description && (
                <span className="text-[11px] text-muted-foreground">
                  {role.description}
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const BulkRolesContext = createContext<Role[]>([]);

export function BulkRolesProvider({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  return (
    <BulkRolesContext.Provider value={roles}>
      {children}
    </BulkRolesContext.Provider>
  );
}
