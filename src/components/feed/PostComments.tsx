/**
 * Post Comments Component
 * Displays and manages comments with mentions and reactions
 */

import { useState } from 'react';
import { usePostComments, useCreateComment, useDeleteComment } from '@/services/useSocialFeed';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Send, Loader2, Smile } from 'lucide-react';
import { GifPicker } from './GifPicker';
import { formatSmartDateTime } from '@/lib/utils';
import { OrgLink } from '@/components/OrgLink';
import { CommentReactions } from './CommentReactions';
import { cn } from '@/lib/utils';
import MentionAutocomplete from '@/components/chat/MentionAutocomplete';
import { useMentionInput } from '@/hooks/useMentionInput';

interface PostCommentsProps {
  postId: string;
}

export const PostComments = ({ postId }: PostCommentsProps) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { isOwner, isAdmin, isHR } = useUserRole();
  const [newComment, setNewComment] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);

  // Use centralized hooks
  const { data: comments = [], isLoading } = usePostComments(postId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  // Mention input hook
  const {
    mentionState,
    handleInputChange,
    handleMentionSelect,
    closeMention,
    inputRef,
  } = useMentionInput(
    newComment,
    setNewComment,
    (memberId) => setMentionIds(prev => [...prev, memberId])
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createComment.mutate(
      { postId, content: newComment.trim(), mentionIds },
      { 
        onSuccess: () => {
          setNewComment('');
          setMentionIds([]);
        } 
      }
    );
  };

  const canDeleteComment = (employeeId: string) => {
    return employeeId === currentEmployee?.id || isOwner || isAdmin || isHR;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Comment form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={currentEmployee?.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {currentEmployee?.profiles?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-1 relative">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={handleInputChange}
              placeholder="Write a comment... Use @ to mention"
              className="flex-1"
              disabled={createComment.isPending}
            />
            <MentionAutocomplete
              isOpen={mentionState.isOpen}
              searchText={mentionState.searchText}
              onSelect={handleMentionSelect}
              onClose={closeMention}
            />
          </div>
          <GifPicker
            onSelect={(gifUrl) => {
              // Insert GIF URL into comment
              setNewComment(prev => prev + (prev ? ' ' : '') + gifUrl);
            }}
            triggerClassName="text-muted-foreground hover:text-foreground h-10 w-10"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <OrgLink to={`/team/${comment.employee_id}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.employee?.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {comment.employee?.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              </OrgLink>
              <div className="flex-1 min-w-0">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <OrgLink 
                      to={`/team/${comment.employee_id}`}
                      className="font-medium text-sm hover:text-primary"
                    >
                      {comment.employee?.profiles?.full_name || 'Unknown'}
                    </OrgLink>
                    <span className="text-xs text-muted-foreground">
                      {formatSmartDateTime(comment.created_at, 3)}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
                <CommentReactions commentId={comment.id} postId={postId} />
              </div>

              {/* Delete menu */}
              {canDeleteComment(comment.employee_id) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                        "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => deleteComment.mutate({ commentId: comment.id, postId })}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
