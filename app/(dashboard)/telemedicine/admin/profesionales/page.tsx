import { AdminProfessionals } from "@/features/telemedicine/components/admin-professionals";
import { PermissionGate } from "@/features/telemedicine/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Telemedicine.AdminView">
      <AdminProfessionals />
    </PermissionGate>
  );
}
