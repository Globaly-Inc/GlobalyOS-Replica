/**
 * Unified Post Card Component
 * Displays all post types with media, polls, reactions, and comments
 */

import { useState } from 'react';
import { TruncatedRichText } from '@/components/ui/TruncatedRichText';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Bookmark,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { isPast, differenceInHours, format } from 'date-fns';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Post, useDeletePost, useTogglePinPost, useAcknowledgePost, useTargetEmployeesCount } from '@/services/useSocialFeed';
import { PostMedia } from './PostMedia';
import { PostPoll } from './PostPoll';
import { PostReactions } from './PostReactions';
import { PostComments } from './PostComments';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { OrgLink } from '@/components/OrgLink';
import { cn, formatSmartDateTime } from '@/lib/utils';
import { useCommentCount } from '@/services/usePostStats';
import { useReactionsRealtime, useCommentsRealtime } from '@/services/useSocialFeedRealtime';
import { DeletePostDialog } from '@/components/dialogs/DeletePostDialog';
import { AcknowledgmentStatusModal } from './AcknowledgmentStatusModal';
import { VisibilityBadge } from './VisibilityBadge';

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
    icon: Users,
    label: 'Social',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-l-green-500',
  },
  update: {
    icon: MessageSquare,
    label: 'Update',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-l-cyan-500',
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const { isOwner, isAdmin, isHR } = useUserRole();
  const { data: currentEmployee } = useCurrentEmployee();
  const deletePost = useDeletePost();
  const togglePin = useTogglePinPost();
  const acknowledgePost = useAcknowledgePost();
  const { data: commentCount = 0 } = useCommentCount(post.id);
  const { data: targetCount = 0 } = useTargetEmployeesCount(post.id);
  
  // Subscribe to real-time updates
  useReactionsRealtime(post.id);
  useCommentsRealtime(post.id);

  const config = POST_TYPE_CONFIG[post.post_type];
  const Icon = config.icon;
  const isOwnPost = currentEmployee?.id === post.employee_id;
  const canEdit = isOwnPost || isOwner || isAdmin || isHR;
  const canDelete = isOwnPost || isOwner || isAdmin || isHR;
  const canPin = isOwner || isAdmin;
  const canViewAckStatus = isOwnPost || isOwner || isAdmin || isHR;
  
  // Online status for the post author
  const { isOnline } = useOnlineStatus(post.employee_id);

  // Acknowledgment status
  const requiresAck = post.requires_acknowledgment;
  const hasAcknowledged = post.user_has_acknowledged;
  const deadline = post.acknowledgment_deadline ? new Date(post.acknowledgment_deadline) : null;
  const isOverdue = deadline ? isPast(deadline) : false;
  const hoursUntilDeadline = deadline ? differenceInHours(deadline, new Date()) : null;
  const isApproaching = hoursUntilDeadline !== null && hoursUntilDeadline > 0 && hoursUntilDeadline <= 48;
  const ackCount = post.acknowledgment_count || 0;
  const ackProgress = targetCount > 0 ? Math.round((ackCount / targetCount) * 100) : 0;

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  };

  const handleTogglePin = () => {
    togglePin.mutate({ postId: post.id, isPinned: !post.is_pinned });
  };

  const handleAcknowledge = () => {
    acknowledgePost.mutate(post.id, {
      onSuccess: () => setAcknowledgeDialogOpen(false),
    });
  };

  const getAckBannerStyle = () => {
    if (hasAcknowledged) return 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400';
    if (isOverdue) return 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400';
    if (isApproaching) return 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400';
    return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400';
  };

  const getAckIcon = () => {
    if (hasAcknowledged) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (isOverdue) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (isApproaching) return <Clock className="h-4 w-4 text-amber-500" />;
    return <Eye className="h-4 w-4 text-blue-500" />;
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
                {recipient.profiles?.full_name || 'Unknown'}
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
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarImage src={post.employee?.profiles?.avatar_url || undefined} />
                  <AvatarFallback className={cn(config.bgColor, config.color)}>
                    {post.employee?.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
            </OrgLink>
            <div className="flex-1 min-w-0">
              {/* Row 1: Name + Post Type Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <OrgLink 
                  to={`/team/${post.employee_id}`}
                  className="font-semibold text-foreground hover:text-primary truncate"
                >
                  {post.employee?.profiles?.full_name || 'Unknown'}
                </OrgLink>
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
              {/* Row 2: Time + Visibility */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-muted-foreground text-sm">
                  {formatSmartDateTime(post.created_at, 3)}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <VisibilityBadge
                  accessScope={post.access_scope}
                  offices={post.post_offices}
                  departments={post.post_departments}
                  projects={post.post_projects}
                  className="h-5 py-0 px-1.5 text-[11px] border-0 bg-transparent"
                />
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
                    onClick={() => setDeleteDialogOpen(true)}
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

      {/* Acknowledgment Banner - Different view for author vs non-author */}
      {requiresAck && (
        <>
          {/* For non-authors: Show acknowledgment request banner */}
          {!isOwnPost && (
            <div className={cn("mx-4 mt-3 p-3 rounded-lg border", getAckBannerStyle())}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {getAckIcon()}
                  <div className="text-sm">
                    {hasAcknowledged ? (
                      <span className="font-medium">You acknowledged this post</span>
                    ) : isOverdue ? (
                      <span className="font-medium">Overdue: Acknowledgment required</span>
                    ) : isApproaching ? (
                      <span className="font-medium">Due soon: Acknowledgment required</span>
                    ) : (
                      <span className="font-medium">Acknowledgment required</span>
                    )}
                    {deadline && !hasAcknowledged && (
                      <span className="text-muted-foreground ml-1">
                        · {isOverdue ? 'Was due ' : 'Due '}
                        {format(deadline, 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                {!hasAcknowledged && (
                  <Button
                    size="sm"
                    variant={isOverdue ? "destructive" : isApproaching ? "default" : "outline"}
                    onClick={() => setAcknowledgeDialogOpen(true)}
                    disabled={acknowledgePost.isPending}
                    className="shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {/* For authors (post owner): Show stats section only */}
          {isOwnPost && canViewAckStatus && targetCount > 0 && (
            <div className="mx-4 mt-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Acknowledgment Progress</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span>{ackCount} of {targetCount} acknowledged</span>
                <span>{ackProgress}%</span>
              </div>
              <Progress value={ackProgress} className="h-1.5" />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs px-2"
                onClick={() => setStatusModalOpen(true)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View Status
              </Button>
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className="px-4 py-3">
        <TruncatedRichText 
          content={post.content || ''} 
          maxLines={6}
          className="text-foreground"
        />

        {/* Kudos Recipients */}
        {renderKudosRecipients()}

        {/* Mentions */}
        {post.post_mentions && post.post_mentions.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            <span>with </span>
            {post.post_mentions.map((mention, idx) => (
              <span key={mention.id}>
                <OrgLink 
                  to={`/team/${mention.employee_id}`}
                  className="text-primary hover:underline"
                >
                  @{mention.employee?.profiles?.full_name || 'Unknown'}
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

      {/* Delete Confirmation Dialog */}
      <DeletePostDialog
        postType={post.post_type}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isLoading={deletePost.isPending}
      />

      {/* Acknowledge Confirmation Dialog */}
      <AlertDialog open={acknowledgeDialogOpen} onOpenChange={setAcknowledgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge Post</AlertDialogTitle>
            <AlertDialogDescription>
              By acknowledging this post, you confirm that you have read and understood its content.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcknowledge} disabled={acknowledgePost.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              I Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Acknowledgment Status Modal */}
      <AcknowledgmentStatusModal
        postId={post.id}
        authorId={post.employee_id}
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
      />
    </Card>
  );
};
