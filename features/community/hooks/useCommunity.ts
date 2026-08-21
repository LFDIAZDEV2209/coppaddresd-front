"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "urql";
import {
  APPROVE_PROFILE,
  FEED_QUERY,
  MODERATE_DELETE_POST,
  PENDING_PROFILES_QUERY,
  PIN_POST,
  REJECT_PROFILE,
  type FeedResult,
  type PendingProfilesResult,
} from "../services/community";

const PAGE_SIZE = 50;

export interface FeedPostView {
  post: CommunityPostLike;
  likeCount: number;
  commentCount: number;
}

type CommunityPostLike = FeedResult["feed"][number];

/** Datos de la comunidad para el panel de administración. */
export function useCommunity() {
  const [pendingResult, refetchPending] = useQuery<PendingProfilesResult>({
    query: PENDING_PROFILES_QUERY,
  });
  const [feedResult, refetchFeed] = useQuery<FeedResult>({
    query: FEED_QUERY,
    variables: { take: PAGE_SIZE, skip: 0 },
  });

  const [, approveProfileMutation] = useMutation(APPROVE_PROFILE);
  const [, rejectProfileMutation] = useMutation(REJECT_PROFILE);
  const [, pinPostMutation] = useMutation(PIN_POST);
  const [, deletePostMutation] = useMutation(MODERATE_DELETE_POST);

  const pendingProfiles = useMemo(
    () => pendingResult.data?.pendingProfiles ?? [],
    [pendingResult.data],
  );

  const feed = useMemo<FeedPostView[]>(
    () =>
      (feedResult.data?.feed ?? []).map((post) => ({
        post,
        likeCount: post.likes.length,
        commentCount: post.comments.length,
      })),
    [feedResult.data],
  );

  const approveProfile = async (id: string) => {
    const result = await approveProfileMutation({ id });
    if (result.error) throw result.error;
    refetchPending({ requestPolicy: "network-only" });
    return result.data?.approveProfile ?? null;
  };

  const rejectProfile = async (id: string, reason?: string) => {
    const result = await rejectProfileMutation({ id, reason: reason || null });
    if (result.error) throw result.error;
    refetchPending({ requestPolicy: "network-only" });
    return result.data?.rejectProfile ?? null;
  };

  const pinPost = async (id: string, pinned: boolean) => {
    const result = await pinPostMutation({ id, pinned });
    if (result.error) throw result.error;
    refetchFeed({ requestPolicy: "network-only" });
    return result.data?.pinPost ?? null;
  };

  const deletePost = async (id: string) => {
    const result = await deletePostMutation({ id });
    if (result.error) throw result.error;
    refetchFeed({ requestPolicy: "network-only" });
    return result.data?.moderateDeletePost ?? null;
  };

  return {
    pendingProfiles,
    pendingLoading: pendingResult.fetching,
    pendingError: pendingResult.error?.message ?? null,
    feed,
    feedLoading: feedResult.fetching,
    feedError: feedResult.error?.message ?? null,
    refetchFeed,
    approveProfile,
    rejectProfile,
    pinPost,
    deletePost,
  };
}