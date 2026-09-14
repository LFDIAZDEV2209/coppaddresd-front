"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import styles from "./animated-icon.module.css";
import { AnimatedIconArtwork } from "./animated-icon-artwork";

const icons = {
  "medical-kit": {
    position: "0 0",
    duration: "5.8s",
    delay: "-1.2s",
    tilt: "-4deg",
  },
  "status-check": {
    position: "100% 0",
    duration: "5.1s",
    delay: "-2.8s",
    tilt: "5deg",
  },
  invitation: {
    position: "0 100%",
    duration: "6.2s",
    delay: "-0.7s",
    tilt: "-5deg",
  },
  "status-pause": {
    position: "100% 100%",
    duration: "5.6s",
    delay: "-3.6s",
    tilt: "4deg",
  },
} as const;

export type AnimatedIconName = keyof typeof icons;

/** Icono decorativo: el control contenedor aporta el nombre accesible y la acción. */
export function AnimatedIcon({
  name,
  size = 76,
  motion = true,
  className,
}: {
  name: AnimatedIconName;
  size?: number;
  motion?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !motion) return;
    let visible = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const synchronize = () => {
      element.dataset.running = String(
        visible && !document.hidden && !preference.matches,
      );
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        synchronize();
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", synchronize);
    preference.addEventListener("change", synchronize);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", synchronize);
      preference.removeEventListener("change", synchronize);
      element.dataset.running = "false";
    };
  }, [motion]);

  const icon = icons[name];
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-animated-icon={name}
      data-motion={motion}
      className={cn(styles.root, className)}
      style={
        {
          "--icon-size": `${size}px`,
          "--icon-position": icon.position,
          "--icon-duration": icon.duration,
          "--icon-delay": icon.delay,
          "--icon-tilt": icon.tilt,
        } as CSSProperties
      }
    >
      <span className={styles.interaction}>
        <span className={styles.float}>
          <AnimatedIconArtwork name={name} />
        </span>
      </span>
    </span>
  );
}
