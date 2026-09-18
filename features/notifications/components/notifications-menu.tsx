"use client";

/**
 * Panel de notificaciones del topbar (campana). Además del estado del push
 * web, es el punto de entrada visible para activarlo: muestra el permiso
 * actual (default / granted / denied), el soporte del navegador y la falta de
 * configuración de Firebase, sin romper nunca el topbar.
 */

import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { useWebPush } from "../hooks/use-web-push";

interface NotificationsMenuProps {
  /** true cuando el topbar está sobre el gradiente (scroll): ajusta el color del icono. */
  scrolled: boolean;
}

export function NotificationsMenu({ scrolled }: NotificationsMenuProps) {
  const t = useT();
  const { state, enable } = useWebPush();

  const iconBtn = scrolled
    ? "text-white/70 hover:bg-white/10 hover:text-white"
    : "text-slate-500 hover:bg-slate-100 hover:text-brand-navy";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full transition-colors",
          iconBtn,
        )}
        aria-label={t("Notificaciones")}
      >
        <Bell className="size-4" />
        <span
          className={cn(
            "absolute right-[9px] top-[9px] size-[6px] rounded-full bg-destructive ring-2",
            scrolled ? "ring-transparent" : "ring-white",
          )}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
          <BellRing
            className={cn(
              "size-4 shrink-0",
              state === "granted" ? "text-brand-teal" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground">
              {t("Notificaciones")}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {t("Avisos de citas en este navegador.")}
            </p>
          </div>
        </div>

        <div className="p-3" aria-live="polite">
          {state === "missing-config" && (
            <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
              <TriangleAlert
                className="mt-px size-3.5 shrink-0 text-amber-500"
                aria-hidden
              />
              <p>
                {t(
                  "Las notificaciones push no están configuradas en este entorno.",
                )}
              </p>
            </div>
          )}

          {state === "unsupported" && (
            <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
              <BellOff className="mt-px size-3.5 shrink-0" aria-hidden />
              <p>{t("El navegador no permite notificaciones push.")}</p>
            </div>
          )}

          {state === "denied" && (
            <div className="flex items-start gap-2 text-[11.5px] text-muted-foreground">
              <ShieldAlert
                className="mt-px size-3.5 shrink-0 text-destructive"
                aria-hidden
              />
              <p>
                {t(
                  "Bloqueaste las notificaciones. Habilítalas desde la configuración del navegador.",
                )}
              </p>
            </div>
          )}

          {(state === "default" || state === "working" || state === "error") && (
            <div className="space-y-2.5">
              <p className="text-[11.5px] text-muted-foreground">
                {t(
                  "Activa las notificaciones para recibir avisos de tus citas en este navegador.",
                )}
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => void enable()}
                disabled={state === "working"}
              >
                {state === "working" ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    {t("Activando notificaciones…")}
                  </>
                ) : (
                  <>
                    <Bell className="size-3.5" aria-hidden />
                    {t("Activar notificaciones")}
                  </>
                )}
              </Button>
              {state === "error" && (
                <p className="text-[11px] text-destructive">
                  {t(
                    "No se pudieron activar las notificaciones. Intenta de nuevo.",
                  )}
                </p>
              )}
            </div>
          )}

          {state === "granted" && (
            <div className="flex items-start gap-2 rounded-lg bg-primary-soft px-2.5 py-2">
              <CheckCircle2
                className="mt-px size-3.5 shrink-0 text-primary"
                aria-hidden
              />
              <div>
                <p className="text-[12px] font-semibold text-primary-strong">
                  {t("Notificaciones activadas")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("Recibirás avisos de tus citas en este navegador.")}
                </p>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
