/**
 * Unified Feed Component
 * Renders posts from the unified posts table
 */

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { usePosts, PostType, Post } from '@/services/useSocialFeed';
import { useFeedRealtime } from '@/services/useSocialFeedRealtime';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { startOfWeek, startOfMonth, isAfter, parseISO, isSameDay } from 'date-fns';

type DateFilter = 'all' | 'today' | 'week' | 'month';

interface UnifiedFeedProps {
  feedFilter: string;
  dateFilter: DateFilter;
}

export const UnifiedFeed = ({
  feedFilter,
  dateFilter,
}: UnifiedFeedProps) => {
  // Fetch from unified posts table
  const postTypeFilter = feedFilter === 'all' ? 'all' : (feedFilter as PostType);
  const { data: posts = [], isLoading } = usePosts(postTypeFilter);
  
  // Subscribe to real-time updates for posts, comments, and reactions
  useFeedRealtime();
  
  // Edit post state
  const [editingPost, setEditingPost] = useState<Post | null>(null);

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

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    const dateFiltered = filterByDate(posts);
    
    // Sort: unacknowledged posts requiring ack > pinned > by date
    return [...dateFiltered].sort((a, b) => {
      // Priority 1: Unacknowledged posts requiring acknowledgment
      const aRequiresAck = a.requires_acknowledgment && !a.user_has_acknowledged;
      const bRequiresAck = b.requires_acknowledgment && !b.user_has_acknowledged;
      if (aRequiresAck && !bRequiresAck) return -1;
      if (!aRequiresAck && bRequiresAck) return 1;
      
      // Within unacknowledged, sort by deadline (soonest first)
      if (aRequiresAck && bRequiresAck) {
        const aDeadline = a.acknowledgment_deadline ? new Date(a.acknowledgment_deadline).getTime() : Infinity;
        const bDeadline = b.acknowledgment_deadline ? new Date(b.acknowledgment_deadline).getTime() : Infinity;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      }
      
      // Priority 2: Pinned posts
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      // Priority 3: By date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [posts, dateFilter]);

  if (isLoading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading feed...</span>
      </Card>
    );
  }

  if (filteredPosts.length === 0) {
    const emptyMessages: Record<string, string> = {
      all: 'No posts yet. Be the first to share!',
      win: 'No wins shared yet!',
      kudos: 'No kudos given yet!',
      social: 'No social posts yet!',
      update: 'No updates shared yet!',
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
    <>
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <PostCard key={post.id} post={post} onEdit={(p) => setEditingPost(p)} />
        ))}
      </div>
      
      {/* Edit Post Modal */}
      <CreatePostModal
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        editPost={editingPost}
        canPostAnnouncement={true}
        canPostExecutive={true}
      />
    </>
  );
};