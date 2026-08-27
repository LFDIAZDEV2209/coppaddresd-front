import { Flame } from "lucide-react";
import type { CommunityMember } from "../types";

function grad(id: string): string {
  const palette = [
    "from-sky-700 to-blue-900",
    "from-violet-700 to-purple-900",
    "from-emerald-700 to-teal-900",
    "from-amber-800 to-orange-900",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function MemberAvatar({
  member,
  showStreak = false,
  subtitle,
}: {
  member: Pick<CommunityMember, "id" | "firstName" | "lastName" | "streak">;
  showStreak?: boolean;
  subtitle?: string;
}) {
  const fullName = `${member.firstName} ${member.lastName}`;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
        {grad(member.id)}
        {initials(fullName)}
        {showStreak && member.streak > 0 && (
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-white ring-2 ring-card">
            <Flame className="size-2.5" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{fullName}</span>
        {subtitle && (
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
