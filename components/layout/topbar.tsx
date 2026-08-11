"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbSegments } from "@/lib/config/navigation";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  Search,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const segments = getBreadcrumbSegments(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-[#0B2B4A] px-4 lg:px-5">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center text-white/70 hover:text-white lg:hidden transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>

        <nav
          className="hidden items-center gap-1.5 text-[13px] sm:flex min-w-0"
          aria-label="Breadcrumb"
        >
          {segments.map((segment, i) => (
            <span key={i} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && (
                <ChevronRight className="size-3 text-white/40 shrink-0" />
              )}
              {segment.href ? (
                <Link
                  href={segment.href}
                  className="text-white/75 hover:text-white transition-colors truncate"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="font-semibold text-white truncate">
                  {segment.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/55" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-8 w-[220px] rounded-lg bg-white/10 pl-8 pr-12 text-[12.5px] text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/15 transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
            ⌘K
          </kbd>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          aria-label={theme === "light" ? "Modo oscuro" : "Modo claro"}
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </button>

        {/* Notifications */}
        <button
          className="relative flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-[7px] rounded-full bg-destructive ring-2 ring-[#0B2B4A]" />
        </button>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-white/15 sm:block" />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/12 transition-colors"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary-soft text-[10px] font-bold text-primary-strong">
                {user?.initials ?? "CA"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col gap-px text-left md:flex">
              <span className="text-[12px] font-semibold text-white leading-tight">
                {user?.name ?? "Usuario"}
              </span>
              <span className="text-[10px] text-white/65 leading-tight">
                {user?.role ?? "Sin rol"}
              </span>
            </div>
            <ChevronDown className="hidden size-3 text-white/60 md:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 border-b border-border">
              <p className="text-[12px] font-semibold text-foreground truncate">
                {user?.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <User className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
