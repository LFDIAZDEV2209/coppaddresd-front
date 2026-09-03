"use client";

// --- Biometria Figura Corporal (react-muscle-highlighter) ---

import Body from "react-muscle-highlighter";
import type { ExtendedBodyPart } from "react-muscle-highlighter";

interface FiguraCorporalProps {
  gender: "male" | "female";
  imc: number | null;
  pctGrasa: number | null;
  iccAlto: boolean;
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

export function BiometriaFiguraCorporal({
  gender,
  imc,
  pctGrasa,
  iccAlto,
}: FiguraCorporalProps) {
  const bColor = bodyFatColor(gender, pctGrasa);
  const aColor = abdColor(iccAlto, imc);
  const hColor = hipColor(imc, pctGrasa);

  const imcScale =
    imc == null ? 1 : Math.max(1.0, Math.min(1.18, 1 + (imc - 22) * 0.008));

  const data: ExtendedBodyPart[] = [];

  // Abdomen: abs + obliques get abdomen risk color (highest priority)
  data.push({ slug: "abs", color: aColor });
  data.push({ slug: "obliques", color: aColor });

  // Chest / upper body reflects body-fat tier
  if (pctGrasa != null || imc != null) {
    if (bColor !== "#D1D5DB") data.push({ slug: "chest", color: bColor });
  }

  // Hips/gluteal
  if (hColor !== "#D1D5DB") data.push({ slug: "gluteal", color: hColor });

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          transform: `scaleX(${imcScale})`,
          transformOrigin: "center",
          transition: "transform 200ms ease",
        }}
        className="w-full max-w-[200px]"
      >
        <Body
          gender={gender}
          side="front"
          data={data}
          scale={1.15}
          border="none"
          defaultFill="#FDDBB4"
          defaultStroke="none"
        />
      </div>
      {/* Caption */}
      <div className="text-center">
        <span className="text-[11px] font-semibold text-foreground">
          {gender === "male" ? "Hombre" : "Mujer"}
        </span>
        {(imc != null || pctGrasa != null) && (
          <span className="ml-1 text-[11px] text-muted-foreground">
            · {imc != null ? `IMC ${imc.toFixed(1)}` : ""}
            {imc != null && pctGrasa != null ? " · " : ""}
            {pctGrasa != null ? `Grasa ${pctGrasa.toFixed(1)}%` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
