"use client";

import { ShieldCheck, Plus, Key } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface Role {
  id: string;
  name: string;
  description: string;
  usersCount: number;
  permissionsCount: number;
  color: string;
  icon: string;
}

const roles: Role[] = [
  { id: "r1", name: "Superadministrador", description: "Acceso total al sistema", usersCount: 2, permissionsCount: 15, color: "#123B63", icon: "👑" },
  { id: "r2", name: "Administrador", description: "Gestión de usuarios y agentes", usersCount: 5, permissionsCount: 10, color: "#1F6E9F", icon: "🛡️" },
  { id: "r3", name: "Analista", description: "Consulta de datos y reportes", usersCount: 12, permissionsCount: 6, color: "#0E7490", icon: "📊" },
  { id: "r4", name: "Soporte", description: "Atención y resolución de tickets", usersCount: 8, permissionsCount: 4, color: "#10B981", icon: "🎧" },
];

const permissionGroups = [
  {
    name: "USUARIOS",
    permissions: ["usuarios.ver", "usuarios.crear", "usuarios.editar", "usuarios.eliminar"],
  },
  {
    name: "AGENTES",
    permissions: ["agentes.ver", "agentes.crear", "agentes.editar", "agentes.configurar", "agentes.eliminar"],
  },
  {
    name: "INTEGRACIONES",
    permissions: ["integraciones.ver", "integraciones.conectar", "integraciones.configurar"],
  },
  {
    name: "SISTEMA",
    permissions: ["sistema.configurar", "sistema.seguridad", "sistema.auditoria"],
  },
];

export function RolesPageContent() {
  const [selectedRole, setSelectedRole] = useState<string>("r1");
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(
    new Set(permissionGroups.flatMap((g) => g.permissions))
  );

  const togglePermission = (perm: string) => {
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleGroup = (perms: string[]) => {
    const allChecked = perms.every((p) => checkedPermissions.has(p));
    setCheckedPermissions((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (allChecked) next.delete(p);
        else next.add(p);
      });
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Roles y permisos"
        description="Administración de roles y permisos del sistema"
        icon={ShieldCheck}
        actions={
          <Button
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary-strong"
          >
            <Plus className="size-[15px]" />
            Nuevo rol
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
        <div className="flex flex-col gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`flex flex-col gap-3 rounded-[14px] border p-4 text-left transition-all ${
                selectedRole === role.id
                  ? "border-primary bg-primary-soft shadow-sm"
                  : "border-border bg-card hover:border-border-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex size-[38px] items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${role.color}15` }}
                >
                  {role.icon}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {role.usersCount} usuarios
                </Badge>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">
                  {role.name}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {role.description}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Key className="size-3" />
                <span>{role.permissionsCount} permisos</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Permisos de {roles.find((r) => r.id === selectedRole)?.name}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Configura los permisos para este rol
              </p>
            </div>
            <Input
              placeholder="Buscar permisos..."
              className="h-8 w-[250px] text-[12px]"
            />
          </div>

          <div className="flex flex-1 flex-col gap-0 overflow-y-auto p-4">
            <label className="flex items-center gap-2 pb-3">
              <Checkbox
                checked={checkedPermissions.size === permissionGroups.flatMap((g) => g.permissions).length}
                onCheckedChange={() => {
                  const all = permissionGroups.flatMap((g) => g.permissions);
                  const allChecked = all.every((p) => checkedPermissions.has(p));
                  if (allChecked) setCheckedPermissions(new Set());
                  else setCheckedPermissions(new Set(all));
                }}
              />
              <span className="text-[12px] font-semibold text-foreground">
                Seleccionar todos
              </span>
            </label>

            <Separator />

            <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
              {permissionGroups.map((group) => {
                const allChecked = group.permissions.every((p) =>
                  checkedPermissions.has(p)
                );
                return (
                  <div key={group.name} className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={() => toggleGroup(group.permissions)}
                      />
                      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                        {group.name}
                      </span>
                    </label>
                    {group.permissions.map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-2 py-0.5"
                      >
                        <Checkbox
                          checked={checkedPermissions.has(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                        />
                        <span className="text-[12px] text-foreground">
                          {perm}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Button variant="outline" size="sm">
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary-strong"
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
