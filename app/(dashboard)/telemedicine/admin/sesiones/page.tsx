import { AdminSessions } from "@/features/telemedicine/components/admin-sessions";
import { PermissionGate } from "@/features/telemedicine/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Telemedicine.AdminView">
      <AdminSessions />
    </PermissionGate>
  );
}
