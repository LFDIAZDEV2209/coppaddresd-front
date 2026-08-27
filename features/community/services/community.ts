// Operaciones GraphQL y tipos de la comunidad (hand-written, sin codegen).
// Espejo del contrato del servicio CoppAddresd.Community.
import { gql } from "urql";

// --- Enums del backend (espejo de CoppAddresd.Community) ---

export type ProfileRegion =
  | "Miami"
  | "NY"
  | "Barranquilla"
  | "Bogota"
  | "Orlando"
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

export interface Post {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  type: ProfilePostType;
  destination: ProfilePostDestination;
  viewCount: number;
  profile: PostAuthor;
  likes: LikeRef[];
  comments: CommentRef[];
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

export const FEED_QUERY = gql`
  query Feed(
    $take: Int!
    $skip: Int!
    $author: String
    $search: String
    $from: DateTime
    $to: DateTime
  ) {
    feed(
      author: $author
      search: $search
      from: $from
      to: $to
      take: $take
      skip: $skip
    ) {
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
  ) {
    createPost(body: $body, type: $type, destination: $destination) {
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

export const VIEW_POST = gql`
  mutation ViewPost($id: UUID!) {
    viewPost(id: $id) {
      id
      viewCount
    }
  }
`;

export const PIN_POST = gql`
  mutation PinPost($id: UUID!, $pinned: Boolean!) {
    pinPost(id: $id, pinned: $pinned) {
      id
      pinned
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

export interface PinPostResult {
  pinPost: Pick<Post, "id" | "pinned"> | null;
}

export interface ModerateDeletePostResult {
  moderateDeletePost: Pick<Post, "id"> | null;
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
