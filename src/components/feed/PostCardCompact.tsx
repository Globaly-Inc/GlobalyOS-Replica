/**
 * Compact Post Card for horizontal scroll layouts
 * Used in Profile Activity Feed section
 */

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileStack } from '@/components/ui/ProfileStack';
import {
  Trophy,
  Heart,
  MessageSquare,
  Megaphone,
  Crown,
  Users,
} from 'lucide-react';
import { Post, usePostReactions } from '@/services/useSocialFeed';
import { useCommentCount } from '@/services/usePostStats';
import { OrgLink } from '@/components/OrgLink';
import { cn, formatSmartDateTime } from '@/lib/utils';

interface PostCardCompactProps {
  post: Post;
  onClick?: (post: Post) => void;
}

// Group reactions by emoji and count them
const groupReactionsByEmoji = (reactions: { emoji: string }[]) => {
  const grouped: Record<string, number> = {};
  reactions.forEach(r => {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  });
  return Object.entries(grouped).sort((a, b) => b[1] - a[1]); // Sort by count desc
};

const POST_TYPE_CONFIG = {
  win: {
    icon: Trophy,
    label: 'Win',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  kudos: {
    icon: Heart,
    label: 'Kudos',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  announcement: {
    icon: Megaphone,
    label: 'Announcement',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  social: {
    icon: Users,
    label: 'Social',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  update: {
    icon: MessageSquare,
    label: 'Update',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  executive_message: {
    icon: Crown,
    label: 'Executive',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
};

// Simple text truncation for compact view (strips HTML)
const stripHtmlAndTruncate = (html: string, maxLength: number = 100): string => {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

export const PostCardCompact = ({ post, onClick }: PostCardCompactProps) => {
  const config = POST_TYPE_CONFIG[post.post_type];
  const { data: reactions = [] } = usePostReactions(post.id);
  const { data: commentCount = 0 } = useCommentCount(post.id);
  const groupedReactions = groupReactionsByEmoji(reactions);
  const Icon = config.icon;

  // Combine kudos recipients and mentions into tagged members (deduplicated)
  const taggedMembers = (() => {
    const membersMap = new Map<string, { id: string; name: string; avatar: string | null }>();
    
    // Add kudos recipients
    post.kudos_recipients?.forEach(r => {
      membersMap.set(r.id, {
        id: r.id,
        name: r.profiles?.full_name || 'Unknown',
        avatar: r.profiles?.avatar_url || null,
      });
    });
    
    // Add mentions
    post.post_mentions?.forEach(m => {
      if (!membersMap.has(m.employee_id)) {
        membersMap.set(m.employee_id, {
          id: m.employee_id,
          name: m.employee?.profiles?.full_name || 'Unknown',
          avatar: m.employee?.profiles?.avatar_url || null,
        });
      }
    });
    
    return Array.from(membersMap.values());
  })();
  
  const maxVisible = 5;
  const visibleMembers = taggedMembers.slice(0, maxVisible);
  const overflowCount = taggedMembers.length - maxVisible;

  return (
    <Card 
      className={cn(
        "shrink-0 w-[280px] h-[220px] p-3 bg-card border-border/50 flex flex-col",
        "hover:border-border hover:shadow-sm transition-all cursor-pointer"
      )}
      onClick={() => onClick?.(post)}
    >
      {/* Header: Avatar, Name, Badge */}
      <div className="flex items-start gap-2.5 mb-2">
        <OrgLink to={`/team/${post.employee_id}`} onClick={(e) => e.stopPropagation()}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={post.employee?.profiles?.avatar_url || undefined} />
            <AvatarFallback className={cn("text-xs", config.bgColor, config.color)}>
              {post.employee?.profiles?.full_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </OrgLink>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <OrgLink 
              to={`/team/${post.employee_id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-sm text-foreground hover:text-primary truncate"
            >
              {post.employee?.profiles?.full_name || 'Unknown'}
            </OrgLink>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] gap-0.5 px-1.5 py-0 h-5 shrink-0", 
                config.bgColor, 
                config.color
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
          </div>
          <span className="text-muted-foreground text-xs">
            {formatSmartDateTime(post.created_at, 3)}
          </span>
        </div>
      </div>

      {/* Content: 3 lines if tagged, 5 lines otherwise */}
      <p className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        taggedMembers.length > 0 ? "line-clamp-3" : "line-clamp-5"
      )}>
        {stripHtmlAndTruncate(post.content || '', taggedMembers.length > 0 ? 180 : 300)}
      </p>

      {/* Tagged members with ProfileStack popover */}
      {taggedMembers.length > 0 && (
        <div className="flex items-center mt-2" onClick={(e) => e.stopPropagation()}>
          <ProfileStack
            users={taggedMembers}
            size="sm"
            maxVisible={maxVisible}
            showPopover
            linkToProfile
            popoverHeader={<Users className="h-4 w-4 text-muted-foreground" />}
            popoverTitle={`${taggedMembers.length} tagged`}
          />
          {/* Show single name inline */}
          {taggedMembers.length === 1 && (
            <span className="ml-1.5 text-xs text-muted-foreground truncate max-w-[120px]">
              {taggedMembers[0].name}
            </span>
          )}
        </div>
      )}

      {/* Reactions and comments footer - stuck to bottom */}
      {(groupedReactions.length > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
          {/* Reactions on the left */}
          <div className="flex items-center gap-1.5">
            {groupedReactions.map(([emoji, count]) => (
              <span 
                key={emoji} 
                className="inline-flex items-center gap-0.5 text-xs bg-muted/50 rounded-full px-1.5 py-0.5"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </span>
            ))}
          </div>
          
          {/* Comments on the right */}
          {commentCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{commentCount}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
