"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navGroups } from "@/lib/config/navigation";
import { mockCurrentUser } from "@/lib/config/user";
import { ChevronsLeft, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[236px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="flex items-center gap-2 px-3.5 pt-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-sidebar-primary">
            <span className="text-xs font-bold text-sidebar-primary-foreground">
              CA
            </span>
          </div>

          {!collapsed && (
            <div className="flex flex-1 flex-col gap-px overflow-hidden">
              <span className="text-sm font-bold text-sidebar-foreground truncate">
                Copp Adresd
              </span>
              <span className="text-[10.5px] text-sidebar-foreground/70 truncate">
                Admin clínica
              </span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger
              className="flex size-[26px] shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <ChevronsLeft
                className="size-[15px]"
                style={{
                  transform: collapsed ? "rotate(180deg)" : undefined,
                  transition: "transform 200ms",
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? "Expandir" : "Colapsar"}
            </TooltipContent>
          </Tooltip>
        </div>

        <ScrollArea className="flex-1 px-3.5 mt-3.5">
          <nav className="flex flex-col gap-3.5">
            {navGroups.map((group) => (
              <SidebarNavGroup
                key={group.label}
                group={group}
                pathname={pathname}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        <div className="p-3.5">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={<Link href="/settings" />}
                className="flex items-center justify-center rounded-xl bg-card p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={onCloseMobile}
                aria-label="Configuración"
              />
              <TooltipContent side="right" sideOffset={8}>
                Configuración
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[10px] bg-white/10 p-2.5">
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#E5F0FA] text-[11px] font-bold text-[#0B2B4A]">
                {mockCurrentUser.initials}
              </div>
              <div className="flex flex-1 flex-col gap-px overflow-hidden">
                <span className="text-[12.5px] font-semibold text-white truncate">
                  {mockCurrentUser.name}
                </span>
                <span className="text-[10.5px] text-white/60 truncate">
                  {mockCurrentUser.role}
                </span>
              </div>
              <Link
                href="/settings"
                className="shrink-0 text-white/60 hover:text-white transition-colors"
                aria-label="Configuración"
              >
                <Settings className="size-[15px]" />
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarNavGroup({
  group,
  pathname,
  collapsed,
}: {
  group: (typeof navGroups)[number];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <span className="px-2.5 text-[10.5px] font-semibold tracking-[1.2px] text-sidebar-foreground/62">
          {group.label}
        </span>
      )}

      {group.items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (collapsed) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={<Link href={item.href} />}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2 transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              />
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
              isActive
                ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
