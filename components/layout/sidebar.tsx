"use client";

import React, { useCallback, useState } from "react";
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
          "flex flex-col bg-gradient-to-b from-[var(--sidebar)] to-[color-mix(in_srgb,var(--sidebar)_85%,#000)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative shrink-0 h-screen overflow-hidden border-r border-white/10 shadow-[8px_0_24px_-18px_rgba(4,12,32,0.6)]",
          collapsed ? "w-[68px]" : "w-[236px]",
          mobileOpen ? "fixed inset-y-0 left-0 z-50" : "hidden lg:flex",
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Glow decorativo de marca (motivo teal de la identidad) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-brand-teal/10 blur-[80px]"
        />
        {/* Brand Header */}
        <div
          className={cn(
            "flex items-center justify-center px-3.5 border-b border-white/8 relative shrink-0 h-16",
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full transition-transform duration-200 hover:scale-[1.04]"
            onClick={collapsed ? onToggleCollapse : undefined}
          >
            {/* Círculo blanco: hace flotar el logo a color sobre el navy */}
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-white shadow-md shadow-black/25 ring-1 ring-black/5 transition-all duration-300",
                collapsed ? "size-9" : "size-11",
              )}
            >
              <Image
                src="/LogoIndividual.png"
                alt="Copp Adresd"
                loading="eager"
                width={197}
                height={197}
                className={cn(
                  "w-auto object-contain transition-all duration-300 cursor-pointer",
                  collapsed ? "size-7" : "size-8",
                )}
              />
            </span>
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="absolute right-2 top-1/2 flex size-[26px] -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
              aria-label={t("Colapsar sidebar")}
            >
              <ChevronsLeft className="size-[15px]" />
            </button>
          )}
        </div>

        {/* Navigation Modules — scroll sutil: thumb blanca translúcida, solo visible al hover/scroll */}
        <ScrollArea className="flex-1 min-h-0 px-3 py-3">
          <nav className="flex flex-col gap-1 pb-3">
            {navModules.map((mod) => {
              const active = isModuleActive(mod);
              const single = visibleNavItems(mod, can).length === 1;
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
                          ? "bg-brand-gradient text-white border-transparent shadow-[0_6px_16px_-6px_rgba(3,93,77,0.5)] [&_svg]:text-white"
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

              if (single) {
                const onlyItem = visibleNavItems(mod, can)[0];
                const onlyActive = isActive(onlyItem);
                return (
                  <Link
                    key={mod.label}
                    href={onlyItem.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-200 border group relative",
                      onlyActive
                        ? "bg-brand-gradient text-white border-transparent shadow-[0_6px_16px_-6px_rgba(3,93,77,0.5)] [&_svg]:text-white"
                        : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white hover:scale-[1.01] border-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-transform duration-200",
                        onlyActive && "scale-110",
                      )}
                    />
                    <span className="flex-1 text-left tracking-wide">
                      {t(mod.label)}
                    </span>
                  </Link>
                );
              }

              return (
                <div key={mod.label} className="flex flex-col">
                  <button
                    onClick={() => toggleModule(mod.label)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-200 border group",
                      active
                        ? "bg-brand-gradient text-white border-transparent shadow-[0_6px_16px_-6px_rgba(3,93,77,0.5)] [&_svg]:text-white"
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
                        {
                          // Pre-compute visible items so we can track section transitions
                          (() => {
                            const items = visibleNavItems(mod, can);
                            let lastSection: string | undefined;
                            return items.flatMap<React.ReactNode>(
                              (item, idx) => {
                                const ItemIcon = item.icon;
                                const itemActive = isActive(item);
                                const elements: React.ReactNode[] = [];

                                // Insert section label when section changes
                                if (
                                  item.section &&
                                  item.section !== lastSection
                                ) {
                                  lastSection = item.section;
                                  elements.push(
                                    <p
                                      key={`section-${item.section}`}
                                      className="px-2.5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40"
                                    >
                                      {t(item.section)}
                                    </p>,
                                  );
                                } else if (item.section) {
                                  lastSection = item.section;
                                }

                                elements.push(
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onCloseMobile}
                                    className={cn(
                                      "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-all duration-200 border",
                                      itemActive
                                        ? "bg-white/10 font-semibold text-white border-transparent [&_svg]:text-white"
                                        : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-white border-transparent",
                                    )}
                                    style={{
                                      animationDelay: expanded
                                        ? `${idx * 40}ms`
                                        : undefined,
                                    }}
                                  >
                                    <ItemIcon className="size-[16px] shrink-0" />
                                    <span className="truncate">
                                      {t(item.label)}
                                    </span>
                                  </Link>,
                                );

                                return elements;
                              },
                            );
                          })()
                        }
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Perfil (account menu) — integrado, separado por hairline sutil */}
        <div className="mt-auto shrink-0 border-t border-white/8 px-3 pb-3 pt-2">
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
            <div className="flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors duration-200 hover:bg-white/[0.06]">
              <Avatar className="size-9 ring-2 ring-brand-teal/40 transition-transform duration-200 hover:scale-105">
                <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-teal text-[11px] font-bold text-white">
                  {user?.initials ?? "CA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-px overflow-hidden min-w-0">
                <span className="text-[13px] font-semibold text-white truncate">
                  {user?.name ?? "Usuario"}
                </span>
                <span className="text-[11px] text-white/55 truncate">
                  {user?.roles[0] ?? "Sin rol"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors duration-200">
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
