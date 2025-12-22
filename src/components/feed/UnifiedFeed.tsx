/**
 * Unified Feed Component
 * Renders posts from the new unified posts table with fallback to legacy data
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { usePosts, PostType } from '@/services/useSocialFeed';
import { usePostsRealtime } from '@/services/useSocialFeedRealtime';
import { PostCard } from './PostCard';
import { UpdateCard } from '@/components/UpdateCard';
import { KudosCard } from '@/components/KudosCard';
import { startOfWeek, startOfMonth, isAfter, parseISO, isSameDay } from 'date-fns';

type DateFilter = 'all' | 'today' | 'week' | 'month';

interface FeedItem {
  id: string;
  type: string;
  content: string;
  created_at: string;
  image_url: string | null;
  employee_id: string;
  access_scope: string | null;
  employee: {
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  mentions?: {
    id: string;
    employee_id: string;
    employee: {
      id: string;
      profiles: {
        full_name: string;
        avatar_url: string | null;
      };
    };
  }[];
}

interface KudosItem {
  id: string;
  comment: string;
  created_at: string;
  batch_id: string | null;
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
  otherRecipients?: { id: string; name: string }[];
}

interface UnifiedFeedProps {
  feedFilter: string;
  dateFilter: DateFilter;
  legacyUpdates: FeedItem[];
  legacyKudos: KudosItem[];
  legacyLoading: boolean;
  onLegacyRefresh: () => void;
}

// Group kudos by batch_id
const groupKudosByBatch = (kudosList: KudosItem[]): KudosItem[] => {
  const batchMap = new Map<string, KudosItem>();
  const result: KudosItem[] = [];

  for (const k of kudosList) {
    if (k.batch_id) {
      if (!batchMap.has(k.batch_id)) {
        batchMap.set(k.batch_id, { ...k, otherRecipients: [] });
        result.push(batchMap.get(k.batch_id)!);
      } else {
        const existing = batchMap.get(k.batch_id)!;
        if (!existing.otherRecipients) existing.otherRecipients = [];
        existing.otherRecipients.push({
          id: k.employee.id,
          name: k.employee.profiles.full_name,
        });
      }
    } else {
      result.push(k);
    }
  }

  return result;
};

export const UnifiedFeed = ({
  feedFilter,
  dateFilter,
  legacyUpdates,
  legacyKudos,
  legacyLoading,
  onLegacyRefresh,
}: UnifiedFeedProps) => {
  // Fetch from new unified posts table
  const postTypeFilter = feedFilter === 'all' ? 'all' : (feedFilter as PostType);
  const { data: posts = [], isLoading: postsLoading } = usePosts(postTypeFilter);
  
  // Subscribe to real-time updates
  usePostsRealtime();

  // Filter by date
  const filterByDate = <T extends { created_at: string }>(items: T[]): T[] => {
    if (dateFilter === 'all') return items;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return items.filter((item) => {
      const itemDate = parseISO(item.created_at);
      
      if (dateFilter === 'today') {
        return isSameDay(itemDate, today);
      }
      if (dateFilter === 'week') {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        return isAfter(itemDate, weekStart);
      }
      if (dateFilter === 'month') {
        const monthStart = startOfMonth(today);
        return isAfter(itemDate, monthStart);
      }
      return true;
    });
  };

  // Filtered posts from new table
  const filteredPosts = useMemo(() => filterByDate(posts), [posts, dateFilter]);

  // Filtered legacy data
  const filteredLegacyUpdates = useMemo(() => filterByDate(legacyUpdates), [legacyUpdates, dateFilter]);
  const filteredLegacyKudos = useMemo(() => filterByDate(legacyKudos), [legacyKudos, dateFilter]);
  const groupedLegacyKudos = useMemo(() => groupKudosByBatch(filteredLegacyKudos), [filteredLegacyKudos]);

  // Filter legacy by type
  const winsAndAchievements = filteredLegacyUpdates.filter(u => u.type === 'win' || u.type === 'achievement');
  const regularUpdates = filteredLegacyUpdates.filter(u => u.type === 'update');

  const isLoading = postsLoading || legacyLoading;

  if (isLoading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading feed...</span>
      </Card>
    );
  }

  // Render new unified posts
  const renderNewPosts = () => {
    if (filteredPosts.length === 0) return null;
    
    return (
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  };

  // Render legacy content based on filter
  const renderLegacyContent = () => {
    // Skip legacy for new post types that don't exist in legacy
    if (feedFilter === 'social' || feedFilter === 'executive_message') {
      return null;
    }

    if (feedFilter === 'all') {
      // Mix of wins, announcements, and kudos
      const combinedLegacy = [
        ...filteredLegacyUpdates.map(u => ({ ...u, _type: 'update' as const })),
        ...groupedLegacyKudos.map(k => ({ ...k, _type: 'kudos' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (combinedLegacy.length === 0) return null;

      return (
        <div className="space-y-4">
          {combinedLegacy.map((item) => {
            if (item._type === 'kudos') {
              const k = item as KudosItem & { _type: 'kudos' };
              return (
                <KudosCard
                  key={k.batch_id || k.id}
                  kudos={{
                    id: k.id,
                    employeeId: k.employee.id,
                    employeeName: k.employee.profiles.full_name,
                    givenBy: k.given_by.profiles.full_name,
                    givenById: k.given_by.id,
                    givenByAvatar: k.given_by.profiles.avatar_url || undefined,
                    comment: k.comment,
                    date: k.created_at,
                    avatar: k.employee.profiles.avatar_url || undefined,
                    batchId: k.batch_id || undefined,
                    otherRecipients: k.otherRecipients?.map(r => r.name),
                    otherRecipientIds: k.otherRecipients?.map(r => r.id),
                  }}
                  onDelete={onLegacyRefresh}
                />
              );
            } else {
              const u = item as FeedItem & { _type: 'update' };
              const uiType = u.type === 'update' ? 'announcement' : (u.type as 'win' | 'achievement');
              return (
                <UpdateCard
                  key={u.id}
                  update={{
                    id: u.id,
                    employeeId: u.employee_id,
                    employeeName: u.employee.profiles.full_name,
                    content: u.content,
                    date: u.created_at,
                    type: uiType,
                    avatar: u.employee.profiles.avatar_url || undefined,
                    imageUrl: u.image_url || undefined,
                  }}
                  onDelete={onLegacyRefresh}
                />
              );
            }
          })}
        </div>
      );
    }

    if (feedFilter === 'win') {
      if (winsAndAchievements.length === 0) return null;
      return (
        <div className="space-y-4">
          {winsAndAchievements.map((update) => (
            <UpdateCard
              key={update.id}
              update={{
                id: update.id,
                employeeId: update.employee_id,
                employeeName: update.employee.profiles.full_name,
                content: update.content,
                date: update.created_at,
                type: update.type as 'win' | 'achievement',
                avatar: update.employee.profiles.avatar_url || undefined,
                imageUrl: update.image_url || undefined,
              }}
              onDelete={onLegacyRefresh}
            />
          ))}
        </div>
      );
    }

    if (feedFilter === 'kudos') {
      if (groupedLegacyKudos.length === 0) return null;
      return (
        <div className="space-y-4">
          {groupedLegacyKudos.map((k) => (
            <KudosCard
              key={k.batch_id || k.id}
              kudos={{
                id: k.id,
                employeeId: k.employee.id,
                employeeName: k.employee.profiles.full_name,
                givenBy: k.given_by.profiles.full_name,
                givenById: k.given_by.id,
                givenByAvatar: k.given_by.profiles.avatar_url || undefined,
                comment: k.comment,
                date: k.created_at,
                avatar: k.employee.profiles.avatar_url || undefined,
                batchId: k.batch_id || undefined,
                otherRecipients: k.otherRecipients?.map(r => r.name),
                otherRecipientIds: k.otherRecipients?.map(r => r.id),
              }}
              onDelete={onLegacyRefresh}
            />
          ))}
        </div>
      );
    }

    if (feedFilter === 'announcement') {
      if (regularUpdates.length === 0) return null;
      return (
        <div className="space-y-4">
          {regularUpdates.map((update) => (
            <UpdateCard
              key={update.id}
              update={{
                id: update.id,
                employeeId: update.employee_id,
                employeeName: update.employee.profiles.full_name,
                content: update.content,
                date: update.created_at,
                type: 'announcement',
                avatar: update.employee.profiles.avatar_url || undefined,
                imageUrl: update.image_url || undefined,
              }}
              onDelete={onLegacyRefresh}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  const hasNewPosts = filteredPosts.length > 0;
  const hasLegacyContent = feedFilter === 'all' 
    ? (filteredLegacyUpdates.length > 0 || groupedLegacyKudos.length > 0)
    : feedFilter === 'win' 
      ? winsAndAchievements.length > 0
      : feedFilter === 'kudos'
        ? groupedLegacyKudos.length > 0
        : feedFilter === 'announcement'
          ? regularUpdates.length > 0
          : false;

  const isEmpty = !hasNewPosts && !hasLegacyContent;

  if (isEmpty) {
    const emptyMessages: Record<string, string> = {
      all: 'No posts yet. Be the first to share!',
      win: 'No wins shared yet!',
      kudos: 'No kudos given yet!',
      social: 'No social posts yet!',
      announcement: 'No announcements yet!',
      executive_message: 'No executive messages yet!',
    };

    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">{emptyMessages[feedFilter] || 'No posts yet.'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* New unified posts first (pinned posts appear at top) */}
      {renderNewPosts()}
      
      {/* Legacy content below */}
      {renderLegacyContent()}
    </div>
  );
};
