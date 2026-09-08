// Capa de datos del módulo de Clubes contra el backend REAL (Fase 3).
// Mantiene las firmas del mock del change D2 (los componentes no cambian):
// urql imperativo → gateway → servicio Community, con mapeo wire → contrato D1.
import type {
  Club,
  ClubAnalytics,
  ClubEvent,
  ClubFilter,
  ClubInvitation,
  ClubMember,
  ClubNotification,
  ClubPost,
  EventAttendance,
  LiveChatMessage,
  LiveSession,
  ModerationLogEntry,
  ModerationReport,
} from "../types";
import * as svc from "../services/clubs-service";
import type { Wire } from "../services/clubs-service";

// ─── QUERIES ─────────────────────────────────────────────────────────────

export async function fetchClubs(filter: ClubFilter = {}): Promise<Club[]> {
  const data = await svc.query<{ clubs: Wire[] }>(svc.CLUBS_QUERY, {
    filter: {
      category: filter.category ?? undefined,
      search: filter.search ?? undefined,
      visibility: filter.visibility ?? undefined,
    },
    take: 100,
    skip: 0,
  });
  return (data.clubs ?? []).map(svc.toClub);
}

export async function fetchClub(id: string): Promise<Club> {
  const data = await svc.query<{ club: Wire | null }>(svc.CLUB_QUERY, { id });
  if (!data.club) throw new Error("No se encontró el club.");
  return svc.toClub(data.club);
}

export async function fetchMyClubs(): Promise<Club[]> {
  const data = await svc.query<{ myClubs: Wire[] }>(svc.MY_CLUBS_QUERY);
  return (data.myClubs ?? []).map(svc.toClub);
}

export async function fetchClubMembers(clubId: string, status?: string): Promise<ClubMember[]> {
  const data = await svc.query<{ clubMembers: Wire[] }>(svc.CLUB_MEMBERS_QUERY, {
    clubId,
    status: status ?? undefined,
  });
  return (data.clubMembers ?? []).map(svc.toClubMember);
}

export async function fetchClubRequests(
  clubId: string,
): Promise<{ memberId: string; displayName: string; reason: string }[]> {
  const data = await svc.query<{ clubRequests: Wire[] }>(svc.CLUB_REQUESTS_QUERY, { clubId });
  return (data.clubRequests ?? []).map((m) => ({
    memberId: m.profile?.id ?? m.profileId,
    displayName: m.profile?.displayName ?? "Miembro",
    reason: "Solicitud de ingreso",
  }));
}

export async function fetchClubFeed(clubId: string): Promise<ClubPost[]> {
  const data = await svc.query<{ clubFeed: Wire[] }>(svc.CLUB_FEED_QUERY, { clubId, take: 50, skip: 0 });
  return (data.clubFeed ?? []).map(svc.toClubPost);
}

export async function fetchPublicClubPosts(): Promise<
  (ClubPost & { clubName: string; clubSlug: string })[]
> {
  const data = await svc.query<{ publicClubPosts: Wire[] }>(svc.PUBLIC_CLUB_POSTS_QUERY, { take: 5 });
  return (data.publicClubPosts ?? []).map((p) => ({
    ...svc.toClubPost(p),
    clubName: p.club?.name ?? "Club",
    clubSlug: p.club?.slug ?? "",
  }));
}

export async function fetchAllClubPosts(clubId: string): Promise<ClubPost[]> {
  return fetchClubFeed(clubId);
}

export async function fetchClubEvents(clubId: string): Promise<ClubEvent[]> {
  const data = await svc.query<{ clubEvents: Wire[] }>(svc.CLUB_EVENTS_QUERY, { clubId });
  return (data.clubEvents ?? []).map(svc.toClubEvent);
}

export async function fetchEventAttendees(eventId: string): Promise<EventAttendance[]> {
  // El backend expone los contadores (confirmed/waitlist), no el detalle por
  // perfil; la UI usa los contadores del evento.
  void eventId;
  return [];
}

