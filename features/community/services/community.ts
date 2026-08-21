// Operaciones GraphQL y tipos de la comunidad (hand-written, sin codegen).
// Espejo del contrato del servicio CoppAddresd.Community.

export type ProfileStatus = "Active" | "Banned";

export interface CommunityProfile {
  id: string;
  displayName: string;
  bio?: string | null;
  status: ProfileStatus;
  banReason?: string | null;
  bannedAt?: string | null;
  createdAt: string;
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

export interface CommunityPost {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  profile: PostAuthor;
  likes: LikeRef[];
  comments: CommentRef[];
}

export const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      displayName
      bio
      status
      banReason
      bannedAt
      createdAt
    }
  }
`;

export const PROFILES_QUERY = /* GraphQL */ `
  query Profiles($status: ProfileStatus, $take: Int!, $skip: Int!) {
    profiles(status: $status, take: $take, skip: $skip) {
      id
      displayName
      bio
      status
      banReason
      bannedAt
      createdAt
    }
  }
`;

export const FEED_QUERY = /* GraphQL */ `
  query Feed($take: Int!, $skip: Int!) {
    feed(take: $take, skip: $skip) {
      id
      body
      pinned
      createdAt
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

export const BAN_PROFILE = /* GraphQL */ `
  mutation BanProfile($id: UUID!, $reason: String) {
    banProfile(id: $id, reason: $reason) {
      id
      status
      banReason
      bannedAt
    }
  }
`;

export const UNBAN_PROFILE = /* GraphQL */ `
  mutation UnbanProfile($id: UUID!) {
    unbanProfile(id: $id) {
      id
      status
      banReason
      bannedAt
    }
  }
`;

export const PIN_POST = /* GraphQL */ `
  mutation PinPost($id: UUID!, $pinned: Boolean!) {
    pinPost(id: $id, pinned: $pinned) {
      id
      pinned
    }
  }
`;

export const MODERATE_DELETE_POST = /* GraphQL */ `
  mutation ModerateDeletePost($id: UUID!) {
    moderateDeletePost(id: $id) {
      id
      deletedAt
    }
  }
`;

export interface MeResult {
  me: CommunityProfile | null;
}

export interface ProfilesResult {
  profiles: CommunityProfile[];
}

export interface FeedResult {
  feed: CommunityPost[];
}

export interface BanProfileResult {
  banProfile: CommunityProfile | null;
}

export interface UnbanProfileResult {
  unbanProfile: CommunityProfile | null;
}

export interface PinPostResult {
  pinPost: CommunityPost | null;
}

export interface ModerateDeletePostResult {
  moderateDeletePost: CommunityPost | null;
}