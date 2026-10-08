"use client";

import { useDeferredValue } from "react";
import { useQuery } from "urql";
import { PROFILES_PAGE_QUERY, type ProfilesPageResult } from "../services/community";
import { mapProfile } from "../erp-provider";

export function useMemberPage(search: string, diagnosis: string, region: string, page: number, size: number, activeOnly = false) {
  const deferredSearch = useDeferredValue(search.trim());
  const [result, retry] = useQuery<ProfilesPageResult>({
    query: PROFILES_PAGE_QUERY,
    variables: {
      take: size, skip: (page - 1) * size,
      search: deferredSearch || undefined,
      diagnosis: diagnosis === "all" ? undefined : diagnosis.replace("+", "").toUpperCase(),
      region: region === "all" ? undefined : region.toUpperCase(),
      status: activeOnly ? "ACTIVE" : undefined,
    },
    requestPolicy: "cache-and-network",
  });
  return {
    members: (result.data?.profilesPage.items ?? []).map(mapProfile),
    total: result.data?.profilesPage.totalCount ?? 0,
    loading: result.fetching || deferredSearch !== search.trim(),
    error: result.error?.message,
    retry: () => retry({ requestPolicy: "network-only" }),
  };
}
