// Operaciones GraphQL del módulo de Clubes (hand-written, sin codegen).
// Contrato real del backend CoppAddresd.Community (Fase 2): extensiones
// ClubQuery/ClubMutation/ClubSubscription de la raíz. El wire del backend se
// mapea a los tipos del contrato D1 (features/community/clubs/types.ts).
import { gql, type AnyVariables } from "urql";
import { communityClient } from "../../services/client";
import { env } from "@/lib/config/env";
import type {
  Club,
  ClubAnalytics,
  ClubEvent,
  ClubInvitation,
  ClubMember,
  ClubNotification,
  ClubPost,
  EventAttendance,
  LiveChatMessage,
  LiveSession,
  ModerationReport,
} from "../types";

// --- Queries ---

export const CLUBS_QUERY = gql`
  query Clubs($filter: ClubFilterInput, $take: Int, $skip: Int) {
    clubs(filter: $filter, take: $take, skip: $skip) {
      id slug name description rules objectives category tags
      coverUrl logoUrl visibility maxMembers status memberCount createdAt
      myMembership { clubId profileId role status mutedUntil joinedAt }
    }
  }
`;

export const CLUB_QUERY = gql`
  query Club($id: UUID!) {
    club(id: $id) {
      id slug name description rules objectives category tags
      coverUrl logoUrl visibility maxMembers status memberCount createdAt
      myMembership {
        clubId profileId role status mutedUntil joinedAt
        profile { id displayName }
      }
    }
  }
`;

export const MY_CLUBS_QUERY = gql`
  query MyClubs {
    myClubs {
      id slug name description rules objectives category tags
      coverUrl logoUrl visibility maxMembers status memberCount createdAt
      myMembership { clubId profileId role status mutedUntil joinedAt }
    }
  }
`;

export const CLUB_FEED_QUERY = gql`
  query ClubFeed($clubId: UUID!, $take: Int, $skip: Int) {
    clubFeed(clubId: $clubId, take: $take, skip: $skip) {
      id clubId body type clubVisibility clubStatus pinned featured scheduledFor createdAt
      profile { id displayName isSystem }
      likes { id profileId }
      comments { id body profileId createdAt profile { id displayName } }
      poll { options { id text votes { id profileId } } }
    }
  }
`;

export const PUBLIC_CLUB_POSTS_QUERY = gql`
  query PublicClubPosts($take: Int) {
    publicClubPosts(take: $take) {
      id clubId body type clubVisibility clubStatus pinned featured scheduledFor createdAt
      profile { id displayName isSystem }
      likes { id profileId }
      comments { id body profileId createdAt profile { id displayName } }
      poll { options { id text votes { id profileId } } }
    }
  }
`;

export const CLUB_MEMBERS_QUERY = gql`
  query ClubMembers($clubId: UUID!, $status: ClubMemberStatus) {
    clubMembers(clubId: $clubId, status: $status) {
      clubId profileId role status mutedUntil joinedAt
      profile { id displayName isSystem }
    }
  }
`;

export const CLUB_REQUESTS_QUERY = gql`
  query ClubRequests($clubId: UUID!) {
    clubRequests(clubId: $clubId) {
      clubId profileId role status mutedUntil joinedAt
      profile { id displayName isSystem }
    }
  }
`;

export const CLUB_EVENTS_QUERY = gql`
  query ClubEvents($clubId: UUID!) {
    clubEvents(clubId: $clubId) {
      id clubId title description type startsAt endsAt location meetingUrl
      maxAttendees confirmedCount waitlistCount status
      myAttendance { id status }
    }
  }
`;

export const CLUB_LIVES_QUERY = gql`
  query ClubLiveSessions($clubId: UUID!) {
    clubLiveSessions(clubId: $clubId) {
      id clubId eventId title scheduledStartAt status embedUrl
      speakers { profileId profile { id displayName } }
      chatMessages { id senderProfileId body sentAt }
    }
  }
`;

export const CLUB_ANALYTICS_QUERY = gql`
  query ClubAnalytics($clubId: UUID!) {
    clubAnalytics(clubId: $clubId) {
      activeMembers weeklyGrowth engagement retention
      topPosts { id body createdAt profile { id displayName } }
      eventParticipation { id title startsAt confirmedCount waitlistCount status }
    }
  }
`;

