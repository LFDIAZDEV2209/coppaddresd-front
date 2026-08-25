"use client";

import { Provider } from "urql";
import { communityClient } from "@/features/community/services/client";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider value={communityClient}>{children}</Provider>;
}