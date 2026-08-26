import { AdminDashboard } from "@/features/appointments/components/admin-dashboard";
import { PermissionGate } from "@/features/appointments/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Appointments.AdminView">
      <AdminDashboard />
    </PermissionGate>
  );
}
