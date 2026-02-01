/**
 * Compact Post Card for horizontal scroll layouts
 * Used in Profile Activity Feed section
 */

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Heart,
  MessageSquare,
  Megaphone,
  Crown,
  Users,
} from 'lucide-react';
import { Post } from '@/services/useSocialFeed';
import { OrgLink } from '@/components/OrgLink';
import { cn, formatSmartDateTime } from '@/lib/utils';

interface PostCardCompactProps {
  post: Post;
  onClick?: (post: Post) => void;
}

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
  const Icon = config.icon;

  return (
    <Card 
      className={cn(
        "shrink-0 w-[280px] p-3 bg-card border-border/50",
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

      {/* Content: 5-line truncated text */}
      <p className="text-sm text-muted-foreground line-clamp-5 leading-relaxed">
        {stripHtmlAndTruncate(post.content || '', 300)}
      </p>
    </Card>
  );
};
