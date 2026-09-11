"use client";

import { useMemo } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATE_NAMES } from "@/lib/geo/usa-states-paths";
import type { HealthGeoCity } from "../../services/health-geo-service";
import type { HealthGeoFilter } from "../../types";

interface GeoFilterSelectProps {
  cities: HealthGeoCity[];
  value: HealthGeoFilter;
  onChange: (filter: HealthGeoFilter) => void;
  /** Mientras el dashboard recarga con el nuevo filtro. */
  updating?: boolean;
}

function encodeFilter(value: HealthGeoFilter): string {
  if (value.cityId) return `city:${value.cityId}`;
  if (value.stateCode) return `state:${value.stateCode}`;
  return "all";
}

/**
 * Selector acumulado estado → ciudad que gobierna el mapa y las gráficas.
 * Las opciones siempre provienen del geo global (endpoint /geo sin filtro).
 */
export function GeoFilterSelect({
  cities,
  value,
  onChange,
  updating,
}: GeoFilterSelectProps) {
  const t = useT();

  const groups = useMemo(() => {
    const map = new Map<string, HealthGeoCity[]>();
    for (const c of cities) {
      if (!c.stateAbbr) continue;
      const abbr = c.stateAbbr.toUpperCase();
      map.set(abbr, [...(map.get(abbr) ?? []), c]);
    }
    return [...map.entries()]
      .sort((a, b) =>
        (STATE_NAMES[a[0]] ?? a[0]).localeCompare(STATE_NAMES[b[0]] ?? b[0]),
      )
      .map(([abbr, list]) => ({
        abbr,
        cities: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [cities]);

  const city = value.cityId
    ? cities.find((c) => c.cityId === value.cityId)
    : null;
  const label = city
    ? `${city.name}${city.stateAbbr ? `, ${city.stateAbbr.toUpperCase()}` : ""}`
    : value.stateCode
      ? t("Todo {state}", {
          state:
            STATE_NAMES[value.stateCode.toUpperCase()] ?? value.stateCode,
        })
      : t("Todas las regiones");

  const handleChange = (next: string) => {
    if (next.startsWith("state:")) {
      onChange({ stateCode: next.slice(6), cityId: null });
      return;
    }
    if (next.startsWith("city:")) {
      const cityId = next.slice(5);
      const found = cities.find((c) => c.cityId === cityId);
      onChange({
        stateCode: found?.stateAbbr?.toUpperCase() ?? null,
        cityId,
      });
      return;
    }
    onChange({ stateCode: null, cityId: null });
  };

  return (
    <Select value={encodeFilter(value)} onValueChange={(v) => handleChange(String(v))}>
      <SelectTrigger
        className="h-8 w-[200px] border-white/25 bg-white/10 text-white transition-colors hover:bg-white/15"
        aria-label={t("Filtrar por región")}
      >
        {updating ? (
          <Loader2 className="mr-2 size-3.5 animate-spin text-white/80" />
        ) : (
          <MapPin className="mr-2 size-3.5 text-white/80" />
        )}
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("Todas las regiones")}</SelectItem>
        {groups.map((group) => (
          <SelectGroup key={group.abbr}>
            <SelectLabel>{STATE_NAMES[group.abbr] ?? group.abbr}</SelectLabel>
            <SelectItem value={`state:${group.abbr}`}>
              {t("Todo {state}", {
                state: STATE_NAMES[group.abbr] ?? group.abbr,
              })}
            </SelectItem>
            {group.cities.map(
              (c) =>
                c.cityId && (
                  <SelectItem key={c.cityId} value={`city:${c.cityId}`}>
                    {c.name}
                    <span className="ml-2 text-[10px] tabular-nums text-muted-foreground">
                      {c.count}
                    </span>
                  </SelectItem>
                ),
            )}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
