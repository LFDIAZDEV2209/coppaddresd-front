"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbSegments } from "@/lib/config/navigation";
import { mockCurrentUser } from "@/lib/config/user";
import { useTheme } from "@/providers/theme-provider";
import {
  Search,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu,
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
  const segments = getBreadcrumbSegments(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-[#0B2B4A] px-5">
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center text-white/70 hover:text-white lg:hidden transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <nav
        className="hidden items-center gap-2 text-[13px] sm:flex"
        aria-label="Breadcrumb"
      >
        {segments.map((segment, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight className="size-[13px] text-white/50" />
            )}
            {segment.href ? (
              <Link
                href={segment.href}
                className="text-white/70 hover:text-white transition-colors"
              >
                {segment.label}
              </Link>
            ) : (
              <span className="font-semibold text-white">
                {segment.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <div className="relative hidden w-[280px] md:block">
          <Search className="absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-white/50" />
          <input
            type="text"
            placeholder="Buscar pacientes..."
            className="h-9 w-full rounded-[10px] bg-white/10 pl-8 pr-16 text-[13px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-shadow backdrop-blur-sm"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10.5px] text-white/60">
            ⌘K
          </kbd>
        </div>

        <button
          onClick={toggleTheme}
          className="flex size-9 items-center justify-center rounded-[10px] bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
        >
          {theme === "light" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        <button
          className="relative flex size-9 items-center justify-center rounded-[10px] bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" />
          <span className="absolute right-[5px] top-[5px] size-2 rounded-full bg-destructive ring-2 ring-[#0B2B4A]" />
        </button>

        <div className="hidden h-7 w-px bg-white/20 lg:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1 hover:bg-white/10 transition-colors"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-[#E5F0FA] text-[10.5px] font-bold text-[#0B2B4A]">
                {mockCurrentUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col gap-px text-left lg:flex">
              <span className="text-[12.5px] font-semibold text-white">
                {mockCurrentUser.name}
              </span>
              <span className="text-[10.5px] text-white/60">
                Superadmin
              </span>
            </div>
            <ChevronDown className="hidden size-3.5 text-white lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href="/settings" />}>
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
