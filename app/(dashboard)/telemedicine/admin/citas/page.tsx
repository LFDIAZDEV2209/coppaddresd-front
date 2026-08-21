import { AdminAppointments } from "@/features/telemedicine/components/admin-appointments";
import { PermissionGate } from "@/features/telemedicine/components/permission-gate";

export default function Page() {
  return (
    <PermissionGate permission="Telemedicine.AdminView">
      <AdminAppointments />
    </PermissionGate>
  );
}
