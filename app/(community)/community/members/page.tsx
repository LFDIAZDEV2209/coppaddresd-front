import { Suspense } from "react";
import { MembersPage } from "@/features/community/components/members-page";

export default function CommunityMembersPage() {
  // Suspense requerido por useSearchParams en prerender estático.
  return (
    <Suspense fallback={null}>
      <MembersPage />
    </Suspense>
  );
}
