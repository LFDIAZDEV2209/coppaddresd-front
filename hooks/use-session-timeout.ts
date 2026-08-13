"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/config/env";

/**
 * Detecta inactividad del usuario y ejecuta `onExpire` tras `idleMs` sin
 * actividad (mouse, teclado, click, scroll, touch). Los eventos de alta
 * frecuencia (mousemove/scroll) se throttlean a 1s.
 *
 * El timer se reinicia con cada actividad: nunca desloguea a un usuario que
 * está usando la aplicación, incluso si el access token expiró en medio
 * (el interceptor renueva la sesión con la cookie).
 */
export function useSessionTimeout(
  active: boolean,
  onExpire: () => void,
  idleMs: number = env.sessionIdleMinutes * 60_000,
): void {
  const callbackRef = useRef(onExpire);

  useEffect(() => {
    callbackRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!active || idleMs <= 0) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastReset = 0;

    const reset = () => {
      const now = Date.now();
      if (now - lastReset < 1_000) return;
      lastReset = now;
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), idleMs);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) =>
      window.addEventListener(event, reset, { passive: true }),
    );

    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [active, idleMs]);
}