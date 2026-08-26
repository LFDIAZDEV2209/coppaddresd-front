"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive-soft">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("Algo salió mal")}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("Ocurrió un error inesperado. Puedes intentar de nuevo o contactar a soporte si el problema persiste.")}
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="size-4" />
        {t("Intentar de nuevo")}
      </Button>
    </div>
  );
}
