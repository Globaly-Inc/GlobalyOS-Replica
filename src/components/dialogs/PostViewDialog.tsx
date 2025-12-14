import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { OrgLink } from "@/components/OrgLink";
import { formatDateTime } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import { FeedReactions } from "@/components/FeedReactions";

interface PostViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    employeeName: string;
    avatar?: string;
    date: string;
    content: string;
    imageUrl?: string;
    taggedMembers?: Array<{ id: string; name: string; avatar?: string }>;
  };
}

const PostViewDialog = ({ open, onOpenChange, post }: PostViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Post Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border/50">
                <AvatarImage src={post.avatar} />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {post.employeeName?.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{post.employeeName}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(post.date)}</p>
              </div>
            </div>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
          
          {/* Content */}
          <RichTextContent content={post.content} className="text-sm" />
          
          {/* Image */}
          {post.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={post.imageUrl} 
                alt="Post image" 
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          )}
          
          {/* Tagged Members */}
          {post.taggedMembers && post.taggedMembers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">with</span>
              {post.taggedMembers.map((member) => (
                <OrgLink 
                  key={member.id} 
                  to={`/team/${member.id}`} 
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar className="h-6 w-6 border border-background">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {member.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{member.name}</span>
                </OrgLink>
              ))}
            </div>
          )}
          
          {/* Reactions */}
          <div className="pt-3 border-t border-border/50">
            <FeedReactions targetType="update" targetId={post.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostViewDialog;
