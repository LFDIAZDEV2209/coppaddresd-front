import { AdminRequests } from "@/features/appointments/components/admin-requests";
import { PermissionGate } from "@/features/appointments/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Appointments.AdminView">
      <AdminRequests />
    </PermissionGate>
  );
}
