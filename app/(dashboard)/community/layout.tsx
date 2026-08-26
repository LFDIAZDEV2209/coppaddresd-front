"use client";

import { ErpProvider } from "@/features/community-erp/erp-provider";
import { ErpToaster } from "@/features/community-erp/components/erp-toaster";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErpProvider>
      {children}
      <ErpToaster />
    </ErpProvider>
  );
}
