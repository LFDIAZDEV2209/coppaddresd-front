"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive-soft">
            <AlertTriangle className="size-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Error crítico
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            La aplicación no pudo cargarse. Recarga la página para intentar de
            nuevo.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-strong transition-colors"
          >
            Recargar página
          </button>
        </div>
      </body>
    </html>
  );
}
