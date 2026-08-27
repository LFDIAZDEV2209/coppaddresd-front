"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ClipboardList,
  FileText,
  Filter,
  Layers,
  ListChecks,
  Pencil,
  Plus,
  Timer,
  ToggleLeft,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatCard } from "@/components/feedback/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCatalog } from "../../hooks/use-health-tests";
import { CATEGORY_LABELS } from "../../lib/domain";
import type { HealthTest, TestCategory } from "../../types";
import { categoryAccent, severityHex } from "../shared/colors";
import { StatSkeleton } from "../shared/module-chart-card";
import { ModuleErrorState, ModuleEmptyState } from "../shared/module-states";

/**
 * Catálogo y parametrización de tests: la batería de la aplicación de
 * pacientes pasa a administrarse desde el ERP (acciones mock por ahora).
 */
export function CatalogPage() {
  const t = useT();
  const { data, loading, error, reload } = useCatalog();
  const [category, setCategory] = useState<TestCategory | "all">("all");
  const [onlyActive, setOnlyActive] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tests.filter((test) => {
      if (category !== "all" && test.category !== category) return false;
      if (onlyActive && test.state !== "activo") return false;
      return true;
    });
  }, [data, category, onlyActive]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="h-[76px] rounded-t-xl bg-muted/70" />
        <StatSkeleton count={4} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  const activeCount = data.tests.filter((x) => x.state === "activo").length;
  const requiredCount = data.tests.filter((x) => x.required).length;
  const ruleCount = data.tests.reduce((acc, x) => acc + x.alertRules.length, 0);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title={t("Catálogo de tests")}
        description={t(
          "Parametrización de las evaluaciones de salud: configuración, reglas de alerta e indicadores",
        )}
        icon={FileText}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          >
            <Plus data-icon="inline-start" />
            {t("Nuevo test")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("Tests en catálogo")}
          value={String(data.tests.length)}
          icon={ListChecks}
          variant="primary"
          context={t("Batería de evaluación inicial")}
        />
        <StatCard
          label={t("Activos")}
          value={String(activeCount)}
          icon={ToggleLeft}
          variant="success"
          context={t("Disponibles para asignación")}
        />
        <StatCard
          label={t("Obligatorios")}
          value={String(requiredCount)}
          icon={Layers}
          variant="info"
          context={t("Incluidos por defecto en la batería")}
        />
        <StatCard
          label={t("Reglas de alerta")}
          value={String(ruleCount)}
          icon={AlertTriangle}
          variant="warning"
          context={t("Umbrales configurados")}
        />
      </div>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Catálogo")}
          description={t("Filtra por categoría o estado")}
          icon={Filter}
          variant="primary"
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory((value ?? "all") as TestCategory | "all")
                }
              >
                <SelectTrigger
                  className="h-8 w-44 border-white/25 bg-white/15 text-white data-placeholder:text-white/70 [&>svg]:text-white/70"
                  aria-label={t("Filtrar por categoría")}
                >
                  <SelectValue>
                    {category === "all"
                      ? t("Todas las categorías")
                      : CATEGORY_LABELS[category]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("Todas las categorías")}
                  </SelectItem>
                  {(Object.keys(CATEGORY_LABELS) as TestCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                onClick={() => setOnlyActive((v) => !v)}
                aria-pressed={onlyActive}
              >
                {onlyActive ? t("Solo activos") : t("Todos los estados")}
              </Button>
            </div>
          }
        />
        {filtered.length === 0 ? (
          <ModuleEmptyState
            title={t("Sin tests que mostrar")}
            description={t("Ningún test coincide con los filtros.")}
            filtered={category !== "all" || onlyActive}
            onClear={() => {
              setCategory("all");
              setOnlyActive(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((test) => (
              <TestCatalogCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </section>

      <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-[11.5px] text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        {t(
          "Las acciones de edición son simuladas en esta versión; la estructura queda lista para conectar el CRUD real.",
        )}
      </p>
    </div>
  );
}

function TestCatalogCard({ test }: { test: HealthTest }) {
  const t = useT();
  const accent = categoryAccent(test.category);
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ backgroundColor: `${accent}1A` }}
          >
            {test.icon}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate text-[13px] font-bold text-foreground">
              {test.name}
            </h3>
            <span className="text-[11px] font-medium" style={{ color: accent }}>
              {test.code} · {CATEGORY_LABELS[test.category]}
            </span>
          </div>
        </div>
        <TestActions test={test} />
      </div>

      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        {test.description}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ToggleLeft className="size-3.5" style={{ color: accent }} />
          {test.state === "activo" ? t("Activo") : t("Inactivo")} · v
          {test.version}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="size-3.5" style={{ color: accent }} />
          {test.required ? t("Obligatorio") : t("Opcional")}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Timer className="size-3.5" style={{ color: accent }} />
          {test.timeMinutes} min · {test.questionsCount} {t("preguntas")}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" style={{ color: accent }} />
          {test.frequency}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border pt-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Indicadores")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {test.indicators.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {t("Sin indicadores asociados")}
            </span>
          ) : (
            test.indicators.map((id) => (
              <span
                key={id}
                className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary"
              >
                {id}
              </span>
            ))
          )}
        </div>
      </div>

      {test.alertRules.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="size-3" />
            {t("Reglas de alerta")}
          </span>
          <ul className="flex flex-col gap-1">
            {test.alertRules.map((rule, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-[11px] text-muted-foreground"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: severityHex(rule.severity) }}
                />
                {rule.operator === "gte" ? "≥" : "≤"} {rule.threshold} ·{" "}
                {rule.severity}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        {test.sections.map((section) => (
          <span
            key={section}
            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
          >
            {section}
          </span>
        ))}
      </div>
    </article>
  );
}

function TestActions({ test }: { test: HealthTest }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Acciones de ${test.name}`}
          />
        }
      >
        <Pencil />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {}}>
          <Pencil />
          {t("Editar configuración")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>
          <ClipboardList />
          {t("Duplicar test")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-warning" onClick={() => {}}>
          <ToggleLeft />
          {test.state === "activo" ? t("Desactivar") : t("Activar")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => {}}>
          <ArrowRight />
          {t("Eliminar (mock)")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
