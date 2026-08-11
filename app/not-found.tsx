import Link from "next/link";
import { FileX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <FileX className="size-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Página no encontrada
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-strong transition-colors"
        >
          Ir al resumen
        </Link>
      </div>
    </div>
  );
}