export async function fetchClubLiveSessions(clubId: string): Promise<LiveSession[]> {
  const data = await svc.query<{ clubLiveSessions: Wire[] }>(svc.CLUB_LIVES_QUERY, { clubId });
  return (data.clubLiveSessions ?? []).map(svc.toLiveSession);
}

export async function fetchClubAnalytics(clubId: string): Promise<ClubAnalytics> {
  const data = await svc.query<{ clubAnalytics: Wire | null }>(svc.CLUB_ANALYTICS_QUERY, { clubId });
  if (!data.clubAnalytics) throw new Error("No hay analítica para el club.");
  return svc.toClubAnalytics(data.clubAnalytics);
}

export async function fetchClubReports(clubId: string): Promise<ModerationReport[]> {
  const data = await svc.query<{ clubReports: Wire[] }>(svc.CLUB_REPORTS_QUERY, { clubId });
  return (data.clubReports ?? []).map(svc.toModerationReport);
}

export async function fetchModerationLog(clubId: string): Promise<ModerationLogEntry[]> {
  // El backend registra las acciones en community.moderation_logs; el detalle
  // se mostrará desde el ERP cuando se exponga la query (futuro).
  void clubId;
  return [];
}

export async function fetchNotifications(): Promise<ClubNotification[]> {
  const data = await svc.query<{ clubNotifications: Wire[] }>(svc.CLUB_NOTIFICATIONS_QUERY, { take: 50 });
  return (data.clubNotifications ?? []).map(svc.toClubNotification);
}

// ─── MUTATIONS ──────────────────────────────────────────────────────────

export async function createClub(input: {
  name: string;
  slug?: string;
  description: string;
  category: string;
  tags: string[];
  visibility: Club["visibility"];
  maxMembers: number | null;
  rules: string[];
  objectives: string[];
  coverKey?: string | null;
}): Promise<Club> {
  const data = await svc.mutate<{ createClub: { id: string } }>(svc.CREATE_CLUB, {
    input: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      category: input.category,
      tags: input.tags,
      visibility: input.visibility,
      maxMembers: input.maxMembers,
      rules: input.rules,
      objectives: input.objectives,
      coverKey: input.coverKey ?? null,
    },
  });
  return fetchClub(data.createClub.id);
}

export async function updateClub(id: string, input: Partial<Club>): Promise<Club> {
  await svc.mutate(svc.UPDATE_CLUB, {
    id,
    input: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      category: input.category,
      tags: input.tags,
      visibility: input.visibility,
      maxMembers: input.maxMembers,
      rules: input.rules,
      objectives: input.objectives,
    },
  });
  return fetchClub(id);
}

export async function archiveClub(id: string): Promise<Club> {
  await svc.mutate(svc.ARCHIVE_CLUB, { id });
  return fetchClub(id);
}

export async function restoreClub(id: string): Promise<Club> {
  await svc.mutate(svc.UNARCHIVE_CLUB, { id });
  return fetchClub(id);
}

export async function joinClubDirect(clubId: string): Promise<Club> {
  await svc.mutate(svc.JOIN_CLUB_DIRECT, { clubId });
  return fetchClub(clubId);
}

export async function joinWithInvitation(clubId: string): Promise<Club> {
  // El backend valida la invitación por token (enlace/QR), no por clubId.
  // La UI del ERP no invoca esta función; el flujo real usa el enlace
  // /community/clubs/join?token=...
  void clubId;
  throw new Error("Únete desde el enlace de invitación (token).");
}

export async function requestMembership(clubId: string): Promise<boolean> {
  await svc.mutate(svc.REQUEST_MEMBERSHIP, { clubId });
  return true;
}

export async function leaveClub(clubId: string): Promise<boolean> {
  await svc.mutate(svc.LEAVE_CLUB, { clubId });
  return true;
}

export async function toggleClubPostLike(clubId: string, postId: string): Promise<ClubPost> {
  void clubId;
  await svc.mutate(svc.TOGGLE_CLUB_POST_LIKE, { postId });
  return (await fetchClubFeed(clubId)).find((p) => p.id === postId)
    ?? (await fetchAllClubPosts(clubId))[0];
}

