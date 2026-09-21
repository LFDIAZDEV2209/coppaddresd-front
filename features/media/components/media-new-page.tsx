"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileAudio } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { createMediaItem } from "../services/media-service";
import { resolveStorageKeys } from "../services/upload-service";
import { MediaFormFields } from "./media-form-fields";
import type { MediaInput } from "../types";

/**
 * Página dedicada de creación de medios (/media/new): reemplaza al antiguo
 * modal "Nuevo medio". Reutiliza el formulario compartido (MediaFormFields)
 * y la lógica de subida del módulo; tras crear navega a /media con feedback.
 */
export function MediaNewPage() {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (
    input: MediaInput,
    file?: File,
    thumbnailFile?: File | null,
    onProgress?: (percent: number) => void,
  ) => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = await resolveStorageKeys(input, file, thumbnailFile, onProgress);
      await createMediaItem(payload);
      // Feedback de éxito + regreso al listado (se recarga fresco al montar).
      router.push("/media?creado=1");
    } catch (err) {
      // Se conservan los datos del formulario (estado local) para corregir.
      setServerError(
        err instanceof Error ? err.message : t('No se pudo crear el medio.'),
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
        onClick={() => router.push("/media")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t('Volver a medios')}
      </Button>

      <PageHeader
        title={t('Nuevo medio')}
        description={t('Crea un nuevo recurso multimedia para el sistema.')}
        icon={FileAudio}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border bg-primary-soft px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileAudio className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">{t('Archivo del medio')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('Adjuntá el archivo: el tipo, la duración y el tamaño se detectan automáticamente.')}
              </p>
            </div>
          </div>
        </div>
        <MediaFormFields
          key="new"
          saving={saving}
          serverError={serverError}
          submitLabel={t('Crear medio')}
          onCancel={() => router.push("/media")}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
