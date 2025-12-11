import { Kudos } from "@/types/employee";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDateTime } from "@/lib/utils";
import { FeedReactions } from "./FeedReactions";
import { Heart } from "lucide-react";

interface KudosCardProps {
  kudos: Kudos;
}

export const KudosCard = ({ kudos }: KudosCardProps) => {
  const getFirstName = (fullName: string) => fullName.split(" ")[0];
  
  const allRecipients = [
    getFirstName(kudos.employeeName),
    ...(kudos.otherRecipients?.map(getFirstName) || [])
  ];
  const recipientText = allRecipients.join(", ");

  return (
    <div className="bg-white dark:bg-card rounded-lg border border-border shadow-sm overflow-hidden border-l-4 border-l-pink-500">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/50">
              {kudos.givenByAvatar && <AvatarImage src={kudos.givenByAvatar} />}
              <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                {kudos.givenBy.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-semibold text-sm text-foreground">{kudos.givenBy}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(kudos.date)}
              </p>
            </div>
          </div>
          
          {/* Kudos icon on right */}
          <div className="p-2 rounded-full bg-pink-100 text-pink-600">
            <Heart className="h-4 w-4" />
          </div>
        </div>
        
        {/* Content */}
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground mb-1">
            🙌 Kudos to {recipientText}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            "{kudos.comment}"
          </p>
        </div>
        
        {/* Reactions */}
        <div className="pt-3 border-t border-border/50">
          <FeedReactions targetType="kudos" targetId={kudos.id} />
        </div>
      </div>
    </div>
  );
};