export const CLUB_REPORTS_QUERY = gql`
  query ClubReports($clubId: UUID!) {
    clubReports(clubId: $clubId) {
      id clubId targetType targetId reporterProfileId reason createdAt
    }
  }
`;

export const CLUB_NOTIFICATIONS_QUERY = gql`
  query ClubNotifications($take: Int) {
    clubNotifications(take: $take) {
      id clubId type payload readAt createdAt
    }
  }
`;

export const PROFILES_QUERY = gql`
  query Profiles($take: Int!, $skip: Int!, $search: String) {
    profiles(take: $take, skip: $skip, search: $search) {
      id
      displayName
      isSystem
    }
  }
`;

// --- Mutations ---

export const CREATE_CLUB_MEDIA_UPLOAD_INFO = gql`
  mutation CreateClubMediaUploadInfo(
    $clubId: UUID
    $kind: String!
    $fileName: String!
    $contentType: String!
  ) {
    createClubMediaUploadInfo(
      clubId: $clubId
      kind: $kind
      fileName: $fileName
      contentType: $contentType
    ) {
      key
      uploadUrl
      readUrl
    }
  }
`;

export const CREATE_CLUB = gql`
  mutation CreateClub($input: ClubInput!) {
    createClub(input: $input) { id slug name }
  }
`;

export const UPDATE_CLUB = gql`
  mutation UpdateClub($id: UUID!, $input: ClubInput!) {
    updateClub(id: $id, input: $input) { id slug name }
  }
`;

export const ARCHIVE_CLUB = gql`
  mutation ArchiveClub($id: UUID!) { archiveClub(id: $id) { id status } }
`;

export const UNARCHIVE_CLUB = gql`
  mutation UnarchiveClub($id: UUID!) { unarchiveClub(id: $id) { id status } }
`;

export const JOIN_CLUB_DIRECT = gql`
  mutation JoinClubDirect($clubId: UUID!) {
    joinClubDirect(clubId: $clubId) { clubId profileId role status mutedUntil joinedAt }
  }
`;

export const REQUEST_MEMBERSHIP = gql`
  mutation RequestMembership($clubId: UUID!) {
    requestMembership(clubId: $clubId) { clubId profileId role status }
  }
`;

export const LEAVE_CLUB = gql`
  mutation LeaveClub($clubId: UUID!) { leaveClub(clubId: $clubId) }
`;

export const APPROVE_MEMBERSHIP = gql`
  mutation ApproveMembership($clubId: UUID!, $profileId: UUID!) {
    approveMembership(clubId: $clubId, profileId: $profileId) {
      clubId profileId role status mutedUntil joinedAt
    }
  }
`;

export const REJECT_MEMBERSHIP = gql`
  mutation RejectMembership($clubId: UUID!, $profileId: UUID!) {
    rejectMembership(clubId: $clubId, profileId: $profileId)
  }
`;

export const EXPEL_MEMBER = gql`
  mutation ExpelMember($clubId: UUID!, $profileId: UUID!) {
    expelMember(clubId: $clubId, profileId: $profileId)
  }
`;

export const MUTE_MEMBER = gql`
  mutation MuteMember($clubId: UUID!, $profileId: UUID!, $until: DateTime!) {
    muteMember(clubId: $clubId, profileId: $profileId, until: $until) {
      clubId profileId role status mutedUntil joinedAt
    }
  }
`;

export const UNMUTE_MEMBER = gql`
  mutation UnmuteMember($clubId: UUID!, $profileId: UUID!) {
    unmuteMember(clubId: $clubId, profileId: $profileId) {
      clubId profileId role status mutedUntil joinedAt
    }
  }
`;

export const CHANGE_MEMBER_ROLE = gql`
  mutation ChangeMemberRole($clubId: UUID!, $profileId: UUID!, $role: ClubMemberRole!) {
    changeMemberRole(clubId: $clubId, profileId: $profileId, role: $role) {
      clubId profileId role status mutedUntil joinedAt
    }
  }
`;

export const ADD_CLUB_MEMBER = gql`
  mutation AddClubMember($clubId: UUID!, $profileId: UUID!, $role: ClubMemberRole!) {
    addClubMember(clubId: $clubId, profileId: $profileId, role: $role) {
      clubId profileId role status mutedUntil joinedAt
    }
  }
`;

export const CREATE_INVITATION = gql`
  mutation CreateInvitation($clubId: UUID!, $expiresAt: DateTime) {
    createInvitation(clubId: $clubId, expiresAt: $expiresAt) {
      id token expiresAt
    }
  }
`;

