"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  tableLabel = "Vista tabla",
  cardsLabel = "Vista tarjetas",
}: ViewToggleProps) {
  return (
    <ToggleGroup
      multiple={false}
      value={[value]}
      onValueChange={(next) => {
        const view = next[0];
        if (view === "table" || view === "cards") onValueChange(view);
      }}
      aria-label="Cambiar entre vista de tabla y tarjetas"
    >
      <ToggleGroupItem value="table" aria-label={tableLabel} title={tableLabel}>
        <Rows3 data-icon="inline-start" />
        <span className="hidden md:inline">Tabla</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="cards" aria-label={cardsLabel} title={cardsLabel}>
        <LayoutGrid data-icon="inline-start" />
        <span className="hidden md:inline">Tarjetas</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}