import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Reply, Trash2, Edit2, X, Check, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  page_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

interface WikiCommentsProps {
  pageId: string;
  currentEmployeeId: string | undefined;
}

export const WikiComments = ({ pageId, currentEmployeeId }: WikiCommentsProps) => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { formatRelativeTime } = useRelativeTime();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["wiki-comments", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wiki_page_comments")
        .select(`
          id, page_id, parent_comment_id, content, created_at, updated_at,
          created_by:employees!wiki_page_comments_created_by_fkey(id, profiles(full_name, avatar_url))
        `)
        .eq("page_id", pageId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as Comment[];
    },
    enabled: !!pageId,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId: string | null }) => {
      if (!currentOrg?.id || !currentEmployeeId) throw new Error("Not authenticated");
      const { error } = await supabase.from("wiki_page_comments").insert({
        page_id: pageId,
        organization_id: currentOrg.id,
        parent_comment_id: parentId,
        content,
        created_by: currentEmployeeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-comments", pageId] });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from("wiki_page_comments")
        .update({ content })
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-comments", pageId] });
      setEditingId(null);
      setEditContent("");
    },
    onError: () => toast.error("Failed to update comment"),
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("wiki_page_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wiki-comments", pageId] });
      toast.success("Comment deleted");
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  // Organize comments into threads
  const rootComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (commentId: string) =>
    comments.filter((c) => c.parent_comment_id === commentId);

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate({ content: newComment.trim(), parentId: null });
    }
  };

  const handleSubmitReply = (parentId: string) => {
    if (replyContent.trim()) {
      createCommentMutation.mutate({ content: replyContent.trim(), parentId });
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = (commentId: string) => {
    if (editContent.trim()) {
      updateCommentMutation.mutate({ commentId, content: editContent.trim() });
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const replies = getReplies(comment.id);
    const isOwn = comment.created_by.id === currentEmployeeId;
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;

    return (
      <div className={cn("space-y-2", depth > 0 && "ml-8 border-l-2 border-muted pl-4")}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.created_by.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {comment.created_by.profiles.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {comment.created_by.profiles.full_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(comment.id)}
                    disabled={updateCommentMutation.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => {
                      setReplyingTo(isReplying ? null : comment.id);
                      setReplyContent("");
                    }}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  {isOwn && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={() => handleStartEdit(comment)}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Reply input */}
        {isReplying && (
          <div className="ml-11 flex gap-2 items-start">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px] text-sm flex-1"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={!replyContent.trim() || createCommentMutation.isPending}
              >
                <Send className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="space-y-3 mt-3">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t pt-6 mt-8">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-primary transition-colors"
      >
        <MessageSquare className="h-5 w-5" />
        Comments ({comments.length})
      </button>

      {!isCollapsed && (
        <div className="space-y-6">
          {/* New comment input */}
          <div className="flex gap-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[80px]"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments list */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading comments...
            </div>
          ) : rootComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rootComments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
