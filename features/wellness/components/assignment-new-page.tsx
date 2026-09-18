"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { AssignmentFormFields } from "./assignment-form";

/**
 * Página dedicada de creación de asignaciones (/wellness/assignments/new):
 * reemplaza al antiguo modal "Nueva asignación". Reutiliza
 * AssignmentFormFields (que llama a los servicios del módulo); tras crear
 * navega al listado con feedback.
 */
export function AssignmentNewPage() {
  const t = useT();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/wellness/assignments")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a asignaciones")}
      </Button>

      <PageHeader
        title={t("Nueva asignación")}
        description={t("Asigna una rutina de ejercicio a un paciente.")}
        icon={CalendarCheck}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        <AssignmentFormFields
          key="new"
          onCancel={() => router.push("/wellness/assignments")}
          onCreated={() => router.push("/wellness/assignments?creado=1")}
        />
      </div>
    </div>
  );
}
