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

// --- Tipos de resultados del backend ---

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
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
  posts: number;
  comments: number;
  likes: number;
}

export interface PostAuthor {
  id: string;
  displayName: string;
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

// --- Documentos GraphQL ---

export const ME_QUERY = gql`
  query Me {
    me {
      id
      userId
      displayName
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
      posts
      comments
      likes
    }
  }
`;

export const PROFILES_QUERY = gql`
  query Profiles($take: Int!, $skip: Int!, $search: String) {
    profiles(take: $take, skip: $skip, search: $search) {
      id
      userId
      displayName
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
      posts
      comments
      likes
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
      posts
      comments
      likes
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
