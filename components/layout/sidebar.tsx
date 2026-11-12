"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Settings, X } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NutritionPendingBadge } from "@/features/nutrition/components/nutrition-pending-badge";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
function subscribeHover(callback: () => void) {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const hasHover = () => window.matchMedia(HOVER_QUERY).matches;
const serverHasHover = () => true;

// El centro de cada icono permanece en x=40 al abrir y cerrar el rail.
const navRow =
  "relative flex min-h-11 w-full items-center gap-3 rounded-xl px-[18px] py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";
const quietRow =
  "text-muted-foreground hover:bg-muted/60 hover:text-primary-soft-foreground";
const selectedRow =
  "bg-brand-gradient font-semibold text-white focus-visible:outline-white";

/** Rail automático en escritorio; Sheet conserva el control táctil en móvil. */
export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { can } = useAppContext();
  const t = useT();
  const id = useId();
  const desktopRef = useRef<HTMLElement>(null);
  const supportsHover = useSyncExternalStore(
    subscribeHover,
    hasHover,
    serverHasHover,
  );
  const [hovered, setHovered] = useState(false);
  const [keyboardWithin, setKeyboardWithin] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const expanded =
    !supportsHover || hovered || keyboardWithin || accountOpen || touchOpen;
  const navModules = visibleNavModules(can);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const toggleModule = useCallback((label: string) => {
    setExpandedModules((prev) =>
      prev.has(label) ? new Set() : new Set([label]),
    );
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const resetDesktopInteraction = () => {
      setAccountOpen(false);
      setHovered(false);
      setKeyboardWithin(false);
      setTouchOpen(false);
    };
    desktop.addEventListener("change", resetDesktopInteraction);
    return () => desktop.removeEventListener("change", resetDesktopInteraction);
  }, []);

  useEffect(() => {
    if (!touchOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!desktopRef.current?.contains(event.target as Node))
        setTouchOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () =>
      document.removeEventListener("pointerdown", dismissOutside, true);
  }, [touchOpen]);

  const exactItem = navModules
    .flatMap((module) => module.items)
    .find((item) => item.href === pathname);
  const isActive = (item: NavItem) =>
    pathname === item.href ||
    (!exactItem && pathname.startsWith(`${item.href}/`));
  const isModuleActive = (mod: NavModule) => mod.items.some(isActive);

  function content(open: boolean, mobile = false) {
    const labelClass = open ? "min-w-0 flex-1 truncate text-left" : "sr-only";
    return (
      <>
        <div className="flex h-[72px] shrink-0 items-center gap-2 border-b border-border px-4">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Copp Adresd"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white">
              <Image
                src="/LogoIndividual.png"
                alt=""
                loading="eager"
                width={197}
                height={197}
                className="size-14 max-w-none shrink-0 object-contain"
              />
            </span>
            <span
              className={cn(
                "font-heading text-sm font-bold tracking-tight text-primary-soft-foreground",
                !open && "sr-only",
              )}
            >
              COPP ADRESD
            </span>
          </Link>
          {mobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={t("Cerrar menú")}
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1 px-3 py-5">
          <nav
            aria-label={t("Navegación principal")}
            className="flex flex-col gap-1.5 pb-3"
          >
            {navModules.map((mod, index) => {
              const active = isModuleActive(mod);
              const items = visibleNavItems(mod, can);
              const moduleOpen =
                open && (expandedModules.has(mod.label) || active);
              const Icon = mod.icon;
              const panelId = `${id}-${mobile ? "mobile" : "desktop"}-${index}`;
              if (items.length === 1) {
                const item = items[0];
                return (
                  <Link
                    key={mod.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={cn(
                      navRow,
                      isActive(item) ? selectedRow : quietRow,
                    )}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className={labelClass}>{t(mod.label)}</span>
                    {item.href === "/nutrition" && (
                      <NutritionPendingBadge collapsed={!open} />
                    )}
                  </Link>
                );
              }
              return (
                <div key={mod.label} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.label)}
                    aria-expanded={moduleOpen}
                    aria-controls={panelId}
                    className={cn(
                      navRow,
                      active && !open ? selectedRow : quietRow,
                      active &&
                        open &&
                        "bg-muted/60 text-primary-soft-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className={labelClass}>{t(mod.label)}</span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                        moduleOpen && "rotate-180",
                        !open && "hidden",
                      )}
                    />
                  </button>
                  <div
                    id={panelId}
                    hidden={!moduleOpen}
                    className="ml-5 mt-1 border-l border-border pl-3"
                  >
                    {items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      return (
                        <React.Fragment key={item.href}>
                          {item.section &&
                            item.section !== items[itemIndex - 1]?.section && (
                              <p className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">
                                {t(item.section)}
                              </p>
                            )}
                          <Link
                            href={item.href}
                            onClick={onCloseMobile}
                            aria-current={isActive(item) ? "page" : undefined}
                            className={cn(
                              navRow,
                              "my-1 px-3 text-[13px]",
                              isActive(item) ? selectedRow : quietRow,
                            )}
                          >
                            <ItemIcon aria-hidden className="size-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              {t(item.label)}
                            </span>
                            {isActive(item) && (
                              <span
                                aria-hidden
                                className="size-1.5 shrink-0 rounded-full bg-white"
                              />
                            )}
                          </Link>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="mt-auto shrink-0 border-t border-border p-3">
          <DropdownMenu
            open={mobile ? undefined : accountOpen}
            onOpenChange={
              mobile
                ? undefined
                : (nextOpen) => {
                    setAccountOpen(nextOpen);
                    if (!nextOpen)
                      setHovered(
                        desktopRef.current?.matches(":hover") ?? false,
                      );
                  }
            }
          >
            <DropdownMenuTrigger
              aria-label={t("Mi perfil")}
              className={cn(
                navRow,
                "gap-2.5 bg-brand-gradient px-2.5 text-left text-white focus-visible:outline-white",
              )}
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
                  {user?.initials ?? "CA"}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-0.5",
                  !open && "sr-only",
                )}
              >
                <span className="truncate text-[13px] font-semibold text-white">
                  {user?.name ?? t("Usuario")}
                </span>
                <span className="truncate text-xs text-white/80">
                  {user?.roles[0] ?? t("Sin rol")}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className={cn("size-4 shrink-0", !open && "hidden")}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                render={<Link href="/settings" />}
                onClick={onCloseMobile}
              >
                <Settings />
                {t("Configuración")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive"
              >
                <LogOut />
                {t("Cerrar sesión")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    );
  }

  return (
    <>
      {/* El rail participa en el layout: el contenido se adapta a su ancho. */}
      <aside
        ref={desktopRef}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            setHovered(true);
            setTouchOpen(false);
          }
        }}
        onPointerLeave={() => setHovered(false)}
        onPointerDownCapture={(event) => {
          setKeyboardWithin(false);
          setTouchOpen(event.pointerType === "touch");
        }}
        onKeyDownCapture={() => {
          setKeyboardWithin(true);
          setTouchOpen(false);
        }}
        onFocusCapture={(event) => {
          if (event.currentTarget.contains(event.target))
            setKeyboardWithin(event.target.matches(":focus-visible"));
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setKeyboardWithin(false);
            setTouchOpen(false);
          }
        }}
        className={cn(
          "hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-card text-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex",
          expanded ? "w-64" : "w-20",
        )}
      >
        {content(expanded)}
      </aside>
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (!open) onCloseMobile();
        }}
      >
        <SheetContent
          id="mobile-navigation"
          side="left"
          showCloseButton={false}
          aria-describedby={undefined}
          finalFocus={() => document.getElementById("navigation-menu-trigger")}
          className="w-72 max-w-[calc(100vw-32px)] gap-0 border-border bg-card text-foreground"
        >
          <SheetTitle className="sr-only">
            {t("Navegación principal")}
          </SheetTitle>
          {content(true, true)}
        </SheetContent>
      </Sheet>
    </>
  );
}
