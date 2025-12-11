import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import { FeedReactions } from "@/components/FeedReactions";

interface KudosViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kudos: {
    id: string;
    givenBy: string;
    givenByAvatar?: string;
    date: string;
    comment: string;
    recipientText: string;
  };
}

const KudosViewDialog = ({ open, onOpenChange, kudos }: KudosViewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Kudos Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border/50">
                {kudos.givenByAvatar && <AvatarImage src={kudos.givenByAvatar} />}
                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                  {kudos.givenBy.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{kudos.givenBy}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(kudos.date)}</p>
              </div>
            </div>
            <div className="p-2 rounded-full bg-pink-100 text-pink-600">
              <Heart className="h-5 w-5" />
            </div>
          </div>
          
          {/* Content */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              🙌 Kudos to {kudos.recipientText}
            </p>
            <RichTextContent content={kudos.comment} className="text-sm" />
          </div>
          
          {/* Reactions */}
          <div className="pt-3 border-t border-border/50">
            <FeedReactions targetType="kudos" targetId={kudos.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KudosViewDialog;
