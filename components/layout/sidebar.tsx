"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navModules, type NavModule, type NavItem } from "@/lib/config/navigation";
import { useAuth } from "@/providers/auth-provider";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  LogOut,
  Settings,
} from "lucide-react";
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
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => {
      const activeModule = navModules.find((m) =>
        m.items.some((item) => item.href === pathname)
      );
      return activeModule ? new Set([activeModule.label]) : new Set();
    }
  );

  const toggleModule = useCallback((label: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const isActive = (item: NavItem) => pathname === item.href;
  const isModuleActive = (mod: NavModule) =>
    mod.items.some((item) => isActive(item));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0B2B4A] transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[236px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            CA
          </div>

          {!collapsed && (
            <div className="flex flex-1 flex-col gap-px overflow-hidden">
              <span className="text-sm font-bold text-white truncate">
                Copp Adresd
              </span>
              <span className="text-[10.5px] text-white/60 truncate">
                Admin clínica
              </span>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="flex size-[26px] shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Colapsar sidebar"
            >
              <ChevronsLeft className="size-[15px]" />
            </button>
          )}
        </div>

        {/* Navigation Modules */}
        <ScrollArea className="flex-1 px-2.5">
          <nav className="flex flex-col gap-1">
            {navModules.map((mod) => {
              const expanded = expandedModules.has(mod.label);
              const active = isModuleActive(mod);
              const Icon = mod.icon;

              if (collapsed) {
                return (
                  <Tooltip key={mod.label}>
                    <TooltipTrigger
                      className={cn(
                        "flex items-center justify-center rounded-lg p-2.5 my-0.5 transition-colors",
                        active
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                      onClick={() => {
                        const firstItem = mod.items[0];
                        if (firstItem) onCloseMobile();
                      }}
                      render={<Link href={mod.items[0]?.href ?? "#"} />}
                    />
                    <TooltipContent side="right" sideOffset={8}>
                      {mod.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={mod.label} className="flex flex-col">
                  <button
                    onClick={() => toggleModule(mod.label)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors",
                      active
                        ? "bg-white/12 text-white"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      style={{ color: active ? mod.color : "rgba(255,255,255,0.65)" }}
                    />
                    <span className="flex-1 text-left tracking-wide">
                      {mod.label}
                    </span>
                    {expanded ? (
                      <ChevronDown className="size-3.5 text-white/60" />
                    ) : (
                      <ChevronRight className="size-3.5 text-white/50" />
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-white/15 pl-3">
                      {mod.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isActive(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onCloseMobile}
                            className={cn(
                              "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-all",
                              itemActive
                                ? "bg-white/12 font-semibold text-white"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <ItemIcon
                              className="size-[16px] shrink-0"
                              style={{
                                color: itemActive ? item.color : undefined,
                              }}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Card */}
        <div className="p-2.5 mt-auto">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                className="flex items-center justify-center rounded-xl bg-white/10 p-2 text-white/70 hover:text-white transition-colors"
                render={<Link href="/settings" />}
                onClick={onCloseMobile}
                aria-label="Configuración"
              />
              <TooltipContent side="right" sideOffset={8}>
                Configuración
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary-soft text-[11px] font-bold text-primary-strong">
                  {user?.initials ?? "CA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-px overflow-hidden min-w-0">
                <span className="text-[12.5px] font-semibold text-white truncate">
                  {user?.name ?? "Usuario"}
                </span>
                <span className="text-[10.5px] text-white/55 truncate">
                  {user?.role ?? "Sin rol"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex size-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="size-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="size-4" />
                    Cerrar sesión
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
