// Operaciones GraphQL y tipos de la comunidad (hand-written, sin codegen).
// Espejo del contrato del servicio CoppAddresd.Community.

export type ProfileStatus = "Pending" | "Approved" | "Rejected";

export interface CommunityProfile {
  id: string;
  displayName: string;
  bio?: string | null;
  status: ProfileStatus;
  rejectionReason?: string | null;
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
      rejectionReason
      createdAt
    }
  }
`;

export const PENDING_PROFILES_QUERY = /* GraphQL */ `
  query PendingProfiles {
    pendingProfiles {
      id
      displayName
      bio
      status
      rejectionReason
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

export const APPROVE_PROFILE = /* GraphQL */ `
  mutation ApproveProfile($id: UUID!) {
    approveProfile(id: $id) {
      id
      status
      reviewedAt
    }
  }
`;

export const REJECT_PROFILE = /* GraphQL */ `
  mutation RejectProfile($id: UUID!, $reason: String) {
    rejectProfile(id: $id, reason: $reason) {
      id
      status
      rejectionReason
      reviewedAt
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

export interface PendingProfilesResult {
  pendingProfiles: CommunityProfile[];
}

export interface FeedResult {
  feed: CommunityPost[];
}

export interface ApproveProfileResult {
  approveProfile: CommunityProfile | null;
}

export interface RejectProfileResult {
  rejectProfile: CommunityProfile | null;
}

export interface PinPostResult {
  pinPost: CommunityPost | null;
}

export interface ModerateDeletePostResult {
  moderateDeletePost: CommunityPost | null;
}