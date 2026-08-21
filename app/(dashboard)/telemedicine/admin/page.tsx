import { AdminDashboard } from "@/features/telemedicine/components/admin-dashboard";
import { PermissionGate } from "@/features/telemedicine/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Telemedicine.AdminView">
      <AdminDashboard />
    </PermissionGate>
  );
}
