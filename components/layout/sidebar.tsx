"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  visibleNavItems,
  visibleNavModules,
  type NavItem,
  type NavModule,
} from "@/lib/config/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import { useT } from "@/providers/i18n-provider";
import { ChevronDown, ChevronsLeft, LogOut, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { can } = useAppContext();
  const t = useT();
  const navModules = visibleNavModules(can);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const activeModule = navModules.find((m) =>
      m.items.some((item) => item.href === pathname),
    );
    return activeModule ? new Set([activeModule.label]) : new Set();
  });

  /* Accordion: abre un módulo y cierra los demás */
  const toggleModule = useCallback((label: string) => {
    setExpandedModules((prev) => {
      const next = new Set<string>();
      if (!prev.has(label)) next.add(label);
      return next;
    });
  }, []);

  const exactItem = navModules
    .flatMap((module) => module.items)
    .find((item) => item.href === pathname);
  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (!exactItem && pathname.startsWith(`${item.href}/`));
  const isModuleActive = (mod: NavModule) =>
    mod.items.some((item) => isActive(item));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-gradient-to-b from-[var(--sidebar)] to-[color-mix(in_srgb,var(--sidebar)_85%,#000)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative shrink-0 h-screen",
          collapsed ? "w-[68px]" : "w-[236px]",
          mobileOpen ? "fixed inset-y-0 left-0 z-50" : "hidden lg:flex",
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Brand Header */}
        <div
          className={cn(
            "flex items-center justify-center px-3.5 pt-4 pb-3 border-b border-white/8 relative",
            collapsed ? "h-[80px]" : "h-[90px]",
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full transition-transform duration-200 hover:scale-[1.02]"
            onClick={collapsed ? onToggleCollapse : undefined}
          >
            <Image
              src="/image.png"
              alt="Copp Adresd"
              loading="eager"
              width={582}
              height={429}
              className={cn(
                "w-auto object-contain transition-all duration-300 cursor-pointer",
                collapsed ? "h-10 max-w-[54px]" : "h-14 max-w-[180px]",
              )}
            />
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="absolute right-2 top-4 flex size-[26px] items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:scale-110 transition-all duration-200"
              aria-label={t("Colapsar sidebar")}
            >
              <ChevronsLeft className="size-[15px]" />
            </button>
          )}
        </div>

        {/* Navigation Modules — scroll sutil: thumb blanca translúcida, solo visible al hover/scroll */}
        <ScrollArea className="flex-1 min-h-0 px-2.5 py-2">
          <nav className="flex flex-col gap-0.5 pb-2">
            {navModules.map((mod) => {
              const active = isModuleActive(mod);
              const expanded = expandedModules.has(mod.label) || active;
              const Icon = mod.icon;

              if (collapsed) {
                const firstItem = visibleNavItems(mod, can)[0];
                return (
                  <Tooltip key={mod.label}>
                    <TooltipTrigger
                      className={cn(
                        "flex items-center justify-center rounded-lg p-2.5 my-0.5 transition-all duration-200 border",
                        active
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active-border)]"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white hover:scale-105 border-transparent",
                      )}
                      onClick={() => {
                        if (firstItem) onCloseMobile();
                      }}
                      render={<Link href={firstItem?.href ?? "#"} />}
                    >
                      <Icon className="size-[18px]" />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {t(mod.label)}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={mod.label} className="flex flex-col">
                  <button
                    onClick={() => toggleModule(mod.label)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-200 border group",
                      active
                        ? "bg-white/5 text-white border-white/10"
                        : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white hover:scale-[1.01] border-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-transform duration-200",
                        active && "scale-110",
                      )}
                    />
                    <span className="flex-1 text-left tracking-wide">
                      {t(mod.label)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-white/40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Panel animado con grid transition */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-1 ml-5 flex flex-col gap-0.5 border-l border-white/10 pl-3 py-0.5">
                        {visibleNavItems(mod, can).map((item, idx) => {
                          const ItemIcon = item.icon;
                          const itemActive = isActive(item);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onCloseMobile}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-all duration-200 border",
                                itemActive
                                  ? "bg-[var(--sidebar-active-bg)] font-semibold text-[var(--sidebar-active-text)] border-[var(--sidebar-active-border)]"
                                  : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white border-transparent",
                              )}
                              style={{
                                animationDelay: expanded
                                  ? `${idx * 40}ms`
                                  : undefined,
                              }}
                            >
                              <ItemIcon className="size-[16px] shrink-0" />
                              <span className="truncate">{t(item.label)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Card */}
        <div className="p-2.5 mt-auto">
          {collapsed ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 p-2 text-white/70 hover:text-white hover:bg-white/10 hover:scale-110 transition-all duration-200"
                aria-label={t("Expandir sidebar")}
              >
                <ChevronDown className="size-4 -rotate-90" />
              </button>
              <Tooltip>
                <TooltipTrigger
                  className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 p-2 text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  render={<Link href="/settings" />}
                  onClick={onCloseMobile}
                  aria-label={t("Configuración")}
                />
                <TooltipContent side="right" sideOffset={8}>
                  {t("Configuración")}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 p-2.5 transition-all duration-200 hover:bg-white/8">
              <Avatar className="size-8 transition-transform duration-200 hover:scale-110">
                <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                  {user?.initials ?? "CA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-px overflow-hidden min-w-0">
                <span className="text-[12.5px] font-semibold text-white truncate">
                  {user?.name ?? "Usuario"}
                </span>
                <span className="text-[10.5px] text-[var(--sidebar-muted-foreground)] truncate">
                  {user?.roles[0] ?? "Sin rol"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white hover:scale-110 transition-all duration-200">
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="size-4" />
                    {t("Configuración")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive"
                  >
                    <LogOut className="size-4" />
                    {t("Cerrar sesión")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
