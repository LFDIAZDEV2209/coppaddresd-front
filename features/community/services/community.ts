// Operaciones GraphQL y tipos de la comunidad (hand-written, sin codegen).
// Espejo del contrato del servicio CoppAddresd.Community.
import { gql } from "urql";

// --- Enums del backend (espejo de CoppAddresd.Community) ---

export type ProfileRegion =
  | "Miami"
  | "NY"
  | "Barranquilla"
  | "Orlando"
  | "Houston"
  | "Dallas"
  | "Atlanta"
  | "Seattle"
  | "Denver"
  | "Bogota"
  | "CDMX";

export type ProfileDiagnosis = "DM2" | "Obesidad" | "DM2HTA" | "Prediabetes";

export type ProfilePostType =
  | "Texto"
  | "Imagen"
  | "Video"
  | "Encuesta"
  | "Logro";

export type ProfilePostDestination =
  | "TodasLasComunidades"
  | "ComunidadADRED"
  | "RetoCaminata"
  | "ApoyoEmocional"
  | "CocinaSaludable"
  | "SoloInactivos";

export type ProfileFeedEventKind =
  | "Publicacion"
  | "Foto"
  | "Video"
  | "Comentario"
  | "Grupo"
  | "Racha"
  | "Hito"
  | "Nutriobiotico"
  | "Logro";

export type ProfileRiskLevel = "Alto" | "Medio" | "Bajo";

export type ProfileStatus = "ACTIVE" | "BANNED";

export type MessageScope = "INACTIVE" | "ALL_ACTIVE";

// --- Tipos de resultados del backend ---

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  isSystem?: boolean;
  bio: string | null;
  status: ProfileStatus;
  region: ProfileRegion;
  diagnosis: ProfileDiagnosis;
  week: number;
  lastPostAt: string | null;
  lastActiveAt: string | null;
  currentStreak: number;
  bestStreak: number;
  xpTotal: number;
  levelName: string;
  riskLevel: ProfileRiskLevel;
  postsCount: number;
  commentsCount: number;
  likesCount: number;
  avatarUrl?: string | null;
  /** Publicaciones propias del perfil (cargadas solo en PROFILE_TIMELINE / ME). */
  posts?: Post[];
  /** Reposts armados con el post completo (cargados solo en PROFILE_TIMELINE / ME). */
  reposts?: RepostWithPost[];
}

export interface PostAuthor {
  id: string;
  displayName: string;
  isSystem?: boolean;
}

export interface LikeRef {
  id: string;
  profileId: string;
}

export interface CommentRef {
  id: string;
}

export interface CommentDetail {
  id: string;
  body: string;
  createdAt: string;
  postId: string;
  parentCommentId: string | null;
  profile: PostAuthor;
  likes: LikeRef[];
  replies: CommentDetail[];
}

export interface PollVoteWire {
  id: string;
  profileId: string;
  profile: { id: string; displayName: string; avatarUrl?: string | null } | null;
}

export interface PollOptionWire {
  id: string;
  text: string;
  position: number;
  votes: PollVoteWire[];
}

export interface PollWire {
  id: string;
  options: PollOptionWire[];
}

export interface RepostRef {
  id: string;
  profileId: string;
}

/** Repost armado desde la navegación Profile.reposts (con el post completo). */
export interface RepostWithPost {
  id: string;
  profileId: string;
  postId: string;
  createdAt: string;
  post: Post;
}

export interface Post {
  id: string;
  body: string;
  pinned: boolean;
  pinnedOrder: number;
  createdAt: string;
  type: ProfilePostType;
  destination: ProfilePostDestination;
  viewCount: number;
  imageUrl: string | null;
  mediaType: "IMAGE" | "VIDEO" | null;
  poll: PollWire | null;
  profile: PostAuthor;
  likes: LikeRef[];
  reposts: RepostRef[];
  comments: CommentDetail[];
}

export interface FeedEvent {
  id: string;
  profileId: string;
  kind: ProfileFeedEventKind;
  body: string;
  createdAt: string;
  profile: PostAuthor;
}

