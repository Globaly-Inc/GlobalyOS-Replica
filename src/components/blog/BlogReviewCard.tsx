import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Eye, Edit, Sparkles, Clock } from "lucide-react";
import { BlogPost, useUpdateBlogPost } from "@/services/useBlog";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BlogReviewCardProps {
  post: BlogPost;
}

export const BlogReviewCard = ({ post }: BlogReviewCardProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const updatePost = useUpdateBlogPost();
  const navigate = useNavigate();

  const handleApprove = () => {
    updatePost.mutate({
      id: post.id,
      generation_status: 'approved',
      reviewed_at: new Date().toISOString(),
      is_published: true,
      published_at: new Date().toISOString(),
    });
  };

  const handleReject = () => {
    updatePost.mutate({
      id: post.id,
      generation_status: 'rejected',
      reviewed_at: new Date().toISOString(),
      generation_metadata: {
        ...post.generation_metadata,
        rejection_reason: rejectReason,
      },
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        setRejectReason("");
      }
    });
  };

  const handleEditAndApprove = () => {
    navigate(`/super-admin/blog/${post.id}/edit`);
  };

  const metadata = post.generation_metadata as Record<string, any> | null;

  return (
    <>
      <Card className="overflow-hidden border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </Badge>
                <Badge variant="outline">{post.category}</Badge>
              </div>
              <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {post.excerpt || post.meta_description}
              </CardDescription>
            </div>
            {post.cover_image_url && (
              <img 
                src={post.cover_image_url} 
                alt="" 
                className="w-24 h-24 object-cover rounded-lg shrink-0"
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author_avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {post.author_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{post.author_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </div>
            {post.reading_time_minutes && (
              <span>{post.reading_time_minutes} min read</span>
            )}
            {metadata?.keywords && (
              <div className="flex gap-1 flex-wrap">
                {(metadata.keywords as string[]).slice(0, 3).map(kw => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditAndApprove}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <div className="flex-1" />
          <Button 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowRejectDialog(true)}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button size="sm" onClick={handleApprove} disabled={updatePost.isPending}>
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{post.title}</DialogTitle>
            <DialogDescription>
              Preview of AI-generated content
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {post.cover_image_url && (
                <img 
                  src={post.cover_image_url} 
                  alt={post.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={handleEditAndApprove}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button onClick={handleApprove} disabled={updatePost.isPending}>
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this AI-generated post
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={updatePost.isPending}
            >
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
