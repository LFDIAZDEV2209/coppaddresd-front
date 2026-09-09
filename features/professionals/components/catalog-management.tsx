"use client";

import { useT } from "@/providers/i18n-provider";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BadgePlus,
  BookOpenText,
  Loader2,
  Pencil,
  Power,
  Stethoscope,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/http";
import {
  createProfessionalType,
  createSpecialty,
  fetchProfessionalTypes,
  fetchSpecialties,
  updateProfessionalType,
  updateSpecialty,
  type ProfessionalTypeDto,
  type SpecialtyDto,
} from "../services/professional-catalogs-service";

interface CatalogForm {
  code: string;
  name: string;
  category: string;
  description: string;
}

const EMPTY_FORM: CatalogForm = {
  code: "",
  name: "",
  category: "",
  description: "",
};

/**
 * Gestión admin de catálogos de tipos de profesional y especialidades
 * (solo con System.AdminSettings). Los códigos son inmutables; el
 * desactivado es soft (IsActive). El seed del sistema nunca pisa estas
 * ediciones (ON CONFLICT DO NOTHING).
 */
export function CatalogManagement() {
  const t = useT();
  const [types, setTypes] = useState<ProfessionalTypeDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    kind: "type" | "specialty";
    editing: ProfessionalTypeDto | SpecialtyDto | null;
  } | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesData, specialtiesData] = await Promise.all([
        fetchProfessionalTypes(),
        fetchSpecialties(),
      ]);
      setTypes(typesData);
      setSpecialties(specialtiesData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los catálogos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void Promise.all([fetchProfessionalTypes(), fetchSpecialties()])
      .then(([typesData, specialtiesData]) => {
        if (cancelled) return;
        setTypes(typesData);
        setSpecialties(specialtiesData);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar los catálogos.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const openCreate = (kind: "type" | "specialty") => {
    setForm(EMPTY_FORM);
    setDialog({ kind, editing: null });
  };

  const openEdit = (
    kind: "type" | "specialty",
    editing: ProfessionalTypeDto | SpecialtyDto,
  ) => {
    setForm({
      code: editing.code,
      name: editing.name,
      category: "category" in editing ? editing.category : "",
      description: editing.description ?? "",
    });
    setDialog({ kind, editing });
  };

  const submit = async () => {
    if (!dialog) return;
    setSaving(true);
    setError(null);
    try {
      if (dialog.kind === "type") {
        if (dialog.editing) {
          await updateProfessionalType(dialog.editing.id, {
            name: form.name.trim(),
            description: form.description.trim() || null,
          });
        } else {
          await createProfessionalType({
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description.trim() || null,
          });
        }
      } else {
        if (dialog.editing) {
          await updateSpecialty(dialog.editing.id, {
            name: form.name.trim(),
            category: form.category.trim(),
            description: form.description.trim() || null,
          });
        } else {
          await createSpecialty({
            code: form.code.trim(),
            name: form.name.trim(),
            category: form.category.trim() || "General",
            description: form.description.trim() || null,
          });
        }
      }
      setDialog(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo guardar el catálogo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (
    kind: "type" | "specialty",
    item: ProfessionalTypeDto | SpecialtyDto,
  ) => {
    setTogglingId(item.id);
    setError(null);
    try {
      if (kind === "type") {
        await updateProfessionalType(item.id, { isActive: !item.isActive });
      } else {
        await updateSpecialty(item.id, { isActive: !item.isActive });
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "No se pudo cambiar el estado del catálogo.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section
      className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={t("Gestión de catálogos profesionales")}
    >
      <SectionHeader
        title={t("Catálogos del sistema")}
        description={t(
          "Gestiona tipos de profesional y especialidades (configuración crítica — Super Admin)",
        )}
        icon={BookOpenText}
        variant="primary"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            onClick={() => openCreate("type")}
          >
            <BadgePlus data-icon="inline-start" />
            Nuevo tipo
          </Button>
        }
      />

      {error && (
        <p
          className="mx-4 mt-4 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 p-5 md:grid-cols-2">
          {/* Tipos de profesional */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="size-4 text-primary" />
                Tipos de profesional
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openCreate("type")}
              >
                <BadgePlus data-icon="inline-start" />
                Agregar
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Nombre")}</TableHead>
                    <TableHead>{t("Código")}</TableHead>
                    <TableHead className="w-24">{t("Estado")}</TableHead>
                    <TableHead className="w-20 text-right">
                      {t("Acciones")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <span className="text-sm font-medium">{type.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                          {type.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            type.isActive
                              ? "bg-success text-white"
                              : "bg-destructive-soft text-destructive",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              type.isActive ? "bg-white/80" : "bg-destructive",
                            )}
                          />
                          {type.isActive ? t("Activo") : t("Inactivo")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${type.name}`}
                            onClick={() => openEdit("type", type)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              type.isActive
                                ? `Desactivar ${type.name}`
                                : `Activar ${type.name}`
                            }
                            disabled={togglingId === type.id}
                            onClick={() => toggleActive("type", type)}
                          >
                            {togglingId === type.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Power />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Especialidades */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <BookOpenText className="size-4 text-primary" />
                Especialidades
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openCreate("specialty")}
              >
                <BadgePlus data-icon="inline-start" />
                Agregar
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Nombre")}</TableHead>
                    <TableHead>{t("Categoría")}</TableHead>
                    <TableHead className="w-24">{t("Estado")}</TableHead>
                    <TableHead className="w-20 text-right">
                      {t("Acciones")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialties.map((specialty) => (
                    <TableRow key={specialty.id}>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {specialty.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {specialty.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            specialty.isActive
                              ? "bg-success text-white"
                              : "bg-destructive-soft text-destructive",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              specialty.isActive
                                ? "bg-white/80"
                                : "bg-destructive",
                            )}
                          />
                          {specialty.isActive ? t("Activo") : t("Inactivo")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${specialty.name}`}
                            onClick={() => openEdit("specialty", specialty)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              specialty.isActive
                                ? `Desactivar ${specialty.name}`
                                : `Activar ${specialty.name}`
                            }
                            disabled={togglingId === specialty.id}
                            onClick={() => toggleActive("specialty", specialty)}
                          >
                            {togglingId === specialty.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Power />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.editing
                ? `Editar ${dialog.kind === "type" ? "tipo de profesional" : "especialidad"}`
                : `Nuevo ${dialog?.kind === "type" ? "tipo de profesional" : "especialidad"}`}
            </DialogTitle>
            <DialogDescription>
              {dialog?.editing
                ? "El código no se puede modificar (identidad del catálogo)."
                : "El código se normaliza en mayúsculas y no se puede modificar después."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="catalog-code">{t("Código")}</Label>
              <Input
                id="catalog-code"
                value={form.code}
                disabled={Boolean(dialog?.editing)}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={t("EJEMPLO: FONOAUDIOLOGO")}
                className="font-mono text-sm"
              />
            </div>
            {dialog?.kind === "specialty" && (
              <div className="grid gap-2">
                <Label htmlFor="catalog-category">{t("Categoría")}</Label>
                <Input
                  id="catalog-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder={t("Ej. Terapia, Medicina, Nutrición")}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="catalog-name">{t("Nombre")}</Label>
              <Input
                id="catalog-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("Nombre visible en la plataforma")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="catalog-description">{t("Descripción")}</Label>
              <Input
                id="catalog-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("Opcional")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button disabled={saving || !form.name.trim()} onClick={submit}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
