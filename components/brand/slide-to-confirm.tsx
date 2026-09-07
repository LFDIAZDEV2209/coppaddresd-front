"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * CTA de deslizar-para-confirmar (lÃ­nea visual COPP-ADRESD): pill navy con
 * thumb teal arrastrable. Al llegar el thumb al extremo derecho dispara
 * `onConfirm` (iniciar sesiÃ³n). Alternativa de teclado: el thumb es
 * enfocable (role="slider", flechas para avanzar, Home/End), y el
 * formulario entra con Enter desde los inputs.
 *
 * InteracciÃ³n vÃ­a Pointer Events + refs (sin re-renders por movimiento);
 * respeta prefers-reduced-motion en las transiciones de snap.
 */
interface SlideToConfirmProps {
  label: string;
  /** Etiqueta mostrada mientras `busy`. */
  busyLabel?: string;
  /** Etiqueta tras completar (un instante antes de navegar). */
  doneLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
}

const THUMB = 44; // px â€” diÃ¡metro del thumb
const INSET = 4; // px â€” margen interno del track
/** Progreso mÃ­nimo (0-1) para aceptar la confirmaciÃ³n al soltar. */
const CONFIRM_AT = 0.94;

export function SlideToConfirm({
  label,
  busyLabel,
  doneLabel,
  busy = false,
  disabled = false,
  onConfirm,
  className,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, baseX: 0 });
  const confirmedRef = useRef(false);
  // Ancho medido en estado (nunca refs durante render).
  const [trackWidth, setTrackWidth] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1, estado render
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const locked = disabled || busy;

  // Distancia mÃ¡xima de desplazamiento del thumb.
  const maxTravel = Math.max(trackWidth - THUMB - INSET * 2, 0);

  const confirm = useCallback(() => {
    if (confirmedRef.current || locked) return;
    confirmedRef.current = true;
    setProgress(1);
    setDone(true);
    onConfirm();
    // Si el padre nunca entra en busy (ej. validaciÃ³n fallida), devolvemos
    // el thumb tras un instante para poder reintentar.
    window.setTimeout(() => {
      confirmedRef.current = false;
      setDone(false);
      setProgress(0);
    }, 600);
  }, [locked, onConfirm]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, baseX: progress * maxTravel };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging || locked) return;
    const dx = e.clientX - dragState.current.startX;
    const next = Math.min(Math.max(dragState.current.baseX + dx, 0), maxTravel);
    setProgress(maxTravel ? next / maxTravel : 0);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (progress >= CONFIRM_AT) {
      confirm();
    } else {
      setProgress(0); // el snap animado lo hace la transition del thumb
    }
  };

  // Teclado: flechas avanzan/retroceden; llegar a 100% confirma. Home/End.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (locked) return;
    const step = 0.08;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.min(progress + step, 1);
      setProgress(next);
      if (next >= 1) confirm();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setProgress(Math.max(progress - step, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setProgress(0);
    } else if (e.key === "End") {
      e.preventDefault();
      confirm();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      confirm();
    }
  };

  const travel = progress * maxTravel;
  const animate = !dragging; // mientras arrastra, sigue al dedo sin lag

  return (
    <div
      ref={trackRef}
      role="presentation"
      className={cn(
        "relative flex h-[56px] w-full touch-none select-none items-center overflow-hidden rounded-full bg-brand-navy pr-7 pl-1",
        "shadow-[0_14px_30px_-14px_rgba(20,40,85,0.6)] transition-colors",
        locked ? "opacity-80" : "hover:bg-[#1d3a72]",
        className,
      )}
    >
      {/* Relleno de progreso (glass sutil detrÃ¡s del thumb) */}
      <div
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-full bg-white/8"
        style={{ width: INSET + travel + THUMB / 2 }}
      />

      {/* Etiqueta + chevrones: se desvanecen conforme el thumb avanza */}
      <span
        aria-hidden={progress > 0.05 || undefined}
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 text-[15px] font-semibold tracking-tight text-white transition-opacity duration-150"
        style={{ opacity: locked ? 1 : Math.max(1 - progress * 2.2, 0) }}
      >
        {busy ? (busyLabel ?? label) : done ? (doneLabel ?? label) : label}
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      </span>

      {/* Chevrones de destino (derecha): aparecen con el avance */}
      {!busy && !done && (
        <span
          aria-hidden="true"
          className="absolute right-7 flex items-center text-white transition-opacity duration-200"
          style={{ opacity: progress * 1.4 }}
        >
          <ArrowRight className="size-4 opacity-70" />
          <ArrowRight className="-ml-2 size-4 opacity-90" />
          <ArrowRight className="-ml-2 size-4" />
        </span>
      )}

      {/* Thumb arrastrable */}
      <button
        type="button"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={done ? (doneLabel ?? label) : label}
        disabled={locked}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "relative z-10 flex shrink-0 cursor-grab items-center justify-center rounded-full bg-brand-teal text-white",
          "shadow-[0_6px_16px_-4px_rgba(3,93,77,0.55)] outline-none",
          "focus-visible:ring-3 focus-visible:ring-white/60",
          dragging
            ? "cursor-grabbing"
            : animate &&
                "transition-[transform,background-color] duration-200 ease-out",
          locked && "cursor-not-allowed",
        )}
        style={{
          width: THUMB,
          height: THUMB,
          marginLeft: INSET,
          transform: `translateX(${travel}px)`,
        }}
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : done ? (
          <Check className="size-5" aria-hidden="true" />
        ) : (
          <ArrowRight
            className={cn(
              "size-5 transition-transform",
              progress > 0.9 && "translate-x-0.5",
            )}
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}
