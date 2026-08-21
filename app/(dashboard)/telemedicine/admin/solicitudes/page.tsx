import { AdminRequests } from "@/features/telemedicine/components/admin-requests";
import { PermissionGate } from "@/features/telemedicine/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Telemedicine.AdminView">
      <AdminRequests />
    </PermissionGate>
  );
}
