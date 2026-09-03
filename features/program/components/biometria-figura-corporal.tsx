"use client";

// --- Biometria Figura Corporal (react-muscle-highlighter) ---

import { useState, useRef, useCallback } from "react";
import Body from "react-muscle-highlighter";
import type { ExtendedBodyPart } from "react-muscle-highlighter";
import { Badge } from "@/components/ui/badge";
import type { BiometriaExacta } from "../types/erp";

type Zone = "cintura" | "cadera" | "talla" | "muneca" | "torso";

const TALLA_SLUGS = [
  "head",
  "hamstring",
  "calves",
  "tibialis",
  "feet",
  "knees",
  "ankles",
  "adductors",
] as const;

const slugToZone: Record<string, Zone> = {
  abs: "cintura",
  obliques: "cintura",
  gluteal: "cadera",
  quadriceps: "cadera",
  forearm: "muneca",
  chest: "torso",
  head: "talla",
  hamstring: "talla",
  calves: "talla",
  tibialis: "talla",
  feet: "talla",
  knees: "talla",
  ankles: "talla",
  adductors: "talla",
};

interface FiguraCorporalProps {
  gender: "male" | "female";
  imc: number | null;
  pctGrasa: number | null;
  iccAlto: boolean;
  exacta?: BiometriaExacta | null;
}

function bodyFatColor(gender: "male" | "female", pctGrasa: number | null): string {
  if (pctGrasa == null) return "#D1D5DB"; // muted gray
  if (gender === "male") {
    if (pctGrasa >= 30) return "#E87B2B";
    if (pctGrasa >= 25) return "#D4AF37";
    return "#10B981";
  }
  // female
  if (pctGrasa >= 38) return "#E87B2B";
  if (pctGrasa >= 32) return "#D4AF37";
  return "#10B981";
}

function abdColor(iccAlto: boolean, imc: number | null): string {
  if (iccAlto) return "var(--destructive)";
  if (imc != null && imc >= 30) return "#E87B2B";
  return "#10B981";
}

function hipColor(imc: number | null, pctGrasa: number | null): string {
  if (pctGrasa == null && imc == null) return "#D1D5DB";
  const val = pctGrasa ?? (imc != null ? imc * 2.5 : 0);
  if (val >= 35) return "#E87B2B";
  if (val >= 28) return "#D4AF37";
  return "#10B981";
}

function getGrasaCategory(pct: number | null, gender: "male" | "female"): string | null {
  if (pct == null) return null;
  if (gender === "male") {
    if (pct < 20) return "Óptimo";
    if (pct < 25) return "Normal";
    if (pct < 30) return "Alto";
    return "Obesidad";
  }
  if (pct < 25) return "Óptimo";
  if (pct < 32) return "Normal";
  if (pct < 38) return "Alto";
  return "Obesidad";
}

function categoryTone(category: string): string {
  const c = category.trim().toLowerCase();
  if (c.includes("obesidad") || c === "elevada" || c.includes("elevada")) return "bg-destructive-soft text-destructive border-destructive/20";
  if (c === "alto") return "bg-destructive-soft text-destructive border-destructive/20";
  if (c.includes("sobrepeso") || c.includes("prediabetes")) return "bg-warning-soft text-warning-foreground border-warning/20";
  if (c.includes("óptimo") || c.includes("optimo") || c.includes("normal")) return "bg-success-soft text-success-foreground border-success/20";
  if (c === "bajo peso") return "bg-info-soft text-info-foreground border-info/20";
  return "bg-muted text-muted-foreground border-border";
}

