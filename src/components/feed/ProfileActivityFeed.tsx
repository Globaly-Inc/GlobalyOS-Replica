/**
 * Profile Activity Feed Component
 * Shows posts created by, mentioning, or giving kudos to an employee
 */

import { useState } from 'react';
import { useEmployeeFeed } from '@/services/useSocialFeed';
import { PostCardCompact } from './PostCardCompact';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Trophy, 
  Heart, 
  Megaphone, 
  Users, 
  MessageSquare, 
  Crown,
  FileText 
} from 'lucide-react';

interface ProfileActivityFeedProps {
  employeeId: string;
}

type PostTypeFilter = 'all' | 'win' | 'kudos' | 'announcement' | 'social' | 'update' | 'executive_message';

const POST_TYPE_FILTERS = [
  { value: 'all', label: 'All', icon: FileText },
  { value: 'win', label: 'Wins', icon: Trophy },
  { value: 'kudos', label: 'Kudos', icon: Heart },
  { value: 'announcement', label: 'Announcements', icon: Megaphone },
  { value: 'social', label: 'Social', icon: Users },
  { value: 'update', label: 'Updates', icon: MessageSquare },
  { value: 'executive_message', label: 'Executive', icon: Crown },
] as const;

export const ProfileActivityFeed = ({ employeeId }: ProfileActivityFeedProps) => {
  const [filter, setFilter] = useState<PostTypeFilter>('all');
  const { data: posts = [], isLoading } = useEmployeeFeed(employeeId);

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return post.post_type === filter;
  });

  // Count posts by type
  const getCount = (type: PostTypeFilter) => {
    if (type === 'all') return posts.length;
    return posts.filter(p => p.post_type === type).length;
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
      <Tabs value={filter} onValueChange={(v) => setFilter(v as PostTypeFilter)}>
        <TabsList className="w-full justify-start bg-muted/50 overflow-x-auto scrollbar-hide">
          {POST_TYPE_FILTERS.map(({ value, label, icon: Icon }) => {
            const count = getCount(value);
            if (value !== 'all' && count === 0) return null; // Hide empty types
            return (
              <TabsTrigger key={value} value={value} className="gap-1.5 shrink-0">
                <Icon className="h-4 w-4" />
                {label}
                <span className="text-xs text-muted-foreground">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No activity yet' : `No ${filter.replace('_', ' ')} posts yet`}
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
