import { AdminProfessionals } from "@/features/appointments/components/admin-professionals";
import { PermissionGate } from "@/features/appointments/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Appointments.AdminView">
      <AdminProfessionals />
    </PermissionGate>
  );
}
