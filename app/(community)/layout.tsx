import { AuthGuard } from "@/components/feedback/auth-guard";
import { CommunityErpShell } from "@/features/community/components/community-shell";
import { ErpProvider } from "@/features/community/erp-provider";
import { ErpToaster } from "@/features/community/components/erp-toaster";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ErpProvider>
        <CommunityErpShell>{children}</CommunityErpShell>
        <ErpToaster />
      </ErpProvider>
    </AuthGuard>
  );
}
