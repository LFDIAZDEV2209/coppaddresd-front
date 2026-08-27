"use client";

import { useState } from "react";
import { Zap, RefreshCw, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useXpRules } from "../hooks/use-xp-rules";
import { useAuth } from "@/providers/auth-provider";
import type { XpRule, UpdateXpRuleInput } from "../types";

export function ProgramXpRulesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Program.Edit");

  const { rules, loading, actionLoading, error, updateRule, retry } =
    useXpRules();

  const [editing, setEditing] = useState<XpRule | null>(null);
  const [form, setForm] = useState<UpdateXpRuleInput>({
    baseXp: null,
    multiplier: 1,
    maxPerDay: null,
    maxPerWeek: null,
    requiresValidation: false,
    active: true,
    validUntil: null,
  });

  const openEdit = (rule: XpRule) => {
    setEditing(rule);
    setForm({
      baseXp: rule.baseXp,
      multiplier: rule.multiplier,
      maxPerDay: rule.maxPerDay,
      maxPerWeek: rule.maxPerWeek,
      requiresValidation: rule.requiresValidation,
      active: rule.active,
      validUntil: rule.validUntil,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    await updateRule(editing.code, form);
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Reglas de XP"
        description="Configura las reglas de experiencia del programa de gamificación"
        icon={Zap}
      />

      {/* Filtros / acciones */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
        aria-label="Acciones de reglas XP"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Catálogo de reglas XP</h2>
            <p className="text-xs text-muted-foreground">
              Define puntos base, multiplicadores y topes por regla.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={loading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={loading ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        </div>
      </section>

      {/* Contenido */}
      {loading ? (
        <XpRulesSkeleton />
      ) : error ? (
        <XpRulesErrorState message={error} onRetry={retry} />
      ) : rules.length > 0 ? (
        <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${rules.length} ${rules.length === 1 ? "regla" : "reglas"} configuradas`}
            description="Catálogo completo"
            icon={Zap}
            variant="primary"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Categoría
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    XP base
                  </TableHead>
                  <TableHead className="text-right">Multiplicador</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    Máx/día
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    Máx/semana
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Validación</TableHead>
                  <TableHead>Estado</TableHead>
                  {canEdit && (
                    <TableHead className="text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono text-sm">
                      {rule.code}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{rule.name}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {rule.category}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm">
                      {rule.baseXp ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      ×{rule.multiplier}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm">
                      {rule.maxPerDay ?? "∞"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm">
                      {rule.maxPerWeek ?? "∞"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant={rule.requiresValidation ? "default" : "outline"}
                      >
                        {rule.requiresValidation ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rule.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {rule.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Editar"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <XpRulesEmptyState />
      )}

      {/* Dialog de edición */}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar regla XP</DialogTitle>
            <DialogDescription>
              Modifica los parámetros de la regla &quot;{editing?.name}&quot;.
              Los cambios solo afectan otorgamientos futuros.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">XP base</label>
              <Input
                type="number"
                min={0}
                value={form.baseXp ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    baseXp: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Null = puntos de plantilla"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Multiplicador</label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={form.multiplier}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    multiplier: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Máx por día</label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxPerDay ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxPerDay: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Sin límite"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Máx por semana</label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxPerWeek ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxPerWeek: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Requiere validación clínica
              </label>
              <Switch
                checked={form.requiresValidation}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, requiresValidation: v }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Activa</label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, active: v }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Vigencia hasta
              </label>
              <Input
                type="date"
                value={form.validUntil ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    validUntil: e.target.value || null,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-componentes ---

function XpRulesSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border py-4 last:border-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="ml-auto">
            <Skeleton className="size-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function XpRulesErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft/40 py-14 text-center">
      <p className="text-sm font-semibold text-destructive">
        No pudimos cargar las reglas de XP
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Reintentar
      </Button>
    </div>
  );
}

function XpRulesEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Zap className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">No hay reglas de XP</p>
        <p className="text-xs text-muted-foreground">
          Las reglas de experiencia se configurarán automáticamente al
          inicializar el programa.
        </p>
      </div>
    </div>
  );
}
