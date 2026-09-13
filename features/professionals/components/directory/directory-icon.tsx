import { cn } from "@/lib/utils";
import {
  AnimatedIcon,
  type AnimatedIconName,
} from "@/components/ui/animated-icon";

export type DirectoryIconKind = "team" | "active" | "invited" | "inactive";
const names: Record<DirectoryIconKind, AnimatedIconName> = {
  team: "medical-kit",
  active: "status-check",
  invited: "invitation",
  inactive: "status-pause",
};

/** Familia volumétrica propia; movimiento acotado por interacción y reduced-motion. */
export function DirectoryIcon({
  kind,
  className,
}: {
  kind: DirectoryIconKind;
  className?: string;
}) {
  return (
    <AnimatedIcon
      name={names[kind]}
      className={cn(
        "directory-3d-icon",
        `directory-3d-icon--${kind}`,
        className,
      )}
    />
  );
}
