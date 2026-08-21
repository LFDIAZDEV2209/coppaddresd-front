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
  // Permisos efectivos del contexto (global ∪ scoped de la clínica activa):
  // la navegación se construye declarativamente desde la config con permisos.
  const { can } = useAppContext();
  const navModules = visibleNavModules(can);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const activeModule = navModules.find((m) =>
      m.items.some((item) => item.href === pathname),
    );
    return activeModule ? new Set([activeModule.label]) : new Set();
  });

  const toggleModule = useCallback((label: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-[#0B2B4A] transition-all duration-300 ease-in-out relative shrink-0 h-screen",
          collapsed ? "w-[68px]" : "w-[236px]",
          mobileOpen ? "fixed inset-y-0 left-0 z-50" : "hidden lg:flex",
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Brand Header - Logo */}
        <div
          className={cn(
            "flex items-center justify-center px-3.5 pt-4 pb-3 border-b border-white/10 relative",
            collapsed ? "h-[80px]" : "h-[90px]",
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full"
            onClick={collapsed ? onToggleCollapse : undefined}
          >
            <Image
              src="/image.png"
              alt="Copp Adresd"
              loading="eager"
              width={582}
              height={429}
              className={cn(
                "w-auto object-contain transition-all cursor-pointer",
                collapsed ? "h-10 max-w-[54px]" : "h-14 max-w-[180px]",
              )}
            />
          </Link>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="absolute right-2 top-4 flex size-[26px] items-center justify-center rounded-lg border border-white/20 bg-[#0A2340] text-white/80 hover:bg-[#0E3458] hover:text-white transition-all"
              aria-label="Colapsar sidebar"
            >
              <ChevronsLeft className="size-[15px]" />
            </button>
          )}
        </div>

        {/* Navigation Modules */}
        <ScrollArea className="flex-1 px-2.5 py-2">
          <nav className="flex flex-col gap-1">
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
                        "flex items-center justify-center rounded-lg p-2.5 my-0.5 transition-colors border",
                        active
                          ? "bg-[#0A2340] text-[#F59E0B] border-[#F59E0B]/30"
                          : "text-white/70 hover:bg-white/10 hover:text-white border-transparent hover:border-white/10",
                      )}
                      onClick={() => {
                        if (firstItem) onCloseMobile();
                      }}
                      render={<Link href={firstItem?.href ?? "#"} />}
                    >
                      <Icon className="size-[18px]" />
                    </TooltipTrigger>
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
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors border",
                      active
                        ? "bg-[#0A2340] text-[#F59E0B] border-[#F59E0B]/30"
                        : "text-white/75 hover:bg-white/10 hover:text-white border-transparent hover:border-white/10",
                    )}
                  >
                    <Icon
                      className="size-[18px] shrink-0"
                      style={{
                        color: active ? "#F59E0B" : "rgba(255,255,255,0.65)",
                      }}
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
                      {visibleNavItems(mod, can).map((item) => {
                          const ItemIcon = item.icon;
                          const itemActive = isActive(item);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onCloseMobile}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-all border",
                                itemActive
                                  ? "bg-[#0A2340] font-semibold text-[#F59E0B] border-[#F59E0B]/30"
                                  : "text-white/70 hover:bg-white/10 hover:text-white border-transparent hover:border-white/10",
                              )}
                            >
                              <ItemIcon
                                className="size-[16px] shrink-0"
                                style={{
                                  color: itemActive ? "#F59E0B" : undefined,
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
            <div className="flex flex-col gap-2">
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 p-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Expandir sidebar"
              >
                <ChevronRight className="size-4" />
              </button>
              <Tooltip>
                <TooltipTrigger
                  className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 p-2 text-white/70 hover:text-white transition-colors"
                  render={<Link href="/settings" />}
                  onClick={onCloseMobile}
                  aria-label="Configuración"
                />
                <TooltipContent side="right" sideOffset={8}>
                  Configuración
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 p-2.5">
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
                  {user?.roles[0] ?? "Sin rol"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="size-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive"
                  >
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
