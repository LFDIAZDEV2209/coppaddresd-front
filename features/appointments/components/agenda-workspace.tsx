"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useState } from "react";
import { Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
import { useProfessionalOptions } from "../hooks/use-professional-options";
import { AgendaEmptyState } from "./agenda-empty-state";
import { ProfessionalSelector } from "./professional-selector";
import { ProfessionalAgenda } from "./professional-agenda";
import { ProfessionalCalendar } from "./professional-calendar";
import type { AgendaCalendarView } from "./agenda-calendar-switcher";

/**
 * Workspace único de Agenda: el toggle Agenda | Calendario vive en estado
 * local y solo cambia el componente renderizado (misma URL, sin recarga).
 * El admin comparte el selector de profesional entre ambas vistas, así la
 * selección se conserva al alternar. El profesional ve sus propias citas
 * (alcance por identidad del JWT, como antes).
 */
export function AgendaWorkspace({
  initialDate = null,
}: {
  initialDate?: string | null;
}) {
  const t = useT();
  const { can } = useAppContext();
  const isAdmin = hasAppointmentPermission(can, "Appointments.AdminView");
  const [view, setView] = useState<AgendaCalendarView>("agenda");
  const [professionalId, setProfessionalId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const catalog = useProfessionalOptions(null, isAdmin);

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <PageHeader
            title={
              view === "agenda"
                ? t("Agenda de profesionales")
                : t("Calendario de profesionales")
            }
            description={
              view === "agenda"
                ? t("Seleccioná un profesional para ver y gestionar sus citas.")
                : t(
                    "Seleccioná un profesional para ver y gestionar sus citas en el calendario.",
                  )
            }
            icon={Users}
            actions={
              <div className="w-full sm:w-72">
                <ProfessionalSelector
                  catalog={catalog}
                  open={pickerOpen}
                  onOpenChange={setPickerOpen}
                  value={professionalId}
                  onChange={setProfessionalId}
                />
              </div>
            }
          />
        </div>
      )}
      {isAdmin && !professionalId && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <AgendaEmptyState
            catalog={catalog}
            onChoose={() => setPickerOpen(true)}
          />
        </div>
      )}
      {(!isAdmin || professionalId) && (
        <div key={view} className="agenda-view-enter">
          {view === "agenda" ? (
            <ProfessionalAgenda
              fixedProfessionalId={isAdmin ? professionalId : null}
              cancelledBy={isAdmin ? "Admin" : "Professional"}
              initialDate={initialDate}
              agendaView={view}
              onAgendaViewChange={setView}
            />
          ) : (
            <ProfessionalCalendar
              fixedProfessionalId={isAdmin ? professionalId : null}
              agendaView={view}
              onAgendaViewChange={setView}
            />
          )}
        </div>
      )}
    </div>
  );
}
