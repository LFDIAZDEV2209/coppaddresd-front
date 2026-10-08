import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  color: { bg: string; text: string; dot: string };
}

/** Etiqueta semántica: el color de texto debe corresponder al fondo sólido o suave. */
export function StatusBadge({ status, color }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold shadow-sm",
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color.dot }}
      />
      {status}
    </span>
  );
}
