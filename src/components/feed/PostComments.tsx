/**
 * Post Comments Component
 * Displays and manages comments with mentions and reactions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
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
import { MoreHorizontal, Trash2, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { OrgLink } from '@/components/OrgLink';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  employee_id: string;
  parent_comment_id: string | null;
  created_at: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface PostCommentsProps {
  postId: string;
}

export const PostComments = ({ postId }: PostCommentsProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const { isOwner, isAdmin, isHR } = useUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          employee_id,
          parent_comment_id,
          created_at,
          employee:employees!post_comments_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq('post_id', postId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!postId,
  });

  // Create comment mutation
  const createComment = useMutation({
    mutationFn: async (content: string) => {
      if (!currentEmployee?.id || !currentOrg?.id) {
        throw new Error('Must be logged in');
      }

      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      setNewComment('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('post_comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast({
        title: 'Comment deleted',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createComment.mutate(newComment.trim());
  };

  const canDeleteComment = (comment: Comment) => {
    return comment.employee_id === currentEmployee?.id || isOwner || isAdmin || isHR;
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
        <div className="flex-1 flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1"
            disabled={createComment.isPending}
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
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>

              {/* Delete menu */}
              {canDeleteComment(comment) && (
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
                      onClick={() => deleteComment.mutate(comment.id)}
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
