"use client";

import {
  ArrowRight,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  RefreshCw,
  Users,
} from "lucide-react";
import { rainbowStyle } from "@/lib/ui/rainbow";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import type { ProfessionalOptions } from "../hooks/use-professional-options";

/** Estado previo a seleccionar una agenda: orienta sin mostrar citas ni cifras ficticias. */
export function AgendaEmptyState({
  catalog,
  onChoose,
}: {
  catalog: ProfessionalOptions;
  onChoose: () => void;
}) {
  const t = useT();
  const empty =
    !catalog.loading && !catalog.error && catalog.items.length === 0;
  const title = catalog.error
    ? t("No pudimos cargar los profesionales")
    : empty
      ? t("No hay profesionales activos")
      : t("Elige un profesional para comenzar");
  const description = catalog.error
    ? t("Intenta actualizar la lista para consultar las agendas disponibles.")
    : empty
      ? t(
          "Cuando haya profesionales clínicos activos en tu alcance, podrás consultar sus agendas aquí.",
        )
      : t(
          "Revisa sus citas, consulta los horarios y organiza cada atención desde un mismo lugar.",
        );
  const benefits = [
    {
      icon: Users,
      tone: "sky",
      label: t("Citas y pacientes"),
      description: t("Identifica a quién atender y en qué horario."),
    },
    {
      icon: CalendarRange,
      tone: "teal",
      label: t("Agenda y calendario"),
      description: t("Consulta el día, la semana o el mes."),
    },
    {
      icon: ClipboardList,
      tone: "violet",
      label: t("Detalle de cada atención"),
      description: t("Accede a la información de cada cita."),
    },
  ];
  return (
    <section
      aria-labelledby="agenda-empty-title"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      <div className="grid min-w-0 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-12">
        <div className="min-w-0 max-w-xl">
          <h2
            id="agenda-empty-title"
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {title}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {catalog.loading ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <RefreshCw
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                {t("Cargando profesionales")}
              </p>
            ) : catalog.error || empty ? (
              <Button variant="outline" onClick={catalog.retry}>
                <RefreshCw data-icon="inline-start" />
                {catalog.error ? t("Reintentar") : t("Actualizar lista")}
              </Button>
            ) : (
              <>
                <Button onClick={onChoose}>
                  {t("Seleccionar profesional")}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {catalog.items.length === 1
                    ? t("1 profesional disponible")
                    : t("{count} profesionales disponibles", {
                        count: String(catalog.items.length),
                      })}
                </span>
              </>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="relative hidden h-48 items-center justify-center lg:flex"
        >
          <div className="absolute size-48 rounded-full bg-primary-soft/40" />
          <div className="relative w-52 rotate-[-4deg] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex h-11 items-center justify-between border-b border-border bg-primary-soft/50 px-4">
              <span className="h-2 w-16 rounded-full bg-primary/20" />
              <CalendarDays className="size-4 text-primary" />
            </div>
            <div className="grid grid-cols-7 gap-2 p-4">
              {Array.from({ length: 21 }, (_, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor:
                      i === 9
                        ? "var(--spectrum-sky-soft)"
                        : i === 17
                          ? "var(--spectrum-teal-soft)"
                          : "var(--muted)",
                  }}
                />
              ))}
            </div>
          </div>
          <span
            style={rainbowStyle("teal")}
            className="spectrum-tag absolute right-0 bottom-1 flex size-12 items-center justify-center rounded-2xl"
          >
            <Users className="size-5" />
          </span>
        </div>
      </div>
      <ul className="grid gap-5 border-t border-border bg-muted/15 p-6 sm:grid-cols-3 sm:p-6 lg:px-8">
        {benefits.map(({ icon: Icon, ...item }) => (
          <li key={item.label} className="flex min-w-0 gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `var(--spectrum-${item.tone}-soft)`,
                color: `var(--spectrum-${item.tone}-fg)`,
              }}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground">
                {item.label}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
