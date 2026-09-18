import type { ReactNode } from "react";

/**
 * Alcance del look "Carbon" (IBM) del módulo de Tests de Salud.
 *
 * La tipografía IBM Plex (Sans/Mono) y la paleta carbono viven únicamente en
 * este subárbol: el resto del ERP conserva Plus Jakarta Sans + Inter. El
 * contenedor usa `display: contents` para no introducir una caja propia y
 * no alterar el layout de las páginas.
 *
 * Si el resultado convence, estos tokens se promueven a globals.css.
 */
export default function HealthTestsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="contents font-[family-name:var(--font-plex)] [&_h1]:font-[family-name:var(--font-plex)] [&_h2]:font-[family-name:var(--font-plex)] [&_h3]:font-[family-name:var(--font-plex)] [&_h4]:font-[family-name:var(--font-plex)] [&_.font-heading]:font-[family-name:var(--font-plex)] [&_.font-mono]:font-[family-name:var(--font-plex-mono)]"
      style={{
        fontFamily: "var(--font-plex), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
