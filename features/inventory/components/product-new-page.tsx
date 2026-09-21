"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createProduct } from "../services/inventory-service";
import { ProductFormFields } from "./products-page";
import type { ProductInput } from "../types";

/**
 * Página dedicada de creación de productos (/inventory/new): reemplaza al
 * antiguo modal "Nuevo producto". Reutiliza ProductFormFields y el servicio
 * existente; tras crear navega al listado con feedback.
 */
export function ProductNewPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (input: ProductInput) => {
    setServerError(null);
    setSaving(true);
    try {
      await createProduct(input);
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/inventory?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error
          ? err.message
          : t("No se pudo crear el producto."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/inventory")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a productos")}
      </Button>

      <PageHeader
        title={t("Nuevo producto")}
        description={t("El producto queda preparado para medicamentos y futuras categorías.")}
        icon={Package}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {serverError && (
          <p
            className="rounded-none bg-destructive-soft px-6 py-3 text-sm text-destructive"
            role="alert"
          >
            {serverError}
          </p>
        )}
        <ProductFormFields
          key="new"
          saving={saving}
          onCancel={() => router.push("/inventory")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
