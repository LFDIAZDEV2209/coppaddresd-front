"use client";

import { ErpProvider } from "@/features/community/erp-provider";
import { ErpToaster } from "@/features/community/components/erp-toaster";

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
