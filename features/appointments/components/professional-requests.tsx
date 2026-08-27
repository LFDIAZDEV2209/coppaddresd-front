"use client";

import { Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "../hooks/use-current-user";
import { useMySummary } from "../hooks/use-admin";
import { RequestsInbox } from "./requests-inbox";

/**
 * Solicitudes del profesional clínico: solo las que los pacientes enviaron a
 * su agenda (professionalId resuelto por identidad del JWT en /me). Puede
 * confirmarlas → se convierten en cita.
 */
export function ProfessionalRequests() {
  const { context, loading: userLoading } = useCurrentUser();
  const summary = useMySummary();

  if (userLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-[76px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const professional = context?.professional;

  if (!professional) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Stethoscope className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          El usuario no es un profesional clínico
        </p>
        <p className="max-w-sm text-[12.5px] text-muted-foreground">
          Solo los profesionales con perfil clínico reciben solicitudes de
          telemedicina.
        </p>
      </div>
    );
  }

  return (
    <RequestsInbox
      scope="professional"
      professionalId={professional.id}
      professionalName={professional.fullName}
      summary={summary}
      canConfirm
    />
  );
}
