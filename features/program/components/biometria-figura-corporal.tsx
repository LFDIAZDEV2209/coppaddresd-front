"use client";

// --- Biometria Figura Corporal (SVG body figure) ---
// Ported from ANTARES_Biometria_Corporal.html. Reusable component.

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

function torsoWidth(imc: number | null): number {
  if (imc == null) return 24;
  // Scale from 20 (BMI 18) to 38 (BMI 40+)
  return Math.max(20, Math.min(38, 20 + (imc - 18) * 0.82));
}

function hipWidth(imc: number | null, gender: "male" | "female"): number {
  const base = gender === "male" ? 22 : 26;
  if (imc == null) return base;
  return Math.max(base, Math.min(36, base + (imc - 18) * 0.55));
}

function abdomenRx(imc: number | null): number {
  if (imc == null) return 10;
  return Math.max(10, Math.min(18, 10 + (imc - 18) * 0.36));
}

function abdomenRy(imc: number | null): number {
  if (imc == null) return 6;
  return Math.max(6, Math.min(14, 6 + (imc - 18) * 0.36));
}

export function BiometriaFiguraCorporal({
  gender,
  imc,
  pctGrasa,
  iccAlto,
}: FiguraCorporalProps) {
  const skin = "#FDDBB4";
  const bColor = bodyFatColor(gender, pctGrasa);
  const aColor = abdColor(iccAlto, imc);
  const hColor = hipColor(imc, pctGrasa);

  const tw = torsoWidth(imc);
  const hw = hipWidth(imc, gender);
  const arx = abdomenRx(imc);
  const ary = abdomenRy(imc);

  return (
    <svg viewBox="0 0 120 280" className="mx-auto h-auto max-h-[320px] w-auto">
      {/* Head */}
      <circle cx="60" cy="28" r="18" fill={skin} />

      {/* Neck */}
      <rect x="54" y="46" width="12" height="10" rx="3" fill={skin} />

      {/* Shoulders */}
      <ellipse cx={60 - tw / 2 - 4} cy="66" rx="6" ry="5" fill={skin} />
      <ellipse cx={60 + tw / 2 + 4} cy="66" rx="6" ry="5" fill={skin} />

      {/* Arms */}
      <rect x={60 - tw / 2 - 10} y="70" width="6" height="55" rx="3" fill={skin} />
      <rect x={60 + tw / 2 + 4} y="70" width="6" height="55" rx="3" fill={skin} />

      {/* Hands */}
      <ellipse cx={60 - tw / 2 - 7} cy="128" rx="4" ry="5" fill={skin} />
      <ellipse cx={60 + tw / 2 + 7} cy="128" rx="4" ry="5" fill={skin} />

      {/* Torso (body fat color) */}
      <path
        d={`M ${60 - tw / 2} 58
            Q ${60 - tw / 2 - 2} 75, ${60 - tw / 2} 95
            L ${60 - tw / 2} 130
            Q ${60 - tw / 2 - 1} 155, ${60 - hw / 2 - 2} 175
            L ${60 + hw / 2 + 2} 175
            Q ${60 + tw / 2 + 1} 155, ${60 + tw / 2} 130
            L ${60 + tw / 2} 95
            Q ${60 + tw / 2 + 2} 75, ${60 + tw / 2} 58
            Z`}
        fill={bColor}
        opacity={0.85}
      />

      {/* Abdomen overlay */}
      <ellipse
        cx="60"
        cy="120"
        rx={arx}
        ry={ary}
        fill={aColor}
        opacity={0.6}
      />

      {/* Hips */}
      <ellipse
        cx="60"
        cy="172"
        rx={hw / 2}
        ry="10"
        fill={hColor}
        opacity={0.5}
      />

      {/* Legs */}
      <rect x={60 - hw / 2} y="180" width={hw / 2 - 2} height="65" rx="5" fill={skin} />
      <rect x={60 + 2} y="180" width={hw / 2 - 2} height="65" rx="5" fill={skin} />

      {/* Feet */}
      <ellipse cx={60 - hw / 4 - 1} cy="250" rx="8" ry="4" fill={skin} />
      <ellipse cx={60 + hw / 4 + 1} cy="250" rx="8" ry="4" fill={skin} />

      {/* Labels */}
      {imc != null && (
        <text x="60" y="270" textAnchor="middle" fill="var(--foreground)" fontSize="11" fontWeight="bold">
          IMC: {imc.toFixed(1)}
        </text>
      )}
      {pctGrasa != null && (
        <text x="60" y="282" textAnchor="middle" fill="var(--muted-foreground)" fontSize="9">
          Grasa: {pctGrasa.toFixed(1)}%
        </text>
      )}

      {/* Gender label */}
      <text x="60" y="14" textAnchor="middle" fill="var(--muted-foreground)" fontSize="8" fontWeight="600">
        {gender === "male" ? "Hombre" : "Mujer"}
      </text>
    </svg>
  );
}
