"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useAppContext } from "@/providers/context-provider";
import { hasAppointmentPermission } from "@/lib/config/appointment-permissions";
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

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="px-6 pt-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-gradient px-4 py-3 shadow-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--sidebar)] shadow-sm">
              <Users className="size-4.5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[13px] font-semibold text-white">
                {view === "agenda"
                  ? t("Agenda de profesionales")
                  : t("Calendario de profesionales")}
              </p>
              <p className="text-[11.5px] text-white/75">
                {view === "agenda"
                  ? t(
                      "Seleccioná un profesional para ver y gestionar sus citas.",
                    )
                  : t(
                      "Seleccioná un profesional para ver y gestionar sus citas en el calendario.",
                    )}
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-72">
              <ProfessionalSelector
                value={professionalId}
                onChange={setProfessionalId}
              />
            </div>
          </div>
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
