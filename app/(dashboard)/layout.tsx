import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AuthGuard } from "@/components/feedback/auth-guard";
import { BreadcrumbTitleProvider } from "@/components/layout/breadcrumb-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <BreadcrumbTitleProvider>
        <DashboardShell>{children}</DashboardShell>
      </BreadcrumbTitleProvider>
    </AuthGuard>
  );
}
