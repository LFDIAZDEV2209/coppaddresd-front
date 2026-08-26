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
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/8">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#6D28D9] text-sm font-black text-white">
          A
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-extrabold tracking-wide text-white">
            ANTARES
          </span>
          <span className="text-[10.5px] font-semibold text-[#B8860B]">
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
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200 border",
                      active
                        ? "bg-[var(--sidebar-active-bg)] font-semibold text-[var(--sidebar-active-text)] border-[var(--sidebar-active-border)]"
                        : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white border-transparent",
                    )}
                  >
                    <Icon className="size-[17px] shrink-0" />
                    <span className="flex-1 truncate">{t(item.label)}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "flex size-[18px] items-center justify-center rounded-full text-[10px] font-bold",
                          item.badgeColor === "red"
                            ? "bg-[#EF4444] text-white"
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
      <div className="p-3 border-t border-white/8">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-[#6D28D9] text-[11px] font-bold text-white">
              {user?.initials ?? "AR"}
            </AvatarFallback>
          </Avatar>
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
