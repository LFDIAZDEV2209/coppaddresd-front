import { AdminAppointments } from "@/features/appointments/components/admin-appointments";
import { PermissionGate } from "@/features/appointments/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Appointments.AdminView">
      <AdminAppointments />
    </PermissionGate>
  );
}
