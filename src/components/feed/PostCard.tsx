/**
 * Unified Post Card Component
 * Displays all post types with media, polls, reactions, and comments
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Trophy,
  Heart,
  MessageSquare,
  Megaphone,
  Crown,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Share2,
  Bookmark,
  Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, useDeletePost, useTogglePinPost } from '@/services/useSocialFeed';
import { PostMedia } from './PostMedia';
import { PostPoll } from './PostPoll';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { OrgLink } from '@/components/OrgLink';
import { cn } from '@/lib/utils';
import { useCommentCount } from '@/services/usePostStats';
import { useReactionsRealtime, useCommentsRealtime } from '@/services/useSocialFeedRealtime';

interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
}

const POST_TYPE_CONFIG = {
  win: {
    icon: Trophy,
    label: 'Win',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-l-amber-500',
  },
  kudos: {
    icon: Heart,
    label: 'Kudos',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-l-pink-500',
  },
  announcement: {
    icon: Megaphone,
    label: 'Announcement',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
  },
  social: {
    icon: MessageSquare,
    label: 'Social',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-l-green-500',
  },
  executive_message: {
    icon: Crown,
    label: 'Executive Message',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-l-purple-500',
  },
};

export const PostCard = ({ post, onEdit }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const { isOwner, isAdmin, isHR } = useUserRole();
  const { data: currentEmployee } = useCurrentEmployee();
  const deletePost = useDeletePost();
  const togglePin = useTogglePinPost();
  const { data: commentCount = 0 } = useCommentCount(post.id);
  
  // Subscribe to real-time updates
  useReactionsRealtime(post.id);
  useCommentsRealtime(post.id);

  const config = POST_TYPE_CONFIG[post.post_type];
  const Icon = config.icon;
  const isOwnPost = currentEmployee?.id === post.employee_id;
  const canEdit = isOwnPost || isOwner || isAdmin || isHR;
  const canDelete = isOwnPost || isOwner || isAdmin || isHR;
  const canPin = isOwner || isAdmin;

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePost.mutate(post.id);
    }
  };

  const handleTogglePin = () => {
    togglePin.mutate({ postId: post.id, isPinned: !post.is_pinned });
  };

  const renderKudosRecipients = () => {
    if (post.post_type !== 'kudos' || !post.kudos_recipients?.length) return null;

    return (
      <div className="flex items-center gap-2 mt-2 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
        <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
        <span className="text-sm text-muted-foreground">Kudos to</span>
        <div className="flex items-center gap-1 flex-wrap">
          {post.kudos_recipients.map((recipient, idx) => (
            <span key={recipient.id}>
              <OrgLink 
                to={`/team/${recipient.id}`}
                className="font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400"
              >
                {recipient.profiles.full_name}
              </OrgLink>
              {idx < post.kudos_recipients!.length - 1 && ', '}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "overflow-hidden border-l-4 transition-shadow hover:shadow-md",
      config.borderColor
    )}>
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <OrgLink to={`/team/${post.employee_id}`}>
              <Avatar className="h-10 w-10 ring-2 ring-background">
                <AvatarImage src={post.employee?.profiles?.avatar_url || undefined} />
                <AvatarFallback className={cn(config.bgColor, config.color)}>
                  {post.employee?.profiles?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </OrgLink>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <OrgLink 
                  to={`/team/${post.employee_id}`}
                  className="font-semibold text-foreground hover:text-primary truncate"
                >
                  {post.employee?.profiles?.full_name || 'Unknown'}
                </OrgLink>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className={cn("text-xs gap-1", config.bgColor, config.color)}>
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
                {post.is_pinned && (
                  <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bookmark className="h-4 w-4 mr-2" />
                Save post
              </DropdownMenuItem>
              {canPin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleTogglePin}>
                    {post.is_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin post
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin post
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {canEdit && onEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-foreground whitespace-pre-wrap break-words">
          {post.content}
        </p>

        {/* Kudos Recipients */}
        {renderKudosRecipients()}

        {/* Mentions */}
        {post.post_mentions && post.post_mentions.length > 0 && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <span>with</span>
            {post.post_mentions.map((mention, idx) => (
              <span key={mention.id}>
                <OrgLink 
                  to={`/team/${mention.employee_id}`}
                  className="text-primary hover:underline"
                >
                  @{mention.employee.profiles.full_name}
                </OrgLink>
                {idx < post.post_mentions!.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      {post.post_media && post.post_media.length > 0 && (
        <PostMedia media={post.post_media} />
      )}

      {/* Poll */}
      {post.post_polls && post.post_polls.length > 0 && (
        <div className="px-4 pb-3">
          <PostPoll poll={post.post_polls[0]} />
        </div>
      )}

      {/* Reactions & Actions */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <PostReactions postId={post.id} />
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 ? (
                <span className="text-xs">{commentCount}</span>
              ) : (
                <span className="hidden sm:inline text-xs">Comment</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          <PostComments postId={post.id} />
        </div>
      )}
    </Card>
  );
};
