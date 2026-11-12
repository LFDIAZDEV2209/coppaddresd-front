"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBreadcrumbSegments } from "@/lib/config/navigation";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/providers/context-provider";
import {
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
import { useBreadcrumbOverride } from "@/components/layout/breadcrumb-provider";
import { GlobalSearch } from "./global-search";
import { cn } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  mobileOpen: boolean;
}

/** Barra estable: el contexto y las acciones conservan su contraste al desplazar. */
export function Topbar({ onMenuClick, mobileOpen }: TopbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { context, activeClinic, setActiveClinic } = useAppContext();
  const t = useT();
  const breadcrumbOverride = useBreadcrumbOverride();
  // Breadcrumb: la hoja genérica la sustituye el título dinámico registrado
  // por la page de detalle (F9: "Profesionales > {nombre}").
  const segments = getBreadcrumbSegments(pathname);
  const resolvedSegments =
    breadcrumbOverride && segments.length > 1
      ? segments.slice(0, -1).concat({
          ...segments[segments.length - 1],
          label: breadcrumbOverride,
        })
      : segments;
  const iconBtn =
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";

  return (
    <header
      className={cn(
        "relative z-30 flex h-[72px] shrink-0 items-center gap-3 border-b px-4 lg:px-6",
        "border-border bg-card",
      )}
    >
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden",
            iconBtn,
          )}
          id="navigation-menu-trigger"
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? "mobile-navigation" : undefined}
          aria-label={t("Abrir menú")}
        >
          <Menu className="size-5" />
        </button>

        <nav
          className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px]"
          aria-label="Breadcrumb"
        >
          {resolvedSegments.map((segment, i) => (
            <span
              key={`${segment.label}-${i}`}
              className={cn(
                "flex items-center gap-1.5",
                i === resolvedSegments.length - 1
                  ? "min-w-0 shrink"
                  : "hidden shrink-0 sm:flex",
              )}
            >
              {i > 0 && (
                <ChevronRight
                  className={cn(
                    "hidden size-3 shrink-0 text-muted-foreground sm:block",
                  )}
                />
              )}
              {segment.href ? (
                <Link
                  href={segment.href}
                  className={cn(
                    "font-medium transition-colors",
                    "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(segment.label)}
                </Link>
              ) : (
                <span
                  className={cn("truncate font-semibold", "text-foreground")}
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
        <GlobalSearch />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex size-11 sm:size-10 items-center justify-center rounded-full transition-colors",
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
            "flex h-11 sm:h-10 items-center gap-1.5 rounded-full px-2.5 transition-colors",
            iconBtn,
          )}
        />

        {/* Notifications */}
        <NotificationsMenu scrolled={false} />

        {/* Contexto organizacional (switcher de clínica) */}
        {context && context.clinics.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors",
                "border-border bg-background hover:bg-muted",
              )}
              aria-label={t("Cambiar clínica activa")}
            >
              <Building2 className={cn("size-4", "text-brand-teal")} />
              <span className="hidden max-w-[160px] flex-col gap-px sm:flex">
                <span
                  className={cn(
                    "truncate text-[11.5px] font-semibold leading-tight",
                    "text-foreground",
                  )}
                >
                  {activeClinic?.name ?? t("Sin clínica")}
                </span>
                <span
                  className={cn(
                    "truncate text-[9.5px] leading-tight",
                    "text-muted-foreground",
                  )}
                >
                  {context.organization?.name ?? "ERP"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "hidden size-3 sm:block",
                  "text-muted-foreground",
                )}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-1.5 border-b border-border">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {context.organization?.name ?? t("Contexto")}
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
        <div className={cn("hidden h-6 w-px sm:block", "bg-border")} />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              "hover:bg-muted",
            )}
          >
            <Avatar className="size-9 ring-2 ring-brand-teal/40">
              <AvatarFallback className="bg-gradient-to-br from-brand-navy to-brand-teal text-[10px] font-bold text-white">
                {user?.initials ?? "CA"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden max-w-36 flex-col gap-px text-left 2xl:flex">
              <span
                className={cn(
                  "truncate text-[13px] font-semibold leading-tight",
                  "text-foreground",
                )}
              >
                {user?.name ?? t("Usuario")}
              </span>
              <span
                className={cn(
                  "truncate text-[11px] leading-tight",
                  "text-muted-foreground",
                )}
              >
                {user?.roles[0] ?? t("Sin rol")}
              </span>
            </div>
            <ChevronDown
              className={cn("hidden size-3 md:block", "text-muted-foreground")}
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
