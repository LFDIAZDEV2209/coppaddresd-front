import { AuthGuard } from "@/components/feedback/auth-guard";
import { CommunityErpShell } from "@/features/community/components/community-shell";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CommunityErpShell>{children}</CommunityErpShell>
    </AuthGuard>
  );
}
