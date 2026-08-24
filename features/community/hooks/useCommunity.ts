"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "urql";
import {
  BAN_PROFILE,
  FEED_QUERY,
  MODERATE_DELETE_POST,
  PIN_POST,
  PROFILES_QUERY,
  UNBAN_PROFILE,
  type FeedResult,
  type ProfilesResult,
} from "../services/community";

const PAGE_SIZE = 50;
const PROFILE_PAGE_SIZE = 200;

export interface FeedPostView {
  post: CommunityPostLike;
  likeCount: number;
  commentCount: number;
}

type CommunityPostLike = FeedResult["feed"][number];

/** Variables opcionales para filtrar el feed (autor, palabra, fecha). */
export interface FeedVariables extends Record<string, unknown> {
  author?: string;
  search?: string;
  from?: string;
  to?: string;
}

/** Datos de la comunidad para el panel de administración. */
export function useCommunity({
  feedVariables,
}: { feedVariables?: FeedVariables } = {}) {
  const [profilesResult, refetchProfiles] = useQuery<ProfilesResult>({
    query: PROFILES_QUERY,
    variables: { take: PROFILE_PAGE_SIZE, skip: 0 },
  });
  const [feedResult, refetchFeed] = useQuery<FeedResult>({
    query: FEED_QUERY,
    // Siempre consultamos al servidor: los filtros se aplican al pulsar
    // "Aplicar"/"Limpiar" y no queremos respuestas cacheadas entre combinaciones.
    requestPolicy: "network-only",
    variables: { take: PAGE_SIZE, skip: 0, ...feedVariables },
  });

  const [, banProfileMutation] = useMutation(BAN_PROFILE);
  const [, unbanProfileMutation] = useMutation(UNBAN_PROFILE);
  const [, pinPostMutation] = useMutation(PIN_POST);
  const [, deletePostMutation] = useMutation(MODERATE_DELETE_POST);

  const profiles = useMemo(
    () => profilesResult.data?.profiles ?? [],
    [profilesResult.data],
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

  const banProfile = async (id: string, reason?: string) => {
    const result = await banProfileMutation({ id, reason: reason || null });
    if (result.error) throw result.error;
    refetchProfiles({ requestPolicy: "network-only" });
    return result.data?.banProfile ?? null;
  };

  const unbanProfile = async (id: string) => {
    const result = await unbanProfileMutation({ id });
    if (result.error) throw result.error;
    refetchProfiles({ requestPolicy: "network-only" });
    return result.data?.unbanProfile ?? null;
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
    profiles,
    profilesLoading: profilesResult.fetching,
    profilesError: profilesResult.error?.message ?? null,
    refetchProfiles,
    feed,
    feedLoading: feedResult.fetching,
    feedError: feedResult.error?.message ?? null,
    refetchFeed,
    banProfile,
    unbanProfile,
    pinPost,
    deletePost,
  };
}