export const CREATE_CLUB_POST = gql`
  mutation CreateClubPost($clubId: UUID!, $input: ClubPostInput!) {
    createClubPost(clubId: $clubId, input: $input) { id body clubStatus pinned featured scheduledFor }
  }
`;

export const UPDATE_CLUB_POST = gql`
  mutation UpdateClubPost($id: UUID!, $input: ClubPostInput!) {
    updateClubPost(id: $id, input: $input) { id body }
  }
`;

export const PUBLISH_SCHEDULED_POST = gql`
  mutation PublishScheduledPost($id: UUID!) {
    publishScheduledPost(id: $id) { id clubStatus }
  }
`;

export const DELETE_CLUB_POST = gql`
  mutation DeleteClubPost($id: UUID!) { deleteClubPost(id: $id) }
`;

export const TOGGLE_CLUB_POST_LIKE = gql`
  mutation ToggleClubPostLike($postId: UUID!) {
    toggleClubPostLike(postId: $postId) { id clubId body clubVisibility }
  }
`;

export const ADD_CLUB_COMMENT = gql`
  mutation AddClubComment($postId: UUID!, $body: String!) {
    addClubComment(postId: $postId, body: $body) { id postId body }
  }
`;

export const VOTE_CLUB_POLL = gql`
  mutation VoteClubPoll($postId: UUID!, $optionId: UUID!) {
    voteClubPoll(postId: $postId, optionId: $optionId) { id }
  }
`;

export const CREATE_CLUB_EVENT = gql`
  mutation CreateClubEvent($clubId: UUID!, $input: ClubEventInput!) {
    createClubEvent(clubId: $clubId, input: $input) {
      id clubId title description type startsAt endsAt location meetingUrl maxAttendees
    }
  }
`;

export const CONFIRM_ATTENDANCE = gql`
  mutation ConfirmAttendance($eventId: UUID!) {
    confirmAttendance(eventId: $eventId) { id eventId profileId status createdAt }
  }
`;

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($eventId: UUID!) {
    joinWaitlist(eventId: $eventId) { id eventId profileId status createdAt }
  }
`;

export const CHECK_IN = gql`
  mutation CheckIn($eventId: UUID!) {
    checkIn(eventId: $eventId) { id eventId profileId status createdAt }
  }
`;

export const SCHEDULE_LIVE = gql`
  mutation ScheduleLive($clubId: UUID!, $input: LiveSessionInput!) {
    scheduleLive(clubId: $clubId, input: $input) { id clubId title scheduledStartAt status }
  }
`;

export const SEND_LIVE_CHAT_MESSAGE = gql`
  mutation SendLiveChatMessage($liveId: UUID!, $body: String!) {
    sendLiveChatMessage(liveId: $liveId, body: $body) { id senderProfileId body sentAt }
  }
`;

export const RESOLVE_REPORT = gql`
  mutation ResolveReport($clubId: UUID!, $reportId: UUID!, $action: String!) {
    resolveReport(clubId: $clubId, reportId: $reportId, action: $action)
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: UUID!) {
    markNotificationRead(id: $id) { id readAt }
  }
`;

// Wire del backend: shape libre de la respuesta GraphQL (se mapea al contrato D1).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Wire = any;

// --- Ejecución imperativa (patrón de la capa mock del change D2) ---

/** Documento GraphQL tipado (DocumentNode de urql). */
type GqlDoc = Parameters<typeof communityClient.executeQuery>[0]["query"];

async function query<T>(doc: GqlDoc, variables: AnyVariables = {}): Promise<T> {
  const res = await communityClient
    .executeQuery({ query: doc, variables } as never, { requestPolicy: "network-only" } as never)
    .toPromise();
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function mutate<T>(doc: GqlDoc, variables: AnyVariables = {}): Promise<T> {
  const res = await communityClient
    .executeMutation({ query: doc, variables } as never)
    .toPromise();
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/**
 * Sube la portada (COVER) o el logo (LOGO) de un club: obtiene la información
 * de subida firmada y hace el PUT del binario (Bearer del ERP). Devuelve la
 * clave para guardarla en createClub/updateClub.
 */
export async function uploadClubImage(
  clubId: string | null,
  kind: "COVER" | "LOGO",
  file: File,
): Promise<string> {
  const data = await mutate<{ createClubMediaUploadInfo: { key: string; uploadUrl: string } }>(
    CREATE_CLUB_MEDIA_UPLOAD_INFO,
    {
      clubId: clubId ?? null,
      kind,
      fileName: file.name,
      contentType: file.type,
    },
  );
  const { uploadUrl } = data.createClubMediaUploadInfo;

  const { getAccessToken } = await import("@/lib/api/http");
  const token = getAccessToken();
  const absoluteUploadUrl = uploadUrl.startsWith("http")
    ? uploadUrl
    : `${env.apiUrl}${uploadUrl}`;
  const res = await fetch(absoluteUploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Error subiendo la imagen (${res.status}).`);
  return data.createClubMediaUploadInfo.key;
}

