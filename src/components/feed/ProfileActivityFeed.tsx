/**
 * Profile Activity Feed Component
 * Shows posts created by, mentioning, or giving kudos to an employee
 */

import { useState } from 'react';
import { useEmployeeFeed } from '@/services/useSocialFeed';
import { PostCardCompact } from './PostCardCompact';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MessageSquare, Heart, AtSign, FileText } from 'lucide-react';

interface ProfileActivityFeedProps {
  employeeId: string;
}

type ActivityFilter = 'all' | 'posts' | 'kudos' | 'mentions';

export const ProfileActivityFeed = ({ employeeId }: ProfileActivityFeedProps) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const { data: posts = [], isLoading } = useEmployeeFeed(employeeId);

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'posts') return post.employee_id === employeeId;
    if (filter === 'kudos') {
      return post.post_type === 'kudos' && post.kudos_recipient_ids?.includes(employeeId);
    }
    if (filter === 'mentions') {
      return post.post_mentions?.some(m => m.employee_id === employeeId);
    }
    return true;
  });

  // Count for badges
  const counts = {
    all: posts.length,
    posts: posts.filter(p => p.employee_id === employeeId).length,
    kudos: posts.filter(p => p.post_type === 'kudos' && p.kudos_recipient_ids?.includes(employeeId)).length,
    mentions: posts.filter(p => p.post_mentions?.some(m => m.employee_id === employeeId)).length,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as ActivityFilter)}>
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="all" className="gap-1.5">
            <FileText className="h-4 w-4" />
            All
            <span className="text-xs text-muted-foreground">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Posts
            <span className="text-xs text-muted-foreground">({counts.posts})</span>
          </TabsTrigger>
          <TabsTrigger value="kudos" className="gap-1.5">
            <Heart className="h-4 w-4" />
            Kudos Received
            <span className="text-xs text-muted-foreground">({counts.kudos})</span>
          </TabsTrigger>
          <TabsTrigger value="mentions" className="gap-1.5">
            <AtSign className="h-4 w-4" />
            Mentioned In
            <span className="text-xs text-muted-foreground">({counts.mentions})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === 'all' && 'No activity yet'}
            {filter === 'posts' && 'No posts created yet'}
            {filter === 'kudos' && 'No kudos received yet'}
            {filter === 'mentions' && 'Not mentioned in any posts yet'}
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 -mx-1 px-1">
          {filteredPosts.map(post => (
            <PostCardCompact key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