// --- Contrato DashboardStats (Milestone-2) ---

export interface DashboardKpiTrends {
  activeMembers: number;
  postsThisMonth: number;
  participationRate: number;
  inactiveOver7Days: number;
}

export interface ActivityDay {
  dia: number;
  posts: number;
  comentarios: number;
  reacciones: number;
}

export interface PostTypeCount {
  type: string;
  count: number;
}

export interface PeakHour {
  hora: number;
  count: number;
}

export interface DiagnosisParticipationEntry {
  diagnosis: ProfileDiagnosis;
  participation: number;
}

export interface DashboardStats {
  activeMembers: number;
  postsThisMonth: number;
  participationRate: number;
  inactiveOver7Days: number;
  inactiveAtRisk: number;
  kpiTrends: DashboardKpiTrends;
  activitySeries: ActivityDay[];
  postTypes: PostTypeCount[];
  peakHours: PeakHour[];
  diagnosisParticipation: DiagnosisParticipationEntry[];
}

// --- Documentos GraphQL ---

export const ME_QUERY = gql`
  query Me {
    me {
      id
      userId
      displayName
      isSystem
      bio
      status
      region
      diagnosis
      week
      lastPostAt
      lastActiveAt
      currentStreak
      bestStreak
      xpTotal
      levelName
      riskLevel
      postsCount
      commentsCount
      likesCount
      posts {
        id
        body
        pinned
        pinnedOrder
        createdAt
        type
        destination
        viewCount
        imageUrl
        mediaType
        profile {
          id
          displayName
          isSystem
        }
        likes {
          id
          profileId
        }
        reposts {
          id
          profileId
        }
        comments {
          id
          body
          createdAt
          postId
          parentCommentId
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          replies {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
          }
        }
      }
      reposts {
        id
        profileId
        postId
        createdAt
        post {
          id
          body
          pinned
          pinnedOrder
          createdAt
          type
          destination
          viewCount
          imageUrl
          mediaType
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          reposts {
            id
            profileId
          }
          comments {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
            replies {
              id
              body
              createdAt
              postId
              parentCommentId
              profile {
                id
                displayName
                isSystem
              }
              likes {
                id
                profileId
              }
            }
          }
        }
      }
    }
  }
`;

export const PROFILES_QUERY = gql`
  query Profiles($take: Int!, $skip: Int!, $search: String) {
    profiles(take: $take, skip: $skip, search: $search) {
      id
      userId
      displayName
      isSystem
      bio
      status
      region
      diagnosis
      week
      lastPostAt
      lastActiveAt
      currentStreak
      bestStreak
      xpTotal
      levelName
      riskLevel
      postsCount
      commentsCount
      likesCount
    }
  }
`;

/** Timeline completo de un perfil: propias + reposts armados. */
export const PROFILE_TIMELINE = gql`
  query ProfileTimeline($id: UUID!) {
    profile(id: $id) {
      id
      userId
      displayName
      isSystem
      bio
      status
      region
      diagnosis
      week
      lastPostAt
      lastActiveAt
      currentStreak
      bestStreak
      xpTotal
      levelName
      riskLevel
      postsCount
      commentsCount
      likesCount
      posts {
        id
        body
        pinned
        pinnedOrder
        createdAt
        type
        destination
        viewCount
        imageUrl
        mediaType
        profile {
          id
          displayName
          isSystem
        }
        likes {
          id
          profileId
        }
        reposts {
          id
          profileId
        }
        comments {
          id
          body
          createdAt
          postId
          parentCommentId
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          replies {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
          }
        }
      }
      reposts {
        id
        profileId
        postId
        createdAt
        post {
          id
          body
          pinned
          pinnedOrder
          createdAt
          type
          destination
          viewCount
          imageUrl
          mediaType
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          reposts {
            id
            profileId
          }
          comments {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
            replies {
              id
              body
              createdAt
              postId
              parentCommentId
              profile {
                id
                displayName
                isSystem
              }
              likes {
                id
                profileId
              }
            }
          }
        }
      }
    }
  }
`;

