import { AuthGuard } from "@/components/feedback/auth-guard";
import { PermissionRouteGuard } from "@/components/feedback/permission-route-guard";
import { AppContextProvider } from "@/providers/context-provider";
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
      <AppContextProvider>
        <ErpProvider>
          <CommunityErpShell>
            <PermissionRouteGuard>{children}</PermissionRouteGuard>
          </CommunityErpShell>
          <ErpToaster />
        </ErpProvider>
      </AppContextProvider>
    </AuthGuard>
  );
}
