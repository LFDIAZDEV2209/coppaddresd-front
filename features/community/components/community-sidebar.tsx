"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";
import { useAuth } from "@/providers/auth-provider";
import { erpNavSections, communityBrand } from "../navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CommunitySidebarProps {
  onNavigate?: () => void;
}

export function CommunitySidebar({ onNavigate }: CommunitySidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const { user } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      {/* Brand */}
      <div className="relative flex items-center gap-2.5 overflow-hidden border-b border-white/8 px-5 py-5">
        <div
          className="cp-glow -left-6 -top-8 size-24 bg-[rgba(139,92,246,0.35)]"
          aria-hidden="true"
        />
        <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#4C1D95] text-sm font-black text-white ring-1 ring-[#8B5CF6]/50 shadow-[0_6px_18px_-6px_rgba(139,92,246,0.6)]">
          A
        </div>
        <div className="relative flex flex-col leading-tight">
          <span className="text-[15px] font-extrabold tracking-wide text-white">
            ANTARES
          </span>
          <span className="bg-gradient-to-r from-[#B8860B] to-[#D9A929] bg-clip-text text-[10.5px] font-semibold text-transparent">
            ERP Comunidad
          </span>
        </div>
      </div>

      {/* Secciones */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          {erpNavSections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <span className="px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-widest text-[var(--sidebar-muted-foreground)]">
                {t(section.label)}
              </span>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] font-medium transition-all duration-200 hover:translate-x-0.5",
                      active
                        ? "border-[var(--sidebar-active-border)] bg-gradient-to-r from-[var(--sidebar-active-bg)] to-transparent font-semibold text-[var(--sidebar-active-text)] shadow-[0_8px_20px_-10px_rgba(109,40,217,0.55)]"
                        : "border-transparent text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white",
                    )}
                  >
                    {active && (
                      <span
                        className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--sidebar-active-border)]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                        active && "text-[#C4B5FD]",
                      )}
                    />
                    <span className="flex-1 truncate">{t(item.label)}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold",
                          item.badgeColor === "red"
                            ? "cp-live-dot bg-[#EF4444] text-white"
                            : "bg-[#6D28D9] text-white",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {/* User card */}
      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8B5CF6]/40 hover:bg-white/[0.07]">
          <div className="rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#1D9E75] p-[1.5px]">
            <Avatar className="size-8 ring-2 ring-[var(--sidebar)]">
              <AvatarFallback className="bg-[#6D28D9] text-[11px] font-bold text-white">
                {user?.initials ?? "AR"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[12.5px] font-semibold text-white">
              {user?.name ?? "Ángel Isaac R."}
            </span>
            <span className="truncate text-[10.5px] text-[var(--sidebar-muted-foreground)]">
              {user?.roles?.[0] ?? "Admin"} · FYA TECH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