export function BiometriaFiguraCorporal({
  gender,
  imc,
  pctGrasa,
  iccAlto,
  exacta,
}: FiguraCorporalProps) {
  const bColor = bodyFatColor(gender, pctGrasa);
  const aColor = abdColor(iccAlto, imc);
  const hColor = hipColor(imc, pctGrasa);

  const imcScale =
    imc == null ? 1 : Math.max(1.0, Math.min(1.18, 1 + (imc - 22) * 0.008));

  const [hoverZone, setHoverZone] = useState<Zone | null>(null);
  const [pinnedZone, setPinnedZone] = useState<Zone | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeZone = pinnedZone ?? hoverZone;

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    if (pinnedZone) return;
    const target = e.target as HTMLElement;
    const id = target.getAttribute("id") || target.closest("[id]")?.getAttribute("id");
    const zone = id ? (slugToZone[id] ?? null) : null;
    if (zone) {
      setHoverZone(zone);
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      // hovering a non-measurable part or empty space -> keep no tooltip
      // only clear if hovering the wrapper background itself (id is wrapper)
      if ((e.target as HTMLElement) === wrapperRef.current) setHoverZone(null);
    }
  }, [pinnedZone]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (pinnedZone || !hoverZone) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [pinnedZone, hoverZone]);

  const handleMouseLeave = useCallback(() => {
    if (!pinnedZone) setHoverZone(null);
  }, [pinnedZone]);

  const handleBodyPress = useCallback((part: ExtendedBodyPart) => {
    const zone = part.slug ? (slugToZone[part.slug] ?? null) : null;
    if (!zone) return;
    setPinnedZone((prev) => (prev === zone ? null : zone));
    setHoverZone(null);
  }, []);

  const highlight: { stroke: string; strokeWidth: number } | undefined =
    activeZone
      ? { stroke: "var(--primary)", strokeWidth: 1.5 }
      : undefined;

  const data: ExtendedBodyPart[] = [];

  // Cintura: abs + obliques get abdomen risk color
  data.push({ slug: "abs", color: aColor, ...(activeZone === "cintura" ? { styles: highlight } : {}) });
  data.push({ slug: "obliques", color: aColor, ...(activeZone === "cintura" ? { styles: highlight } : {}) });

  // Cadera: gluteal fill by hColor + quadriceps (upper thigh) as cadera hit-area
  if (hColor !== "#D1D5DB") data.push({ slug: "gluteal", color: hColor, ...(activeZone === "cadera" ? { styles: highlight } : {}) });
  else if (activeZone === "cadera") data.push({ slug: "gluteal", styles: highlight });
  if (activeZone === "cadera") data.push({ slug: "quadriceps", styles: highlight });

  // Chest / upper body reflects body-fat tier
  if (pctGrasa != null || imc != null) {
    if (bColor !== "#D1D5DB") data.push({ slug: "chest", color: bColor, ...(activeZone === "torso" ? { styles: highlight } : {}) });
    else if (activeZone === "torso") data.push({ slug: "chest", color: "#D1D5DB", styles: highlight });
  } else if (activeZone === "torso") {
    data.push({ slug: "chest", styles: highlight });
  }

  // Forearm (muñeca) — always present for hover highlight even if no distinct fill
  if (activeZone === "muneca") data.push({ slug: "forearm", styles: highlight });

  // Head + legs → Talla (height): highlight all leg/head parts when talla is active
  if (activeZone === "talla") {
    for (const slug of TALLA_SLUGS) {
      // avoid duplicating slugs already in data (none overlap with talla except none)
      if (!data.some((d) => d.slug === slug)) data.push({ slug: slug as typeof data[number]["slug"], styles: highlight });
    }
  }

  const tooltip = activeZone ? buildTooltipContent(activeZone, exacta, gender, iccAlto) : null;

  const wrapperW = wrapperRef.current?.clientWidth ?? 200;
  const clampedX = Math.min(Math.max(tipPos.x + 12, 4), wrapperW - 4 - 180);
  const clampedY = Math.max(tipPos.y + 12, 4);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={wrapperRef}
        onMouseOver={handleMouseOver}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `scaleX(${imcScale})`,
          transformOrigin: "center",
          transition: "transform 200ms ease",
        }}
        className="relative w-full max-w-[200px] [&_path[id=abs]]:cursor-pointer [&_path[id=obliques]]:cursor-pointer [&_path[id=gluteal]]:cursor-pointer [&_path[id=forearm]]:cursor-pointer [&_path[id=chest]]:cursor-pointer [&_path[id=head]]:cursor-pointer [&_path[id=quadriceps]]:cursor-pointer [&_path[id=hamstring]]:cursor-pointer [&_path[id=calves]]:cursor-pointer [&_path[id=tibialis]]:cursor-pointer [&_path[id=feet]]:cursor-pointer [&_path[id=knees]]:cursor-pointer [&_path[id=ankles]]:cursor-pointer [&_path[id=adductors]]:cursor-pointer"
      >
        <Body
          gender={gender}
          side="front"
          data={data}
          scale={0.95}
          border="none"
          defaultFill="#FDDBB4"
          defaultStroke="none"
          onBodyPartPress={handleBodyPress}
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 min-w-[180px] max-w-[210px] rounded-xl border border-border bg-card p-3 shadow-lg"
            style={{ left: clampedX, top: clampedY }}
          >
            <p className="mb-2 text-xs font-semibold text-foreground">{tooltip.title}</p>
            <div className="flex flex-col gap-1.5">
              {tooltip.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">{r.value}</span>
                    {r.category && (
                      <Badge className={`border text-[10px] ${categoryTone(r.category)}`}>{r.category}</Badge>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {pinnedZone && (
              <p className="mt-2 text-[10px] text-muted-foreground">Toca de nuevo para cerrar</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildTooltipContent(
  zone: Zone,
  exacta: BiometriaExacta | null | undefined,
  gender: "male" | "female",
  iccAlto: boolean,
): { title: string; rows: { label: string; value: string; category: string | null }[] } | null {
  if (!exacta) return null;
  if (zone === "cintura") {
    const waistVal = exacta.waist != null ? `${exacta.waist} cm` : "—";
    const iccVal = exacta.icc != null ? exacta.icc.toFixed(2) : "—";
    return {
      title: "Cintura",
      rows: [
        { label: "Cintura", value: waistVal, category: null },
        { label: "ICC", value: iccVal, category: iccAlto ? "Alto" : "Normal" },
      ],
    };
  }
  if (zone === "cadera") {
    return {
      title: "Cadera",
      rows: [{ label: "Cadera", value: exacta.hip != null ? `${exacta.hip} cm` : "—", category: null }],
    };
  }
  if (zone === "talla") {
    return {
      title: "Talla",
      rows: [{ label: "Altura", value: exacta.height != null ? `${exacta.height} cm` : "—", category: null }],
    };
  }
  if (zone === "muneca") {
    return {
      title: "Muñeca",
      rows: [{ label: "Muñeca", value: exacta.wrist != null ? `${exacta.wrist} cm` : "—", category: null }],
    };
  }
  if (zone === "torso") {
    const grasaCat = getGrasaCategory(exacta.pct_grasa ?? null, gender);
    return {
      title: "Composición",
      rows: [
        { label: "% Grasa", value: exacta.pct_grasa != null ? `${exacta.pct_grasa.toFixed(1)}%` : "—", category: grasaCat },
        { label: "% Magra", value: exacta.pct_magra != null ? `${exacta.pct_magra.toFixed(1)}%` : "—", category: null },
      ],
    };
  }
  return null;
}
