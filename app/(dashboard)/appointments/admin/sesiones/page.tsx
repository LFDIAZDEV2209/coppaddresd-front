import { AdminSessions } from "@/features/appointments/components/admin-sessions";
import { PermissionGate } from "@/features/appointments/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Appointments.AdminView">
      <AdminSessions />
    </PermissionGate>
  );
}
