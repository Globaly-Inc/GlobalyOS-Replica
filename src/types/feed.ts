/**
 * Social feed type definitions (updates, kudos, reactions)
 * 
 * @deprecated This file contains legacy type definitions for the old social feed system
 * (updates and kudos tables). The new unified system uses the 'posts' table.
 * See src/services/useSocialFeed.ts for the new Post, PostType, and CreatePostInput types.
 * These types are kept for backwards compatibility with existing notifications and may be removed in future.
 */

/**
 * @deprecated Use Post from src/services/useSocialFeed.ts instead
 */
export interface FeedUpdate {
  id: string;
  employee_id: string;
  organization_id: string;
  type: UpdateType;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use PostType from src/services/useSocialFeed.ts instead */
export type UpdateType = 'win' | 'update' | 'achievement';

// UI maps 'update' to 'announcement' for display
export type DisplayUpdateType = 'win' | 'announcement' | 'achievement';

export interface FeedUpdateWithRelations extends FeedUpdate {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  mentions?: UpdateMention[];
  reactions?: FeedReaction[];
}

export interface UpdateMention {
  id: string;
  update_id: string;
  employee_id: string;
  organization_id: string;
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface Kudos {
  id: string;
  employee_id: string;
  given_by_id: string;
  organization_id: string;
  comment: string;
  batch_id: string | null;
  created_at: string;
}

export interface KudosWithRelations extends Kudos {
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  given_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  reactions?: FeedReaction[];
}

export interface FeedReaction {
  id: string;
  target_id: string;
  target_type: 'update' | 'kudos';
  employee_id: string;
  organization_id: string;
  emoji: string;
  created_at: string;
  employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export type ReactionEmoji = '👍' | '❤️' | '🎉' | '👏' | '🔥' | '💯';

// Combined feed item for display
export interface FeedItem {
  id: string;
  type: 'update' | 'kudos';
  created_at: string;
  data: FeedUpdateWithRelations | KudosWithRelations;
}
