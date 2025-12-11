import { Update } from "@/types/employee";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Trophy, Megaphone } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { FeedReactions } from "./FeedReactions";
import { cn } from "@/lib/utils";

interface UpdateCardProps {
  update: Update & { imageUrl?: string };
}

const typeConfig = {
  win: {
    icon: Trophy,
    label: "Win",
    borderColor: "border-l-amber-500",
    iconBg: "bg-amber-100 text-amber-600",
  },
  achievement: {
    icon: Trophy,
    label: "Achievement",
    borderColor: "border-l-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  announcement: {
    icon: Megaphone,
    label: "Announcement",
    borderColor: "border-l-blue-500",
    iconBg: "bg-blue-100 text-blue-600",
  },
};

export const UpdateCard = ({ update }: UpdateCardProps) => {
  const config = typeConfig[update.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "bg-white dark:bg-card rounded-lg border border-border shadow-sm overflow-hidden",
      "border-l-4",
      config.borderColor
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarImage src={update.avatar} alt={update.employeeName} />
              <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                {update.employeeName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <p className="font-semibold text-sm text-foreground">{update.employeeName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(update.date)}
              </p>
            </div>
          </div>
          
          {/* Post type icon on right */}
          <div className={cn("p-2 rounded-full", config.iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        
        {/* Content */}
        <p className="text-sm text-foreground leading-relaxed mb-3">{update.content}</p>
        
        {/* Image if present */}
        {update.imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img 
              src={update.imageUrl} 
              alt="Post image" 
              className="w-full max-h-96 object-cover"
            />
          </div>
        )}
        
        {/* Reactions */}
        <div className="pt-3 border-t border-border/50">
          <FeedReactions targetType="update" targetId={update.id} />
        </div>
      </div>
    </div>
  );
};