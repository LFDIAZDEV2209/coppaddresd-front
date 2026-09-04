"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbSegments } from "@/lib/config/navigation";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
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
  Building2,
  MapPin,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useT } from "@/providers/i18n-provider";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { context, activeClinic, setActiveClinic } = useAppContext();
  const t = useT();
  const segments = getBreadcrumbSegments(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-gradient-to-r from-[var(--sidebar)] to-[color-mix(in_srgb,var(--sidebar)_90%,var(--primary))] px-4 lg:px-6">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="flex items-center justify-center text-white/70 hover:text-white lg:hidden transition-colors"
          aria-label={t("Abrir menú")}
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
                  className="font-medium text-white/55 transition-colors hover:text-white/85"
                >
                  {t(segment.label)}
                </Link>
              ) : (
                <span className="font-semibold text-white truncate">
                  {t(segment.label)}
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
          <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-white/55" />
          <input
            type="text"
            placeholder={t("Buscar...")}
            className="h-9 w-64 rounded-full border border-white/10 bg-white/[0.06] pl-9 pr-12 text-[12.5px] text-white placeholder:text-white/45 focus:border-brand-teal/40 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-teal/25 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
            ⌘K
          </kbd>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={theme === "light" ? t("Modo oscuro") : t("Modo claro")}
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </button>

        {/* Language Toggle */}
        <LanguageToggle className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors" />

        {/* Notifications */}
        <button
          className="relative flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={t("Notificaciones")}
        >
          <Bell className="size-4" />
          <span className="absolute right-[9px] top-[9px] size-[6px] rounded-full bg-destructive ring-2 ring-[var(--sidebar)]" />
        </button>

        {/* Contexto organizacional (switcher de clínica) */}
        {context && context.clinics.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-left hover:bg-white/12 transition-colors"
              aria-label="Cambiar clínica activa"
            >
              <Building2 className="size-4 text-brand-blue-soft" />
              <span className="hidden max-w-[160px] flex-col gap-px sm:flex">
                <span className="truncate text-[11.5px] font-semibold text-white leading-tight">
                  {activeClinic?.name ?? "Sin clínica"}
                </span>
                <span className="truncate text-[9.5px] text-white/60 leading-tight">
                  {context.organization?.name ?? "ERP"}
                </span>
              </span>
              <ChevronDown className="hidden size-3 text-white/60 sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-1.5 border-b border-border">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {context.organization?.name ?? "Contexto"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {context.clinics.length} clínica
                  {context.clinics.length !== 1 ? "s" : ""} asignada
                  {context.clinics.length !== 1 ? "s" : ""}
                </p>
              </div>
              {context.clinics.map((clinic) => (
                <DropdownMenuItem
                  key={clinic.id}
                  onClick={() => setActiveClinic(clinic.id)}
                  className="flex items-start gap-2"
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium">
                        {clinic.name}
                      </span>
                      {clinic.isPrimary && (
                        <span className="rounded bg-primary-soft px-1 py-px text-[9px] font-bold uppercase text-primary-strong">
                          Principal
                        </span>
                      )}
                      {activeClinic?.id === clinic.id && (
                        <span className="text-[10px] text-primary">✓</span>
                      )}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {clinic.locations.length} sede
                      {clinic.locations.length !== 1 ? "s" : ""}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
              {context.clinics.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setActiveClinic(null)}
                    className="text-muted-foreground"
                  >
                    {t("Ver todo (contexto global)")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Divider */}
        <div className="hidden h-6 w-px bg-white/15 sm:block" />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/12 transition-colors">
            <Avatar className="size-8 ring-2 ring-brand-teal/40">
              <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-teal text-[10px] font-bold text-white">
                {user?.initials ?? "CA"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col gap-px text-left md:flex">
              <span className="text-[12px] font-semibold text-white leading-tight">
                {user?.name ?? "Usuario"}
              </span>
              <span className="text-[10px] text-white/65 leading-tight">
                {user?.roles[0] ?? "Sin rol"}
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
              {t("Mi perfil")}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" />
              {t("Configuración")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              {t("Cerrar sesión")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
