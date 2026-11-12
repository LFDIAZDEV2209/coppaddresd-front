import { cn } from "@/lib/utils";
import {
  rainbowStyle,
  rainbowToneFromColor,
  type RainbowTone,
} from "@/lib/ui/rainbow";
interface StatusBadgeProps {
  status: string;
  color: { bg: string; text: string; dot: string };
  tone?: RainbowTone;
}
export function StatusBadge({ status, color, tone }: StatusBadgeProps) {
  const resolved =
    tone ??
    rainbowToneFromColor(color.bg) ??
    rainbowToneFromColor(color.dot) ??
    rainbowToneFromColor(color.text) ??
    "slate";
  return (
    <span
      data-slot="status-badge"
      data-tone={resolved}
      className={cn(
        "spectrum-tag inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] leading-4 font-semibold",
      )}
      style={rainbowStyle(resolved)}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--rainbow-color)" }}
      />
      {status}
    </span>
  );
}