export async function addClubComment(clubId: string, postId: string, body: string): Promise<ClubPost> {
  await svc.mutate(svc.ADD_CLUB_COMMENT, { postId, body });
  const feed = await fetchClubFeed(clubId);
  return feed.find((p) => p.id === postId) ?? feed[0];
}

export async function voteClubPoll(clubId: string, pollOptionId: string): Promise<ClubPost> {
  const feed = await fetchClubFeed(clubId);
  const post = feed.find((p) => p.poll?.options.some((o) => o.id === pollOptionId));
  if (!post) throw new Error("No se encontró la encuesta.");
  await svc.mutate(svc.VOTE_CLUB_POLL, { postId: post.id, optionId: pollOptionId });
  return post;
}

export async function approveMembership(
  clubId: string,
  profileId: string,
  role: ClubMember["role"] = "MIEMBRO",
): Promise<ClubMember> {
  await svc.mutate(svc.APPROVE_MEMBERSHIP, { clubId, profileId });
  if (role !== "MIEMBRO") {
    await svc.mutate(svc.CHANGE_MEMBER_ROLE, { clubId, profileId, role });
  }
  const members = await fetchClubMembers(clubId);
  return members.find((m) => m.profile.id === profileId) ?? members[0];
}

export async function rejectMembership(clubId: string, profileId: string): Promise<boolean> {
  await svc.mutate(svc.REJECT_MEMBERSHIP, { clubId, profileId });
  return true;
}

export async function expelMember(clubId: string, profileId: string): Promise<boolean> {
  await svc.mutate(svc.EXPEL_MEMBER, { clubId, profileId });
  return true;
}

export async function muteMember(clubId: string, profileId: string, until: string): Promise<ClubMember> {
  const data = await svc.mutate<{ muteMember: Wire }>(svc.MUTE_MEMBER, { clubId, profileId, until });
  return svc.toClubMember(data.muteMember);
}

export async function unmuteMember(clubId: string, profileId: string): Promise<ClubMember> {
  const data = await svc.mutate<{ unmuteMember: Wire }>(svc.UNMUTE_MEMBER, { clubId, profileId });
  return svc.toClubMember(data.unmuteMember);
}

export async function changeMemberRole(
  clubId: string,
  profileId: string,
  role: ClubMember["role"],
): Promise<ClubMember> {
  const data = await svc.mutate<{ changeMemberRole: Wire }>(svc.CHANGE_MEMBER_ROLE, {
    clubId,
    profileId,
    role,
  });
  return svc.toClubMember(data.changeMemberRole);
}

export async function createClubPost(
  clubId: string,
  input: {
    body: string;
    type: ClubPost["type"];
    visibility: ClubPost["visibility"];
    pinned?: boolean;
    featured?: boolean;
    scheduledFor?: string | null;
    draft?: boolean;
    poll?: { question: string; options: string[] };
  },
): Promise<ClubPost> {
  void input.type;
  void input.draft;
  void input.poll;
  const data = await svc.mutate<{ createClubPost: { id: string } }>(svc.CREATE_CLUB_POST, {
    clubId,
    input: {
      body: input.body,
      visibility: input.visibility,
      pinned: input.pinned ?? false,
      featured: input.featured ?? false,
      scheduledFor: input.scheduledFor ?? null,
    },
  });
  const feed = await fetchClubFeed(clubId);
  return feed.find((p) => p.id === data.createClubPost.id) ?? feed[0];
}

export async function updateClubPost(id: string, input: Partial<ClubPost>): Promise<ClubPost> {
  const clubId = input.clubId!;
  await svc.mutate(svc.UPDATE_CLUB_POST, {
    id,
    input: { body: input.body, visibility: input.visibility },
  });
  return (await fetchClubFeed(clubId)).find((p) => p.id === id)
    ?? (await fetchAllClubPosts(clubId))[0];
}

export async function publishScheduledPost(id: string): Promise<ClubPost> {
  await svc.mutate(svc.PUBLISH_SCHEDULED_POST, { id });
  const me = await fetchMyClubs();
  for (const club of me) {
    const found = (await fetchClubFeed(club.id)).find((p) => p.id === id);
    if (found) return found;
  }
  throw new Error("No se encontró la publicación.");
}