export interface ProfileTimelineResult {
  profile: Profile | null;
}

export const FEED_QUERY = gql`
  query Feed(
    $take: Int!
    $skip: Int!
    $author: String
    $search: String
    $sortBy: String
    $from: DateTime
    $to: DateTime
  ) {
    feed(
      author: $author
      search: $search
      sortBy: $sortBy
      from: $from
      to: $to
      take: $take
      skip: $skip
    ) {
      id
      body
      pinned
      pinnedOrder
      createdAt
      type
      destination
      viewCount
      imageUrl
      mediaType
      poll {
        id
        options {
          id
          text
          position
          votes {
            id
            profileId
            profile {
              id
              displayName
              avatarUrl
            }
          }
        }
      }
      profile {
        id
        displayName
        isSystem
      }
      likes {
        id
        profileId
      }
      reposts {
        id
        profileId
      }
      comments {
        id
        body
        createdAt
        postId
        parentCommentId
        profile {
          id
          displayName
          isSystem
        }
        likes {
          id
          profileId
        }
        replies {
          id
          body
          createdAt
          postId
          parentCommentId
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          replies {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
          }
        }
      }
    }
  }
`;

export const FEED_EVENTS_QUERY = gql`
  query FeedEvents($take: Int!, $skip: Int!) {
    feedEvents(take: $take, skip: $skip) {
      id
      profileId
      kind
      body
      createdAt
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export const TOP_STREAKS_QUERY = gql`
  query TopStreaks($take: Int!) {
    topStreaks(take: $take) {
      id
      userId
      displayName
      isSystem
      bio
      status
      region
      diagnosis
      week
      lastPostAt
      lastActiveAt
      currentStreak
      bestStreak
      xpTotal
      levelName
      riskLevel
      postsCount
      commentsCount
      likesCount
    }
  }
`;

export const CREATE_POST = gql`
  mutation CreatePost(
    $body: String!
    $type: PostType!
    $destination: PostDestination!
    $pinned: Boolean!
  ) {
    createPost(body: $body, type: $type, destination: $destination, pinned: $pinned) {
      id
      body
      pinned
      createdAt
      type
      destination
      viewCount
      profile {
        id
        displayName
      }
      likes {
        id
        profileId
      }
      comments {
        id
      }
    }
  }
`;

export const CREATE_ANNOUNCEMENT = gql`
  mutation CreateAnnouncement(
    $body: String!
    $type: PostType!
    $destination: PostDestination!
    $pinned: Boolean!
  ) {
    createAnnouncement(body: $body, type: $type, destination: $destination, pinned: $pinned) {
      id
      body
      pinned
      createdAt
      type
      destination
      viewCount
      profile {
        id
        displayName
        isSystem
      }
      likes {
        id
        profileId
      }
      comments {
        id
      }
    }
  }
`;

export const VIEW_POST = gql`
  mutation ViewPost($id: UUID!) {
    viewPost(id: $id) {
      id
      viewCount
    }
  }
`;

export interface ViewPostResult {
  viewPost: {
    id: string;
    viewCount: number;
  };
}

export const SEND_GROUP_MESSAGE = gql`
  mutation SendGroupMessage($groupId: UUID!, $body: String!) {
    sendGroupMessage(groupId: $groupId, body: $body) {
      id
      body
      createdAt
    }
  }
`;

export interface SendGroupMessageResult {
  sendGroupMessage: {
    id: string;
    body: string;
    createdAt: string;
  };
}

export const PIN_POST = gql`
  mutation PinPost($id: UUID!, $pinned: Boolean!) {
    pinPost(id: $id, pinned: $pinned) {
      id
      pinned
    }
  }
`;

export const VOTE_POLL = gql`
  mutation VotePoll($optionId: UUID!) {
    votePoll(optionId: $optionId) {
      id
      poll {
        id
        options {
          id
          text
          position
          votes {
            id
            profileId
          }
        }
      }
    }
  }
`;

export const MODERATE_DELETE_POST = gql`
  mutation ModerateDeletePost($id: UUID!) {
    moderateDeletePost(id: $id) {
      id
    }
  }
