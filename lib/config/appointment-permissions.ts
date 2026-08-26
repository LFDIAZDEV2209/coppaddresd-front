/**
 * Permisos transitorios del módulo de Citas.
 *
 * La Fase 1 (Auth) emite en el JWT los códigos NUEVOS (`Appointments.*`) junto
 * a los VIEJOS (`Telemedicine.*`); los tokens emitidos antes de esa fase solo
 * traen los viejos. Durante la transición TODO gate de permisos debe aceptar
 * ambos códigos. Cuando el rollout de Phase-1 se complete y se retire el código
 * viejo, borrar este mapeo y quedarse solo con los códigos nuevos.
 */

export const APPOINTMENT_PERMISSION_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  "Appointments.RequestsCreate": ["Telemedicine.RequestsCreate"],
  "Appointments.RequestsView": ["Telemedicine.RequestsView"],
  "Appointments.RequestsConfirm": ["Telemedicine.RequestsConfirm"],
  "Appointments.Schedule": ["Telemedicine.AppointmentsSchedule"],
  "Appointments.View": ["Telemedicine.AppointmentsView"],
  "Appointments.Cancel": ["Telemedicine.AppointmentsCancel"],
  "Appointments.Reschedule": ["Telemedicine.AppointmentsReschedule"],
  "Appointments.AgendaView": ["Telemedicine.AgendaView"],
  "Appointments.AlertsView": ["Telemedicine.AlertsView"],
  "Appointments.SessionsManage": ["Telemedicine.SessionsManage"],
  "Appointments.AdminView": ["Telemedicine.AdminView"],
};

/**
 * ¿Tiene el permiso nuevo O su alias legacy (transición Phase-1)?
 * Para códigos sin alias (resto del ERP) se comporta igual que `can(code)`.
 */
export function hasAppointmentPermission(
  can: (code: string) => boolean,
  code: string,
): boolean {
  if (can(code)) return true;
  const legacy = APPOINTMENT_PERMISSION_ALIASES[code];
  return legacy ? legacy.some((alias) => can(alias)) : false;
}