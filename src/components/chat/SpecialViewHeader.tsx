import { MessageCircle, AtSign, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpecialViewHeaderProps {
  type: 'unread' | 'mentions' | 'starred';
}

const SpecialViewHeader = ({ type }: SpecialViewHeaderProps) => {
  const config = {
    unread: {
      icon: MessageCircle,
      title: 'Unread',
      subtitle: "Messages you haven't read yet",
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive'
    },
    mentions: {
      icon: AtSign,
      title: 'Mentions',
      subtitle: 'Messages where you were mentioned',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    starred: {
      icon: Bookmark,
      title: 'Starred',
      subtitle: 'Your bookmarked messages',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    }
  };

  const { icon: Icon, title, subtitle, iconBg, iconColor } = config[type];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
      <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", iconBg, iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};

export default SpecialViewHeader;