export async function deleteClubPost(id: string): Promise<boolean> {
  await svc.mutate(svc.DELETE_CLUB_POST, { id });
  return true;
}

export async function createClubEvent(
  clubId: string,
  input: {
    title: string;
    description: string;
    type: ClubEvent["type"];
    startsAt: string;
    endsAt: string;
    location?: string | null;
    meetingUrl?: string | null;
    maxAttendees: number | null;
  },
): Promise<ClubEvent> {
  const data = await svc.mutate<{ createClubEvent: Wire }>(svc.CREATE_CLUB_EVENT, {
    clubId,
    input: {
      title: input.title,
      description: input.description,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location ?? null,
      meetingUrl: input.meetingUrl ?? null,
      maxAttendees: input.maxAttendees,
    },
  });
  return svc.toClubEvent(data.createClubEvent);
}

export async function confirmAttendance(eventId: string): Promise<EventAttendance> {
  const data = await svc.mutate<{ confirmAttendance: Wire }>(svc.CONFIRM_ATTENDANCE, { eventId });
  return svc.toEventAttendance(data.confirmAttendance);
}

export async function joinWaitlist(eventId: string): Promise<EventAttendance> {
  const data = await svc.mutate<{ joinWaitlist: Wire }>(svc.JOIN_WAITLIST, { eventId });
  return svc.toEventAttendance(data.joinWaitlist);
}

export async function checkIn(eventId: string): Promise<EventAttendance> {
  const data = await svc.mutate<{ checkIn: Wire }>(svc.CHECK_IN, { eventId });
  return svc.toEventAttendance(data.checkIn);
}

export async function scheduleLive(
  clubId: string,
  input: {
    title: string;
    scheduledStartAt: string;
    speakers: string[];
    eventId?: string | null;
    embedUrl?: string | null;
  },
): Promise<LiveSession> {
  const data = await svc.mutate<{ scheduleLive: Wire }>(svc.SCHEDULE_LIVE, {
    clubId,
    input: {
      title: input.title,
      scheduledStartAt: input.scheduledStartAt,
      eventId: input.eventId ?? null,
      speakers: input.speakers,
      embedUrl: input.embedUrl ?? null,
    },
  });
  return svc.toLiveSession(data.scheduleLive);
}

export async function addClubMember(
  clubId: string,
  profileId: string,
  role: ClubMember["role"],
): Promise<ClubMember> {
  const data = await svc.mutate<{ addClubMember: Wire }>(svc.ADD_CLUB_MEMBER, {
    clubId,
    profileId,
    role,
  });
  return svc.toClubMember(data.addClubMember);
}

export async function updateClubCover(clubId: string, coverKey: string): Promise<Club> {
  await svc.updateClubCover(clubId, coverKey);
  return fetchClub(clubId);
}

export async function sendLiveChatMessage(liveId: string, body: string): Promise<LiveChatMessage> {
  const data = await svc.mutate<{ sendLiveChatMessage: Wire }>(svc.SEND_LIVE_CHAT_MESSAGE, {
    liveId,
    body,
  });
  return svc.toLiveChatMessage(data.sendLiveChatMessage);
}

export async function resolveReport(
  reportId: string,
  action: "RESUELTO" | "IGNORADO",
  clubId?: string,
): Promise<boolean> {
  if (!clubId) throw new Error("Se requiere el club del reporte.");
  await svc.mutate(svc.RESOLVE_REPORT, { clubId, reportId, action });
  return true;
}

export async function createInvitation(clubId: string, expiresAt: string): Promise<ClubInvitation> {
  const data = await svc.mutate<{ createInvitation: Wire }>(svc.CREATE_INVITATION, {
    clubId,
    expiresAt,
  });
  return svc.toClubInvitation(data.createInvitation);
}

export async function markNotificationRead(id: string): Promise<boolean> {
  await svc.mutate(svc.MARK_NOTIFICATION_READ, { id });
  return true;
}