`;

export const AWARD_XP = gql`
  mutation AwardXp($profileId: UUID!, $amount: Int!, $reason: String) {
    awardXp(profileId: $profileId, amount: $amount, reason: $reason) {
      id
      xpTotal
    }
  }
`;

export const AWARD_XP_ALL = gql`
  mutation AwardXpToAll($amount: Int!, $reason: String) {
    awardXpToAll(amount: $amount, reason: $reason) {
      id
      xpTotal
    }
  }
`;

export const SEND_BULK_MESSAGE = gql`
  mutation SendBulkMessage($scope: MessageScope!, $body: String!) {
    sendBulkMessage(scope: $scope, body: $body)
  }
`;

export const SEND_DIRECT_MESSAGE = gql`
  mutation SendDirectMessage($profileId: UUID!, $body: String!) {
    sendDirectMessage(profileId: $profileId, body: $body) {
      id
      body
      createdAt
    }
  }
`;

export const FEED_EVENT_ADDED_SUB = gql`
  subscription FeedEventAdded {
    feedEventAdded {
      id
      profileId
      kind
      body
      createdAt
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export interface FeedEventAddedResult {
  feedEventAdded: FeedEvent;
}

export const ADD_COMMENT = gql`
  mutation AddComment($postId: UUID!, $body: String!) {
    addComment(postId: $postId, body: $body) {
      id
      body
      createdAt
      postId
      parentCommentId
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export const REPLY_TO_COMMENT = gql`
  mutation ReplyToComment($commentId: UUID!, $body: String!) {
    replyToComment(commentId: $commentId, body: $body) {
      id
      body
      createdAt
      postId
      parentCommentId
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export const COMMENT_ADDED_SUB = gql`
  subscription CommentAdded {
    commentAdded {
      id
      body
      createdAt
      postId
      parentCommentId
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export interface AddCommentResult {
  addComment: CommentDetail;
}

export interface ReplyToCommentResult {
  replyToComment: CommentDetail;
}

export interface CommentAddedResult {
  commentAdded: CommentDetail;
}

// --- Tipos de resultado ---

export interface MeResult {
  me: Profile | null;
}

export interface ProfilesResult {
  profiles: Profile[];
}

export interface FeedResult {
  feed: Post[];
}

export interface FeedEventsResult {
  feedEvents: FeedEvent[];
}

export interface TopStreaksResult {
  topStreaks: Profile[];
}

export interface CreatePostResult {
  createPost: Post | null;
}

export interface CreateAnnouncementResult {
  createAnnouncement: Post | null;
}

export interface PinPostResult {
  pinPost: Pick<Post, "id" | "pinned"> | null;
}

export interface VotePollResult {
  votePoll: Pick<Post, "id" | "poll"> | null;
}

export interface ModerateDeletePostResult {
  moderateDeletePost: Pick<Post, "id"> | null;
}

export const REORDER_PINNED_POSTS = gql`
  mutation ReorderPinnedPosts($orderedIds: [UUID!]!) {
    reorderPinnedPosts(orderedIds: $orderedIds) {
      id
      pinned
      pinnedOrder
    }
  }
`;

export interface ReorderPinnedPostsResult {
  reorderPinnedPosts: Pick<Post, "id" | "pinned"> & { pinnedOrder: number }[];
}

// --- Consulta de publicación individual ---

export const POST_QUERY = gql`
  query Post($id: UUID!) {
    post(id: $id) {
      id
      body
      type
      destination
      viewCount
      pinned
      pinnedOrder
      createdAt
      imageUrl
      mediaType
      poll {
        id
        options {
          id
          text
          position
          votes {
            id
            profileId
            profile {
              id
              displayName
              avatarUrl
            }
          }
        }
      }
      profile {
        id
        displayName
        isSystem
      }
      likes {
        id
        profileId
      }
      reposts {
        id
        profileId
      }
      comments {
        id
        body
        createdAt
        postId
        parentCommentId
        profile {
          id
          displayName
          isSystem
        }
        likes {
          id
          profileId
        }
        replies {
          id
          body
          createdAt
          postId
          parentCommentId
          profile {
            id
            displayName
            isSystem
          }
          likes {
            id
            profileId
          }
          replies {
            id
            body
            createdAt
            postId
            parentCommentId
            profile {
              id
              displayName
              isSystem
            }
            likes {
              id
              profileId
            }
          }
        }
      }
    }
  }
`;

export interface PostQueryResult {
  post: Post | null;
}

// --- Eliminación de comentarios ---

export const MODERATE_DELETE_COMMENT = gql`
  mutation ModerateDeleteComment($commentId: UUID!) {
    moderateDeleteComment(commentId: $commentId) {
      id
    }
  }
`;

export interface ModerateDeleteCommentResult {
  moderateDeleteComment: { id: string } | null;
}

export const BAN_PROFILE = gql`
  mutation BanProfile($id: UUID!, $reason: String) {
    banProfile(id: $id, reason: $reason) {
      id
    }
  }
`;

export const UNBAN_PROFILE = gql`
  mutation UnbanProfile($id: UUID!) {
    unbanProfile(id: $id) {
      id
    }
  }
`;

export interface BanProfileResult {
  banProfile: { id: string } | null;
}
export interface UnbanProfileResult {
  unbanProfile: { id: string } | null;
}

// --- Reportes de publicaciones ---

export const REPORT_POST = gql`
  mutation ReportPost($postId: UUID!, $reason: String!, $details: String) {
    reportPost(postId: $postId, reason: $reason, details: $details) {
      id
    }
  }
`;

export interface ReportPostResult {
  reportPost: { id: string } | null;
}

export const REPORTED_POSTS = gql`
  query ReportedPosts($take: Int, $skip: Int) {
    reportedPosts(take: $take, skip: $skip) {
      post {
        id
        body
        type
        destination
        pinned
        createdAt
        viewCount
        profile {
          id
          displayName
          isSystem
        }
        likes {
          id
          profileId
        }
        comments {
          id
          body
          createdAt
          postId
          parentCommentId
          profile {
            id
            displayName
            isSystem
          }
        }
      }
      reportCount
      reports {
        id
        reason
        details
        createdAt
        reportedBy {
          id
          displayName
        }
      }
    }
  }
`;

export interface ReportWire {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reportedBy: { id: string; displayName: string };
}

export interface ReportedPostWire {
  post: Post;
  reportCount: number;
  reports: ReportWire[];
}

export interface ReportedPostsResult {
  reportedPosts: ReportedPostWire[];
}

export const RESOLVE_REPORT = gql`
  mutation ResolveReport($reportId: UUID!) {
    resolveReport(reportId: $reportId) {
      id
    }
  }
`;

export interface ResolveReportResult {
  resolveReport: { id: string } | null;
}

export interface AwardXpResult {
  awardXp: Profile[] | null;
}

export interface AwardXpAllResult {
  awardXpToAll: Profile[] | null;
}

export interface SendBulkMessageResult {
  sendBulkMessage: number;
}

export interface SendDirectMessageResult {
  sendDirectMessage: { id: string; body: string; createdAt: string };
}

// --- Documento dashboardStats ---

export const DASHBOARD_STATS_QUERY = gql`
  query DashboardStats {
    dashboardStats {
      activeMembers
      postsThisMonth
      participationRate
      inactiveOver7Days
      inactiveAtRisk
      kpiTrends {
        activeMembers
        postsThisMonth
        participationRate
        inactiveOver7Days
      }
      activitySeries {
        dia
        posts
        comentarios
        reacciones
      }
      postTypes {
        type
        count
      }
      peakHours {
        hora
        count
      }
      diagnosisParticipation {
        diagnosis
        participation
      }
    }
  }
`;

export interface DashboardStatsResult {
  dashboardStats: DashboardStats;
}

// --- Community Analytics (Milestone-3) ---

export const COMMUNITY_ANALYTICS_QUERY = gql`
  query CommunityAnalytics {
    communityAnalytics {
      feedToday {
        posts
        comments
        reactions
        newMembers
        streaksBroken
        xpDelivered
      }
      streakOverview {
        longestStreak
        longestProfileId
        longestProfileName
        membersOverSevenDays
        milestonesThisMonth
        streaksBroken
        distribution {
          range
          value
        }
      }
      inactivityDistribution {
        range
        value
      }
      xpDeliveredSeries {
        label
        rachas
        posts
        erp
      }
    }
  }
`;

export interface FeedTodayData {
  posts: number;
  comments: number;
  reactions: number;
  newMembers: number;
  streaksBroken: number;
  xpDelivered: number;
}

export interface DistributionBucket {
  range: string;
  value: number;
}

export interface StreakOverviewData {
  longestStreak: number;
  longestProfileId: string;
  longestProfileName: string;
  membersOverSevenDays: number;
  milestonesThisMonth: number;
  streaksBroken: number;
  distribution: DistributionBucket[];
}

export interface XpDeliveredSeriesPoint {
  label: string;
  rachas: number;
  posts: number;
  erp: number;
}

export interface CommunityAnalytics {
  feedToday: FeedTodayData;
  streakOverview: StreakOverviewData;
  inactivityDistribution: DistributionBucket[];
  xpDeliveredSeries: XpDeliveredSeriesPoint[];
}

export interface CommunityAnalyticsResult {
  communityAnalytics: CommunityAnalytics;
}

// --- Region Stats ---

export const REGION_STATS_QUERY = gql`
  query RegionStats {
    regionStats {
      region
      members
      postsPerWeek
    }
  }
`;

export interface RegionStatWire {
  region: string;
  members: number;
  postsPerWeek: number;
}

export interface RegionStatsResult {
  regionStats: RegionStatWire[];
}

// --- Diagnostic Stats ---

export const DIAGNOSTIC_STATS_QUERY = gql`
  query DiagnosticStats {
    diagnosticStats {
      diagnosis
      members
      postsPerWeek
      avgStreak
      avgXp
      adherence
    }
  }
`;

export interface DiagnosticStatWire {
  diagnosis: string;
  members: number;
  postsPerWeek: number;
  avgStreak: number;
  avgXp: number;
  adherence: number;
}

export interface DiagnosticStatsResult {
  diagnosticStats: DiagnosticStatWire[];
}

// --- Recognitions ---

export const RECOGNITIONS_QUERY = gql`
  query Recognitions($take: Int, $skip: Int) {
    recognitions(take: $take, skip: $skip) {
      id
      profileId
      typeLabel
      xp
      status
      createdAt
      profile {
        id
        displayName
        isSystem
      }
    }
  }
`;

export interface RecognitionWire {
  id: string;
  profileId: string;
  typeLabel: string;
  xp: number;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    displayName: string;
    isSystem?: boolean;
  };
}

export interface RecognitionsResult {
  recognitions: RecognitionWire[];
}

// --- Networks ---

export const NETWORKS_QUERY = gql`
  query Networks {
    networks {
      name
      handle
      color
      followers
      sortOrder
      growthPoints {
        month
        value
      }
    }
  }
`;

export interface NetworkChannelWire {
  name: string;
  handle: string;
  color: string;
  followers: number;
  sortOrder: number;
  growthPoints: { month: string; value: number }[];
}

export interface NetworksResult {
  networks: NetworkChannelWire[];
}

// --- Community Groups ---

export const COMMUNITY_GROUPS_QUERY = gql`
  query CommunityGroups($take: Int, $skip: Int) {
    communityGroups(take: $take, skip: $skip) {
      id
      name
      memberCount
      messageCount
      lastActivityAt
    }
  }
`;

export interface CommunityGroupWire {
  id: string;
  name: string;
  memberCount: number;
  messageCount: number;
  lastActivityAt: string;
}

export interface CommunityGroupsResult {
  communityGroups: CommunityGroupWire[];
}

// --- Message Reach ---

export const MESSAGE_REACH_QUERY = gql`
  query MessageReach {
    messageReach {
      scope
      total
      reached
    }
  }
`;

export interface MessageReachWire {
  scope: string;
  total: number;
  reached: number;
}

export interface MessageReachResult {
  messageReach: MessageReachWire[];
}

// --- Comment Likes ---

export const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: UUID!) {
    likeComment(commentId: $commentId) {
      id
      likes {
        id
        profileId
      }
    }
  }
`;

export interface LikeCommentResult {
  likeComment: { id: string; likes: LikeRef[] } | null;
}

export const UNLIKE_COMMENT = gql`
  mutation UnlikeComment($commentId: UUID!) {
    unlikeComment(commentId: $commentId) {
      id
      likes {
        id
        profileId
      }
    }
  }
`;

export interface UnlikeCommentResult {
  unlikeComment: { id: string; likes: LikeRef[] } | null;
}

// --- Comment Reports ---

export const REPORT_COMMENT = gql`
  mutation ReportComment($commentId: UUID!, $reason: String!, $details: String) {
    reportComment(commentId: $commentId, reason: $reason, details: $details) {
      id
    }
  }
`;

export interface ReportCommentResult {
  reportComment: { id: string } | null;
}

// --- Reposts ---

export const REPOST_POST = gql`
  mutation RepostPost($postId: UUID!) {
    repostPost(postId: $postId) {
      id
      reposts {
        id
        profileId
      }
    }
  }
`;

export interface RepostPostResult {
  repostPost: Pick<Post, "id"> & { reposts: RepostRef[] } | null;
}

export const UNREPOST_POST = gql`
  mutation UnrepostPost($postId: UUID!) {
    unrepostPost(postId: $postId) {
      id
      reposts {
        id
        profileId
      }
    }
  }
`;

export interface UnrepostPostResult {
  unrepostPost: Pick<Post, "id"> & { reposts: RepostRef[] } | null;
}

export const POST_REPOSTS = gql`
  query PostReposts($postId: UUID!, $take: Int!, $skip: Int!) {
    postReposts(postId: $postId, take: $take, skip: $skip) {
      id
      displayName
      avatarUrl
      region
      status
    }
  }
`;

export interface PostRepostsResult {
  postReposts: Profile[];
}

export const REPORTED_COMMENTS = gql`
  query ReportedComments($take: Int, $skip: Int) {
    reportedComments(take: $take, skip: $skip) {
      commentId
      comment {
        id
        body
        createdAt
        profile {
          id
          displayName
          avatarUrl
        }
      }
      post {
        id
        body
      }
      reportCount
      reports {
        id
        reason
        details
        createdAt
        reportedBy {
          id
          displayName
        }
      }
    }
  }
`;

export interface CommentReportWire {
  id: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reportedBy: { id: string; displayName: string };
}

export interface ReportedCommentWire {
  commentId: string;
  comment: {
    id: string;
    body: string;
    createdAt: string;
    profile: { id: string; displayName: string; avatarUrl?: string | null };
  };
  post: { id: string; body: string };
  reportCount: number;
  reports: CommentReportWire[];
}

export interface ReportedCommentsResult {
  reportedComments: ReportedCommentWire[];
}

export const RESOLVE_COMMENT_REPORT = gql`
  mutation ResolveCommentReport($reportId: UUID!) {
    resolveCommentReport(reportId: $reportId)
  }
`;

export interface ResolveCommentReportResult {
  resolveCommentReport: boolean;
}

// --- Profiles Search ---

export const PROFILES_SEARCH_QUERY = gql`
  query ProfilesSearch($search: String, $take: Int, $skip: Int) {
    profiles(search: $search, take: $take, skip: $skip) {
      id
      userId
      displayName
      isSystem
      status
      region
      diagnosis
      avatarUrl
    }
  }
`;

export interface ProfileSearchResult {
  id: string;
  displayName: string;
  isSystem?: boolean;
  status: string;
  region: string;
  diagnosis: string;
  avatarUrl?: string | null;
}

export interface ProfilesSearchResult {
  profiles: ProfileSearchResult[];
}
