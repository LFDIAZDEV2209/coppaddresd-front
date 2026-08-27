"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useT } from "@/providers/i18n-provider";

export type DataView = "table" | "cards";

interface ViewToggleProps {
  value: DataView;
  onValueChange: (view: DataView) => void;
  tableLabel?: string;
  cardsLabel?: string;
}

export function ViewToggle({
  value,
  onValueChange,
  tableLabel,
  cardsLabel,
}: ViewToggleProps) {
  const t = useT();
  const resolvedTableLabel = tableLabel ?? t("Vista tabla");
  const resolvedCardsLabel = cardsLabel ?? t("Vista tarjetas");

  return (
    <ToggleGroup
      multiple={false}
      value={[value]}
      onValueChange={(next) => {
        const view = next[0];
        if (view === "table" || view === "cards") onValueChange(view);
      }}
      aria-label={t("Cambiar entre vista de tabla y tarjetas")}
    >
      <ToggleGroupItem value="table" aria-label={resolvedTableLabel} title={resolvedTableLabel}>
        <Rows3 data-icon="inline-start" />
        <span className="hidden md:inline">{t("Tabla")}</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="cards" aria-label={resolvedCardsLabel} title={resolvedCardsLabel}>
        <LayoutGrid data-icon="inline-start" />
        <span className="hidden md:inline">{t("Tarjetas")}</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}