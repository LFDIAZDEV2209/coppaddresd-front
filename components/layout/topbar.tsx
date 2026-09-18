"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getBreadcrumbSegments } from "@/lib/config/navigation";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import {
  Search,
  Sun,
  Moon,
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
import { NotificationsMenu } from "@/features/notifications/components/notifications-menu";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
}

/**
 * Topbar flotante: blanco en reposo (integra con el sidebar claro) y
 * transición al gradiente de marca al hacer scroll (azul → teal del logo).
 */
export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { context, activeClinic, setActiveClinic } = useAppContext();
  const t = useT();
  const segments = getBreadcrumbSegments(pathname);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // El scroll vive en el <main> del shell (hermano del topbar, overflow-y-auto);
  // fallback a window si la estructura cambia.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const scroller: HTMLElement | Window =
      (header.parentElement?.querySelector(":scope > main") as HTMLElement) ??
      window;
    const target: HTMLElement | Window = scroller;
    const onScroll = () =>
      setScrolled(
        (target instanceof Window ? window.scrollY : target.scrollTop) > 12,
      );
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  const iconBtn = scrolled
    ? "text-white/70 hover:bg-white/10 hover:text-white"
    : "text-slate-500 hover:bg-slate-100 hover:text-brand-navy";

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-3 z-30 mx-3 flex h-16 items-center gap-3 rounded-2xl border px-4 transition-[background-color,border-color,box-shadow] duration-300 lg:px-6",
        scrolled
          ? "border-transparent bg-brand-gradient shadow-lg shadow-brand-navy/25"
          : "border-border bg-white shadow-[0_1px_3px_rgba(15,30,60,0.06)]",
      )}
    >
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className={cn(
            "flex items-center justify-center transition-colors lg:hidden",
            iconBtn,
          )}
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
                <ChevronRight
                  className={cn(
                    "size-3 shrink-0",
                    scrolled ? "text-white/40" : "text-slate-300",
                  )}
                />
              )}
              {segment.href ? (
                <Link
                  href={segment.href}
                  className={cn(
                    "font-medium transition-colors",
                    scrolled
                      ? "text-white/55 hover:text-white/85"
                      : "text-slate-500 hover:text-brand-navy",
                  )}
                >
                  {t(segment.label)}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-semibold",
                    scrolled ? "text-white" : "text-brand-navy",
                  )}
                >
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
          <Search
            className={cn(
              "absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2",
              scrolled ? "text-white/55" : "text-slate-400",
            )}
          />
          <input
            type="text"
            placeholder={t("Buscar...")}
            className={cn(
              "h-9 w-64 rounded-full border pl-9 pr-12 text-[12.5px] transition-all focus:outline-none focus:ring-2 focus:ring-brand-teal/25",
              scrolled
                ? "border-white/10 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-brand-teal/40 focus:bg-white/10"
                : "border-border bg-slate-100/70 text-foreground placeholder:text-slate-400 focus:border-brand-teal/40 focus:bg-white",
            )}
          />
          <kbd
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[10px]",
              scrolled
                ? "border-white/20 bg-white/10 text-white/60"
                : "border-border bg-white text-slate-400",
            )}
          >
            ⌘K
          </kbd>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            iconBtn,
          )}
          aria-label={theme === "light" ? t("Modo oscuro") : t("Modo claro")}
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </button>

        {/* Language Toggle */}
        <LanguageToggle
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-2.5 transition-colors",
            iconBtn,
          )}
        />

        {/* Notifications */}
        <NotificationsMenu scrolled={scrolled} />

        {/* Contexto organizacional (switcher de clínica) */}
        {context && context.clinics.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors",
                scrolled
                  ? "border-white/10 bg-white/8 hover:bg-white/12"
                  : "border-border bg-slate-50 hover:bg-slate-100",
              )}
              aria-label="Cambiar clínica activa"
            >
              <Building2
                className={cn(
                  "size-4",
                  scrolled ? "text-brand-blue-soft" : "text-brand-teal",
                )}
              />
              <span className="hidden max-w-[160px] flex-col gap-px sm:flex">
                <span
                  className={cn(
                    "truncate text-[11.5px] font-semibold leading-tight",
                    scrolled ? "text-white" : "text-brand-navy",
                  )}
                >
                  {activeClinic?.name ?? "Sin clínica"}
                </span>
                <span
                  className={cn(
                    "truncate text-[9.5px] leading-tight",
                    scrolled ? "text-white/60" : "text-slate-400",
                  )}
                >
                  {context.organization?.name ?? "ERP"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "hidden size-3 sm:block",
                  scrolled ? "text-white/60" : "text-slate-400",
                )}
              />
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
        <div
          className={cn(
            "hidden h-6 w-px sm:block",
            scrolled ? "bg-white/15" : "bg-border",
          )}
        />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors",
              scrolled ? "hover:bg-white/12" : "hover:bg-slate-100",
            )}
          >
            <Avatar className="size-8 ring-2 ring-brand-teal/40">
              <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-teal text-[10px] font-bold text-white">
                {user?.initials ?? "CA"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col gap-px text-left md:flex">
              <span
                className={cn(
                  "text-[12px] font-semibold leading-tight",
                  scrolled ? "text-white" : "text-foreground",
                )}
              >
                {user?.name ?? "Usuario"}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  scrolled ? "text-white/65" : "text-muted-foreground",
                )}
              >
                {user?.roles[0] ?? "Sin rol"}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "hidden size-3 md:block",
                scrolled ? "text-white/60" : "text-slate-400",
              )}
            />
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