// --- Mapeos wire (backend) → contrato D1 (dev types) ---

export function mapType(wireType: string | null | undefined): ClubPost["type"] {
  switch (wireType?.toUpperCase()) {
    case "IMAGEN": return "IMAGEN";
    case "VIDEO": return "VIDEO";
    case "ENCUESTA": return "ENCUESTA";
    case "ANUNCIO": return "ANUNCIO";
    default: return "TEXTO";
  }
}

function resolveStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${env.apiUrl}${url}`;
}

export function toClub(wire: Wire): Club {
  return {
    id: wire.id,
    slug: wire.slug,
    name: wire.name,
    description: wire.description ?? "",
    rules: wire.rules ?? [],
    objectives: wire.objectives ?? [],
    category: wire.category,
    tags: wire.tags ?? [],
    coverUrl: resolveStorageUrl(wire.coverUrl),
    logoUrl: resolveStorageUrl(wire.logoUrl),
    visibility: wire.visibility,
    maxMembers: wire.maxMembers ?? null,
    status: wire.status,
    memberCount: wire.memberCount ?? 0,
    myMembership: wire.myMembership?.role ?? null,
    createdAt: wire.createdAt,
  };
}

export function toClubMember(wire: Wire): ClubMember {
  return {
    id: `${wire.clubId}:${wire.profileId}`,
    clubId: wire.clubId,
    profile: {
      id: wire.profile?.id ?? wire.profileId,
      displayName: wire.profile?.displayName ?? "Miembro",
    },
    role: wire.role,
    status: wire.status,
    mutedUntil: wire.mutedUntil ?? null,
    joinedAt: wire.joinedAt,
  };
}

export function toClubPost(wire: Wire): ClubPost {
  return {
    id: wire.id,
    clubId: wire.clubId,
    body: wire.body,
    type: mapType(wire.type),
    visibility: (wire.clubVisibility ?? "PUBLICO").toUpperCase() as ClubPost["visibility"],
    pinned: wire.pinned ?? false,
    featured: wire.featured ?? false,
    scheduledFor: wire.scheduledFor ?? null,
    status: (wire.clubStatus ?? "PUBLICADO").toUpperCase() as ClubPost["status"],
    author: {
      id: wire.profile?.id ?? "",
      displayName: wire.profile?.displayName ?? "Desconocido",
    },
    likes: (wire.likes ?? []).map((l: Wire) => l.profileId),
    comments: (wire.comments ?? []).map((c: Wire) => ({
      id: c.id,
      postId: wire.id,
      body: c.body,
      author: { id: c.profileId, displayName: c.profile?.displayName ?? "Miembro" },
      createdAt: c.createdAt,
      likes: (c.likes ?? []).map((l: Wire) => l.profileId),
    })),
    poll: wire.poll
      ? {
          id: `${wire.id}-poll`,
          question: wire.body,
          options: wire.poll.options.map((o: Wire, i: number) => ({
            id: o.id,
            text: o.text,
            position: i,
            votes: (o.votes ?? []).map((v: Wire) => v.profileId),
          })),
        }
      : null,
    createdAt: wire.createdAt,
  };
}

export function toClubEvent(wire: Wire): ClubEvent {
  return {
    id: wire.id,
    clubId: wire.clubId,
    title: wire.title,
    description: wire.description ?? "",
    type: wire.type,
    startsAt: wire.startsAt,
    endsAt: wire.endsAt,
    location: wire.location ?? null,
    meetingUrl: wire.meetingUrl ?? null,
    maxAttendees: wire.maxAttendees ?? null,
    confirmedCount: wire.confirmedCount ?? 0,
    waitlistCount: wire.waitlistCount ?? 0,
    myAttendance: wire.myAttendance?.status ?? null,
    status: wire.status,
  };
}

export function toEventAttendance(wire: Wire): EventAttendance {
  return {
    id: wire.id,
    eventId: wire.eventId,
    profile: { id: wire.profileId, displayName: "Yo" },
    status: wire.status,
    createdAt: wire.createdAt,
  };
}

export function toLiveSession(wire: Wire): LiveSession {
  return {
    id: wire.id,
    clubId: wire.clubId,
    eventId: wire.eventId ?? null,
    title: wire.title,
    scheduledStartAt: wire.scheduledStartAt,
    status: wire.status,
    embedUrl: wire.embedUrl ?? null,
    speakers: (wire.speakers ?? []).map((s: Wire) => ({
      id: s.profileId,
      displayName: s.profile?.displayName ?? "Ponente",
    })),
    chat: (wire.chatMessages ?? []).map((m: Wire) => toLiveChatMessage(m)),
  };
}

export function toLiveChatMessage(wire: Wire): LiveChatMessage {
  return {
    id: wire.id,
    sender: { id: wire.senderProfileId, displayName: "Miembro" },
    body: wire.body,
    sentAt: wire.sentAt,
  };
}

export function toClubAnalytics(wire: Wire): ClubAnalytics {
  return {
    activeMembers: wire.activeMembers ?? 0,
    weeklyGrowth: wire.weeklyGrowth ?? 0,
    engagement: wire.engagement ?? 0,
    retention: wire.retention ?? 0,
    topPosts: (wire.topPosts ?? []).map((p: Wire) => ({
      postId: p.id,
      title: p.body,
      likes: 0,
      comments: 0,
    })),
    eventParticipation: (wire.eventParticipation ?? []).map((e: Wire) => ({
      eventId: e.id,
      title: e.title,
      confirmed: e.confirmedCount ?? 0,
    })),
  };
}

export function toModerationReport(wire: Wire): ModerationReport {
  return {
    id: wire.id,
    clubId: wire.clubId,
    targetType: wire.targetType,
    targetId: wire.targetId,
    targetPreview: "",
    reason: wire.reason,
    details: null,
    createdAt: wire.createdAt,
    reportedBy: { id: wire.reporterProfileId, displayName: "Miembro" },
    status: "PENDIENTE",
    resolution: null,
  };
}

export function toClubNotification(wire: Wire): ClubNotification {
  return {
    id: wire.id,
    clubId: wire.clubId,
    type: wire.type,
    payload: wire.payload ?? "",
    readAt: wire.readAt ?? null,
    createdAt: wire.createdAt,
  };
}

export function toClubInvitation(wire: Wire): ClubInvitation {
  return {
    id: wire.id,
    clubId: wire.clubId,
    token: wire.token,
    profile: null,
    expiresAt: wire.expiresAt,
    usedAt: wire.usedAt ?? null,
  };
}

/**
 * Busca perfiles de la plataforma (listado de usuarios para selectores).
 * Requiere permiso Community.Moderate (el admin ERP lo tiene).
 */
export async function searchProfiles(search: string, take = 20): Promise<{ id: string; displayName: string }[]> {
  const data = await query<{ profiles: Wire[] }>(PROFILES_QUERY, {
    take,
    skip: 0,
    search: search.trim() || null,
  });
  return (data.profiles ?? [])
    .filter((p) => !p.isSystem)
    .map((p) => ({ id: p.id, displayName: p.displayName }));
}

/** Agrega un perfil de la plataforma como miembro del club (rol opcional). */
export async function addClubMember(
  clubId: string,
  profileId: string,
  role: "ADMIN" | "MODERADOR" | "MIEMBRO",
): Promise<{ clubId: string; profileId: string; role: string; status: string }> {
  const data = await mutate<{ addClubMember: Wire }>(ADD_CLUB_MEMBER, { clubId, profileId, role });
  return {
    clubId: data.addClubMember.clubId,
    profileId: data.addClubMember.profileId,
    role: data.addClubMember.role,
    status: data.addClubMember.status,
  };
}

/** Actualiza la portada de un club (clave subida previamente). */
export async function updateClubCover(clubId: string, coverKey: string): Promise<void> {
  await mutate(UPDATE_CLUB, {
    id: clubId,
    input: { coverKey },
  });
}

export { query, mutate };